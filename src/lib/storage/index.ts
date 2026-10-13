import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/db";
import { HttpError } from "@/lib/auth/authorize";

/**
 * Storage service interface.
 *
 * Provider-specific code lives behind `StorageDriver` so the local-disk
 * implementation can be swapped for S3-compatible object storage without
 * touching route handlers.
 */

export type StoredObject = {
  key: string;
  url: string;
  size: number;
};

export interface StorageDriver {
  readonly name: string;
  put(key: string, body: Buffer, contentType: string): Promise<string /* url */>;
  delete(key: string): Promise<void>;
  urlFor(key: string): string;
}

export const ALLOWED_MIME: Record<string, string> = {
  "image/jpeg": "image",
  "image/png": "image",
  "image/webp": "image",
  "image/gif": "image",
  "image/avif": "image",
  "image/svg+xml": "image",
  "video/mp4": "video",
  "video/webm": "video",
  "application/pdf": "document",
  "text/plain": "document",
  "text/markdown": "document",
  "application/json": "document",
  "application/msword": "document",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "document",
};

export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024; // 15MB

// ---------------------------------------------------------------------------
// Local disk driver
// ---------------------------------------------------------------------------

class LocalDiskDriver implements StorageDriver {
  readonly name = "local";
  private readonly root = "/workspace/project/20261013_website_1/public/uploads";

  async put(key: string, body: Buffer): Promise<string> {
    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    const full = path.join(this.root, key);
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, body);
    return this.urlFor(key);
  }

  async delete(key: string): Promise<void> {
    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    try {
      await fs.unlink(path.join(this.root, key));
    } catch {
      /* already gone */
    }
  }

  urlFor(key: string): string {
    return `/uploads/${key}`;
  }
}

// ---------------------------------------------------------------------------
// S3-compatible driver (activated when STORAGE_DRIVER=s3 and creds are present)
// ---------------------------------------------------------------------------

class S3Driver implements StorageDriver {
  readonly name = "s3";
  constructor(
    private config: {
      endpoint: string;
      region: string;
      bucket: string;
      accessKeyId: string;
      secretAccessKey: string;
    },
  ) {}

  private async sdk() {
    // Loaded through a variable specifier so the SDK stays an optional peer
    // dependency: the app type-checks and runs without it, and only the S3
    // driver requires the package to be installed.
    const specifier = "@aws-sdk/client-s3";
    return (await import(/* webpackIgnore: true */ specifier)) as {
      S3Client: new (cfg: unknown) => { send: (cmd: unknown) => Promise<unknown> };
      PutObjectCommand: new (input: unknown) => unknown;
      DeleteObjectCommand: new (input: unknown) => unknown;
    };
  }

  private async client() {
    const { S3Client } = await this.sdk();
    return new S3Client({
      region: this.config.region,
      endpoint: this.config.endpoint || undefined,
      forcePathStyle: Boolean(this.config.endpoint),
      credentials: {
        accessKeyId: this.config.accessKeyId,
        secretAccessKey: this.config.secretAccessKey,
      },
    });
  }

  async put(key: string, body: Buffer, contentType: string): Promise<string> {
    const { PutObjectCommand } = await this.sdk();
    const client = await this.client();
    await client.send(
      new PutObjectCommand({
        Bucket: this.config.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
        CacheControl: "public, max-age=31536000, immutable",
      }),
    );
    return this.urlFor(key);
  }

  async delete(key: string): Promise<void> {
    const { DeleteObjectCommand } = await this.sdk();
    const client = await this.client();
    await client.send(new DeleteObjectCommand({ Bucket: this.config.bucket, Key: key }));
  }

  urlFor(key: string): string {
    if (this.config.endpoint) {
      return `${this.config.endpoint.replace(/\/$/, "")}/${this.config.bucket}/${key}`;
    }
    return `https://${this.config.bucket}.s3.${this.config.region}.amazonaws.com/${key}`;
  }
}

export function getStorage(): StorageDriver {
  const driver = process.env.STORAGE_DRIVER || "local";
  if (
    driver === "s3" &&
    process.env.S3_BUCKET &&
    process.env.S3_ACCESS_KEY_ID &&
    process.env.S3_SECRET_ACCESS_KEY
  ) {
    return new S3Driver({
      endpoint: process.env.S3_ENDPOINT || "",
      region: process.env.S3_REGION || "us-east-1",
      bucket: process.env.S3_BUCKET,
      accessKeyId: process.env.S3_ACCESS_KEY_ID,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
    });
  }
  return new LocalDiskDriver();
}

export function storageConfiguredForProduction(): boolean {
  return getStorage().name === "s3";
}

/** Validates an upload request before it hits storage. */
export function validateUpload(filename: string, mimeType: string, size: number) {
  if (!ALLOWED_MIME[mimeType]) {
    throw new HttpError(
      415,
      `Files of type "${mimeType || "unknown"}" are not supported. Allowed: images, MP4/WebM video, PDF and common documents.`,
      "unsupported_type",
    );
  }
  if (size > MAX_UPLOAD_BYTES) {
    throw new HttpError(
      413,
      `That file is ${(size / 1024 / 1024).toFixed(1)}MB. The limit is ${MAX_UPLOAD_BYTES / 1024 / 1024}MB.`,
      "too_large",
    );
  }
  if (!filename || filename.length > 200) {
    throw new HttpError(400, "Filename is missing or too long.", "bad_filename");
  }
}

function safeExtension(filename: string, mimeType: string): string {
  const fromName = filename.includes(".") ? filename.split(".").pop()! : "";
  const cleaned = fromName.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 8);
  if (cleaned) return cleaned;
  return (mimeType.split("/")[1] || "bin").replace(/[^a-z0-9]/g, "").slice(0, 8);
}

/** Reads image dimensions from the binary header (best-effort, no deps). */
export function readImageSize(buf: Buffer, mimeType: string): { width?: number; height?: number } {
  try {
    if (mimeType === "image/png" && buf.length > 24) {
      return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
    }
    if (mimeType === "image/jpeg") {
      let offset = 2;
      while (offset < buf.length) {
        if (buf[offset] !== 0xff) break;
        const marker = buf[offset + 1];
        const len = buf.readUInt16BE(offset + 2);
        if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
          return { height: buf.readUInt16BE(offset + 5), width: buf.readUInt16BE(offset + 7) };
        }
        offset += 2 + len;
      }
    }
  } catch {
    /* ignore */
  }
  return {};
}

/** Persist an asset record and bytes. Called by the upload route. */
export async function storeUpload(params: {
  workspaceId: string;
  uploadedBy: string;
  filename: string;
  mimeType: string;
  bytes: Buffer;
}) {
  validateUpload(params.filename, params.mimeType, params.bytes.length);
  const storage = getStorage();
  const ext = safeExtension(params.filename, params.mimeType);
  const key = `${params.workspaceId}/${randomUUID()}.${ext}`;
  const url = await storage.put(key, params.bytes, params.mimeType);
  const dims = readImageSize(params.bytes, params.mimeType);

  return prisma.asset.create({
    data: {
      workspaceId: params.workspaceId,
      uploadedBy: params.uploadedBy,
      filename: params.filename,
      mimeType: params.mimeType,
      size: params.bytes.length,
      storageKey: key,
      url,
      kind: ALLOWED_MIME[params.mimeType] ?? "document",
      width: dims.width ?? null,
      height: dims.height ?? null,
    },
  });
}
