import NextAuth from "next-auth";
import { authConfig, isProtectedPath } from "@/lib/auth/config";

// Edge middleware only performs a lightweight redirect check. The real
// authorisation decision is always re-checked server-side in route handlers
// and server components via `requireUser` / `requireWorkspaceAccess`.
const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { pathname } = req.nextUrl;
  if (isProtectedPath(pathname) && !req.auth?.user) {
    const url = new URL("/sign-in", req.nextUrl.origin);
    url.searchParams.set("callbackUrl", pathname);
    return Response.redirect(url);
  }
});

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|s/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico)$).*)",
  ],
};
