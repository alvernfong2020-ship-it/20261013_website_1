import { randomBytes, createHash } from "node:crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { HttpError } from "@/lib/auth/authorize";
import { rateLimitOrThrow } from "@/lib/api";

/**
 * Password recovery.
 *
 * Tokens are single-use, expire after 30 minutes, and are stored as a SHA-256
 * hash of the raw token so a database leak cannot be replayed.
 *
 * Email delivery is not configured in this environment, so the reset link is
 * returned to the caller ONLY in development (`RESET_LINK_MODE`). In every
 * other case no link is returned and the caller must have a mail provider
 * wired up. We never pretend an email was sent.
 */

const TTL_MS = 30 * 60 * 1000;

function hashToken(raw: string) {
  return createHash("sha256").update(raw).digest("hex");
}

export const resetLinkMode = () =>
  process.env.NODE_ENV !== "production" || process.env.RESET_LINK_MODE === "inline";

export async function requestPasswordReset(email: string, ip: string | null) {
  rateLimitOrThrow(`forgot:${ip ?? "unknown"}`, 8, 60 * 60 * 1000);
  const normalized = email.trim().toLowerCase();

  // Always return the same shape to avoid account enumeration.
  const generic = {
    message: "If an account exists for that email, a reset link has been created.",
    devLink: null as string | null,
  };

  const user = await prisma.user.findUnique({ where: { email: normalized } });
  if (!user) return generic;

  const raw = randomBytes(32).toString("base64url");
  await prisma.verificationToken.deleteMany({ where: { identifier: `reset:${user.id}` } });
  await prisma.verificationToken.create({
    data: {
      identifier: `reset:${user.id}`,
      token: hashToken(raw),
      expires: new Date(Date.now() + TTL_MS),
    },
  });

  if (resetLinkMode()) {
    const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    generic.devLink = `${base}/reset-password?token=${raw}`;
  }
  return generic;
}

export async function resetPassword(rawToken: string, password: string) {
  if (password.length < 8 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    throw new HttpError(422, "Use at least 8 characters, including a letter and a number.", "weak_password");
  }
  const hashed = hashToken(rawToken);
  const record = await prisma.verificationToken.findFirst({ where: { token: hashed } });
  if (!record || record.expires < new Date()) {
    throw new HttpError(400, "That reset link is invalid or has expired. Request a new one.", "invalid_token");
  }
  const userId = record.identifier.replace(/^reset:/, "");
  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { passwordHash } }),
    prisma.verificationToken.deleteMany({ where: { identifier: record.identifier } }),
    // Invalidate existing sessions after a password change.
    prisma.session.deleteMany({ where: { userId } }),
  ]);

  return { ok: true };
}
