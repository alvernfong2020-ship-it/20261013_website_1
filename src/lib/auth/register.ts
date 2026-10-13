import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { HttpError } from "@/lib/auth/authorize";
import { ensurePrimaryWorkspace } from "@/lib/auth/authorize";
import { rateLimitOrThrow } from "@/lib/api";

export const registerSchema = z.object({
  name: z.string().trim().min(1, "Please enter your name.").max(120),
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  password: z
    .string()
    .min(8, "Use at least 8 characters.")
    .max(200)
    .regex(/[A-Za-z]/, "Include at least one letter.")
    .regex(/[0-9]/, "Include at least one number."),
});

export async function registerUser(input: unknown, ip: string | null) {
  rateLimitOrThrow(`register:${ip ?? "unknown"}`, 10, 60 * 60 * 1000, "Too many sign-up attempts. Try again later.");
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    throw new HttpError(422, parsed.error.issues[0].message, "validation_error");
  }
  const { name, email, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new HttpError(409, "An account with that email already exists. Try signing in.", "email_taken");
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { email, name, passwordHash },
  });

  await ensurePrimaryWorkspace(user);
  return { id: user.id, email: user.email, name: user.name };
}
