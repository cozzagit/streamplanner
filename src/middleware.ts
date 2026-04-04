export { auth as middleware } from "@/lib/auth";

export const config = {
  matcher: [
    /*
     * Match all routes except:
     * - /login, /registrati (auth pages)
     * - /api/auth (NextAuth routes)
     * - /_next (Next.js internals)
     * - /favicon.ico, /placeholder-poster.svg (static files)
     */
    "/((?!login|registrati|api/auth|_next|favicon\\.ico|placeholder-poster\\.svg).*)",
  ],
};
