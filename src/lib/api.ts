import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { HttpError } from "@/lib/auth/authorize";
import { prisma } from "@/lib/db";

/** Uniform JSON error envelope. Never leaks stack traces or secrets. */
export function errorResponse(error: unknown): NextResponse {
  if (error instanceof HttpError) {
    return NextResponse.json(
      { error: error.message, code: error.code ?? "error" },
      { status: error.status },
    );
  }
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: "Some fields were invalid.",
        code: "validation_error",
        issues: error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
      },
      { status: 422 },
    );
  }
  if (error instanceof SyntaxError) {
    return NextResponse.json(
      { error: "The request body was not valid JSON.", code: "bad_json" },
      { status: 400 },
    );
  }
  console.error("[api] unhandled error:", error);
  return NextResponse.json(
    { error: "Something went wrong on our side. Please try again.", code: "internal_error" },
    { status: 500 },
  );
}

/** Wrap a route handler so thrown errors become structured responses. */
export function handler<T extends unknown[]>(
  fn: (...args: T) => Promise<NextResponse>,
) {
  return async (...args: T): Promise<NextResponse> => {
    try {
      return await fn(...args);
    } catch (error) {
      return errorResponse(error);
    }
  };
}

// ---------------------------------------------------------------------------
// In-memory rate limiting (per process). Documented as a development-grade
// limiter; a shared store (Redis) should replace it in a multi-instance deploy.
// ---------------------------------------------------------------------------

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { ok: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const existing = buckets.get(key);
  if (!existing || existing.resetAt < now) {
    const bucket = { count: 1, resetAt: now + windowMs };
    buckets.set(key, bucket);
    return { ok: true, remaining: limit - 1, resetAt: bucket.resetAt };
  }
  if (existing.count >= limit) {
    return { ok: false, remaining: 0, resetAt: existing.resetAt };
  }
  existing.count += 1;
  return { ok: true, remaining: limit - existing.count, resetAt: existing.resetAt };
}

export function rateLimitOrThrow(key: string, limit: number, windowMs: number, message?: string) {
  const r = rateLimit(key, limit, windowMs);
  if (!r.ok) {
    throw new HttpError(
      429,
      message ?? "Too many requests. Please slow down and try again shortly.",
      "rate_limited",
    );
  }
  return r;
}

/** Hash an IP for storage without keeping the raw address. */
export async function hashIp(ip: string | null): Promise<string | null> {
  if (!ip) return null;
  const salt = process.env.AUTH_SECRET ?? "static-salt";
  const data = new TextEncoder().encode(`${salt}:${ip}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
}

export function clientIp(req: Request): string | null {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip");
}

/** Append an audit-log row for a sensitive workspace action. */
export async function audit(
  workspaceId: string,
  actorId: string | null,
  action: string,
  target?: string,
  metadata?: Record<string, unknown>,
  ipHash?: string | null,
) {
  try {
    await prisma.auditLog.create({
      data: { workspaceId, actorId, action, target, metadata: metadata as object, ipHash: ipHash ?? null },
    });
  } catch (e) {
    console.error("[audit] failed to write", e);
  }
}
