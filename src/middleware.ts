export { auth as middleware } from "@/lib/auth";

export const config = {
  matcher: [
    /*
     * Match all routes except:
     * - /login, /registrati, /landing (public pages)
     * - /api/auth (NextAuth routes)
     * - /_next (Next.js internals)
     * - /favicon.ico, /placeholder-poster.svg (static files)
     */
    "/((?!login|registrati|landing|password-dimenticata|reset-password|api/auth|api/cron|_next|favicon\\.ico|placeholder-poster\\.svg).*)",
  ],
};
