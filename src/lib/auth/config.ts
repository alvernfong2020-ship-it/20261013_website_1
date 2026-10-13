import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe Auth.js configuration.
 *
 * This file must not import Prisma, bcrypt, or any Node-only module, because
 * it is loaded by `middleware.ts` which runs on the Edge runtime. Provider
 * definitions that need the database live in `src/lib/auth/index.ts`.
 */

export const PROTECTED_PREFIXES = [
  "/dashboard",
  "/editor",
  "/onboarding",
  "/settings",
  "/analytics",
  "/assets",
  "/billing",
  "/workspace",
];

export const AUTH_PAGES = ["/sign-in", "/sign-up", "/forgot-password", "/reset-password"];

export function isProtectedPath(pathname: string) {
  return PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export const authConfig = {
  pages: {
    signIn: "/sign-in",
    error: "/sign-in",
  },
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 30 },
  trustHost: true,
  providers: [], // populated in src/lib/auth/index.ts
  callbacks: {
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      if (isProtectedPath(pathname)) return !!auth?.user;
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as { id?: string }).id;
        token.email = user.email;
        token.name = user.name;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.id as string) ?? session.user.id;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
