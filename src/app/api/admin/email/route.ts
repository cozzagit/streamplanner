import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { users, watchlist, series } from "@/db/schema";
import { eq, sql, and, inArray } from "drizzle-orm";
import {
  sendEmail,
  testEmail,
  welcomeEmail,
  monthlyPlanEmail,
  inactivityNudgeEmail,
} from "@/lib/email";

export const dynamic = "force-dynamic";

/** Verify the caller is admin */
async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const [user] = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);
  return user?.role === "admin" ? session.user.id : null;
}

export async function POST(request: NextRequest) {
  const adminId = await requireAdmin();
  if (!adminId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { action, to } = body as { action: string; to?: string };

  switch (action) {
    case "test": {
      // Send test email to a specific address or admin's email
      const [admin] = await db
        .select({ email: users.email })
        .from(users)
        .where(eq(users.id, adminId))
        .limit(1);
      const target = to || admin?.email;
      if (!target) return NextResponse.json({ error: "No email target" }, { status: 400 });

      const result = await sendEmail(target, testEmail());
      return NextResponse.json(result);
    }

    case "welcome": {
      // Re-send welcome email to a user
      if (!to) return NextResponse.json({ error: "Missing 'to'" }, { status: 400 });
      const [user] = await db
        .select({ name: users.name, email: users.email })
        .from(users)
        .where(eq(users.email, to))
        .limit(1);
      if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

      const result = await sendEmail(user.email, welcomeEmail(user.name));
      return NextResponse.json(result);
    }

    case "nudge-inactive": {
      // Send inactivity nudge to users who haven't updated watchlist in X days
      const daysThreshold = body.days || 14;
      const inactiveUsers = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          lastActivity: sql<string>`MAX(${watchlist.updatedAt})`.as("last_activity"),
        })
        .from(users)
        .leftJoin(watchlist, eq(users.id, watchlist.userId))
        .groupBy(users.id, users.name, users.email)
        .having(
          sql`MAX(${watchlist.updatedAt}) < NOW() - INTERVAL '${sql.raw(String(daysThreshold))} days'
              OR MAX(${watchlist.updatedAt}) IS NULL`
        );

      const results = [];
      for (const u of inactiveUsers) {
        // Get their pending series
        const pending = await db
          .select({ name: series.name })
          .from(watchlist)
          .innerJoin(series, eq(watchlist.seriesId, series.id))
          .where(
            and(
              eq(watchlist.userId, u.id),
              inArray(watchlist.status, ["to_watch", "watching"])
            )
          );

        if (pending.length === 0) continue;

        const daysSince = u.lastActivity
          ? Math.floor((Date.now() - new Date(u.lastActivity).getTime()) / 86400000)
          : daysThreshold;

        const result = await sendEmail(
          u.email,
          inactivityNudgeEmail(u.name, daysSince, pending.map((p) => p.name))
        );
        results.push({ email: u.email, ...result });
      }
      return NextResponse.json({ sent: results.length, results });
    }

    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }
}
