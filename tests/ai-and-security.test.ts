import { describe, expect, it } from "vitest";
import { assertSafeUrl, extractReadableText, extractDocumentText } from "@/lib/ai/source";
import { providerStatus } from "@/lib/ai/provider";
import { slugForPrompt, validateGenerationInput } from "@/lib/ai/generate";

describe("SSRF protections", () => {
  it("rejects non-http(s) schemes", () => {
    expect(() => assertSafeUrl("ftp://example.com")).toThrow();
    expect(() => assertSafeUrl("file:///etc/passwd")).toThrow();
    expect(() => assertSafeUrl("javascript:alert(1)")).toThrow();
  });

  it("rejects loopback, private and link-local addresses", () => {
    for (const u of [
      "http://localhost/x",
      "http://127.0.0.1/x",
      "http://10.0.0.5/x",
      "http://192.168.1.1/x",
      "http://172.16.4.4/x",
      "http://169.254.169.254/latest/meta-data",
      "http://[::1]/x",
      "http://[fd00::1]/x",
      "http://[fe80::1]/x",
      "http://2130706433/x",
      "http://0x7f000001/x",
      "http://something.internal/x",
    ]) {
      expect(() => assertSafeUrl(u), u).toThrow();
    }
  });

  it("allows ordinary public https URLs", () => {
    const u = assertSafeUrl("https://example.com/article");
    expect(u.hostname).toBe("example.com");
  });
});

describe("readable text extraction", () => {
  it("strips scripts, styles and tags from HTML", () => {
    const html = `<html><head><style>.a{color:red}</style><script>alert(1)</script></head>
      <body><h1>Title</h1><p>Hello &amp; welcome</p></body></html>`;
    const text = extractReadableText(html);
    expect(text).toContain("Title");
    expect(text).toContain("Hello & welcome");
    expect(text).not.toContain("alert(1)");
    expect(text).not.toContain("color:red");
  });

  it("extracts text from plain text/markdown unchanged", () => {
    const text = extractDocumentText(Buffer.from("# Heading\n\nBody"), "text/markdown", "a.md");
    expect(text).toContain("# Heading");
  });
});

describe("generation input validation", () => {
  it("throws when neither a prompt nor a source is given", () => {
    expect(() => validateGenerationInput({ prompt: "" } as never)).toThrow();
  });

  it("accepts a reasonable prompt without throwing", () => {
    expect(() =>
      validateGenerationInput({
        prompt: "Tell the story of our mountain rescue team",
        storyType: "ONE_PAGE",
        tone: "editorial",
        visualStyle: "cinematic",
        audience: "general",
      } as never),
    ).not.toThrow();
  });

  it("throws when the prompt is absurdly long", () => {
    expect(() => validateGenerationInput({ prompt: "x".repeat(9000) } as never)).toThrow();
  });

  it("slugForPrompt produces a url-safe slug", () => {
    const slug = slugForPrompt("Hello, World! 2024 — R&D");
    expect(slug).toMatch(/^[a-z0-9-]+$/);
    expect(slug).not.toMatch(/--/);
  });
});

describe("provider status is honest about configuration", () => {
  it("reports unconfigured (demo) when no credentials are present", () => {
    const prev = { p: process.env.AI_PROVIDER, o: process.env.OPENAI_API_KEY, a: process.env.ANTHROPIC_API_KEY };
    delete process.env.AI_PROVIDER;
    delete process.env.OPENAI_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    const status = providerStatus();
    expect(status.configured).toBe(false);
    expect(status.provider).toBeNull();
    expect(status.notice).toMatch(/demo/i);
    process.env.AI_PROVIDER = prev.p;
    process.env.OPENAI_API_KEY = prev.o;
    process.env.ANTHROPIC_API_KEY = prev.a;
  });
});
