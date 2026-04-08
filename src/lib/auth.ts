import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.email, String(credentials.email)))
          .limit(1);

        if (!user) return null;

        const isValid = await compare(
          String(credentials.password),
          user.passwordHash
        );
        if (!isValid) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        token.role = (user as any).role as string;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (session as any).user.role = token.role as string;
      }
      return session;
    },
    authorized({ auth: session, request }) {
      const isLoggedIn = !!session?.user;
      const path = request.nextUrl.pathname;
      const isPublic =
        path === "/" ||
        path.startsWith("/login") ||
        path.startsWith("/registrati") ||
        path.startsWith("/landing") ||
        path.startsWith("/password-dimenticata") ||
        path.startsWith("/reset-password") ||
        path.startsWith("/api/auth") ||
        path.startsWith("/api/cron");

      if (isPublic) return true;
      return isLoggedIn;
    },
  },
});
