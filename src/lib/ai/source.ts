import { HttpError } from "@/lib/errors";

/**
 * SSRF-safe URL fetcher.
 *
 * Only http/https are allowed, private / loopback / link-local ranges are
 * rejected, redirects are followed manually with a hard cap, and the response
 * size is bounded. Used when a user supplies a public URL as source content.
 */

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "metadata.google.internal",
  "metadata",
  "169.254.169.254",
]);

function isPrivateIpv4(host: string): boolean {
  // Accept dotted-quad plus the integer / hex forms resolvers also honour
  // (e.g. 2130706433 and 0x7f000001 both mean 127.0.0.1).
  let octets: number[] | null = null;
  const dotted = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
  if (dotted) {
    octets = [Number(dotted[1]), Number(dotted[2]), Number(dotted[3]), Number(dotted[4])];
    if (octets.some((n) => n > 255)) return true; // malformed -> treat as unsafe
  } else if (/^0x[0-9a-f]+$/i.test(host)) {
    const n = parseInt(host, 16);
    if (Number.isNaN(n) || n > 0xffffffff) return true;
    octets = [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
  } else if (/^\d+$/.test(host)) {
    const n = Number(host);
    if (Number.isNaN(n) || n > 0xffffffff) return true;
    octets = [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
  }
  if (!octets) return false;

  const [a, b] = octets;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT 100.64.0.0/10
  if (a >= 224) return true; // multicast / reserved
  return false;
}

/** True for loopback, link-local, unique-local and IPv4-mapped IPv6 literals. */
function isPrivateIpv6(host: string): boolean {
  const h = host.replace(/^\[|\]$/g, "").toLowerCase();
  if (!h.includes(":")) return false;
  if (h === "::1" || h === "::") return true;
  const group = h.split(":")[0];
  const lead = parseInt(group || "0", 16);
  if (Number.isNaN(lead)) return false;
  if ((lead & 0xffc0) === 0xfe80) return true; // link-local fe80::/10
  if ((lead & 0xfe00) === 0xfc00) return true; // unique-local fc00::/7
  if ((lead & 0xff00) === 0xff00) return true; // multicast ff00::/8
  const mapped = /^::ffff:([0-9.]+)$/.exec(h);
  if (mapped && isPrivateIpv4(mapped[1])) return true;
  return false;
}

export function assertSafeUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new HttpError(400, "That URL could not be parsed.", "bad_url");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new HttpError(400, "Only http and https URLs are supported.", "bad_url");
  }
  const bare = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (
    BLOCKED_HOSTNAMES.has(bare) ||
    bare.endsWith(".internal") ||
    bare.endsWith(".local") ||
    bare.endsWith(".localhost")
  ) {
    throw new HttpError(400, "That host is not permitted.", "blocked_host");
  }
  if (isPrivateIpv4(bare) || isPrivateIpv6(url.hostname.toLowerCase())) {
    throw new HttpError(400, "Private and loopback addresses are not permitted.", "blocked_host");
  }
  return url;
}

const MAX_BYTES = 2 * 1024 * 1024; // 2MB of text is plenty for a source document
const MAX_REDIRECTS = 3;

export async function fetchSourceText(rawUrl: string): Promise<{ text: string; contentType: string }> {
  let url = assertSafeUrl(rawUrl);

  for (let i = 0; i <= MAX_REDIRECTS; i++) {
    const res = await fetch(url, {
      redirect: "manual",
      headers: { "User-Agent": "ScrollytellingBot/1.0 (+source-import)" },
      signal: AbortSignal.timeout(12_000),
    });

    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      if (!location) throw new HttpError(502, "The source redirected without a destination.", "bad_redirect");
      url = assertSafeUrl(new URL(location, url).toString());
      continue;
    }
    if (!res.ok) {
      throw new HttpError(502, `The source responded with ${res.status}.`, "fetch_failed");
    }

    const contentType = res.headers.get("content-type") || "";
    if (!/text\/|json|xml|html/i.test(contentType)) {
      throw new HttpError(415, "That URL did not return readable text.", "unsupported_source");
    }

    const reader = res.body?.getReader();
    if (!reader) throw new HttpError(502, "The source returned no body.", "fetch_failed");
    const chunks: Uint8Array[] = [];
    let total = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_BYTES) {
        await reader.cancel();
        break;
      }
      chunks.push(value);
    }
    const decoder = new TextDecoder("utf-8", { fatal: false });
    const body = decoder.decode(Buffer.concat(chunks.map((c) => Buffer.from(c))));
    return { text: extractReadableText(body, contentType), contentType };
  }
  throw new HttpError(502, "Too many redirects.", "bad_redirect");
}

/** Crude readability extraction: strip scripts/styles/tags, collapse space. */
export function extractReadableText(html: string, contentType = "text/html"): string {
  if (!/html/i.test(contentType)) return html.slice(0, 20000);
  let text = html;
  text = text.replace(/<script[\s\S]*?<\/script>/gi, " ");
  text = text.replace(/<style[\s\S]*?<\/style>/gi, " ");
  text = text.replace(/<noscript[\s\S]*?<\/noscript>/gi, " ");
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? `# ${titleMatch[1].trim()}\n\n` : "";
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  text = bodyMatch ? bodyMatch[1] : text;
  text = text.replace(/<[^>]+>/g, " ");
  text = text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"');
  text = text.replace(/\s+/g, " ").trim();
  return (title + text).slice(0, 20000);
}

/** Extract plain text from an uploaded document buffer (txt/md/json/pdf-ish). */
export function extractDocumentText(buf: Buffer, mimeType: string, filename: string): string {
  if (/json/i.test(mimeType)) {
    try {
      return JSON.stringify(JSON.parse(buf.toString("utf8")), null, 2).slice(0, 20000);
    } catch {
      /* fall through */
    }
  }
  if (/text\/|markdown/i.test(mimeType) || /\.(md|txt)$/i.test(filename)) {
    return buf.toString("utf8").slice(0, 20000);
  }
  if (/pdf/i.test(mimeType)) {
    // Best-effort: pull ASCII text runs out of the PDF stream.
    const raw = buf.toString("latin1");
    const texts = raw.match(/\(((?:\\.|[^()\\])*)\)\s*Tj/g) || [];
    const joined = texts
      .map((t) => t.replace(/^\(/, "").replace(/\)\s*Tj$/, ""))
      .join(" ")
      .replace(/\\r|\\n/g, " ");
    return joined.slice(0, 20000) || "PDF text could not be extracted automatically. Please paste the key content.";
  }
  return "";
}
