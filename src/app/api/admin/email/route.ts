import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { users, watchlist, series, settings, seriesPlatforms, platforms } from "@/db/schema";
import { eq, sql, and, inArray, desc } from "drizzle-orm";
import {
  sendEmail,
  testEmail,
  welcomeEmail,
  inactivityNudgeEmail,
  monthlyDigestEmail,
} from "@/lib/email";

export const dynamic = "force-dynamic";

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

/** Build personalized digest data for a user */
async function getUserDigestData(userId: string) {
  // Get user's watchlist with series + platform info
  const items = await db
    .select({
      status: watchlist.status,
      priority: watchlist.priority,
      watchedEpisodes: watchlist.watchedEpisodes,
      seriesName: series.name,
      totalEpisodes: series.numberOfEpisodes,
    })
    .from(watchlist)
    .innerJoin(series, eq(watchlist.seriesId, series.id))
    .where(eq(watchlist.userId, userId))
    .orderBy(desc(watchlist.priority));

  // Get active subscriptions
  const [activeSubs] = await db
    .select({ value: settings.value })
    .from(settings)
    .where(and(eq(settings.userId, userId), eq(settings.key, "active_subscriptions")))
    .limit(1);

  const activeSubSlugs: string[] = activeSubs ? JSON.parse(activeSubs.value) : [];

  const watching = items
    .filter((i) => i.status === "watching")
    .map((i) => ({
      name: i.seriesName,
      watched: i.watchedEpisodes,
      total: i.totalEpisodes || 0,
      pct: i.totalEpisodes ? Math.round((i.watchedEpisodes / i.totalEpisodes) * 100) : 0,
    }));

  const toWatch = items
    .filter((i) => i.status === "to_watch")
    .map((i) => ({
      name: i.seriesName,
      episodes: i.totalEpisodes || 0,
      priority: i.priority,
    }));

  return { watching, toWatch, activeSubSlugs };
}

export async function POST(request: NextRequest) {
  const adminId = await requireAdmin();
  if (!adminId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { action, to } = body as { action: string; to?: string; days?: number };

  switch (action) {
    case "test": {
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

    case "monthly-digest": {
      // Send personalized monthly digest to one user or all
      const targetUsers = to
        ? await db.select({ id: users.id, name: users.name, email: users.email })
            .from(users).where(eq(users.email, to)).limit(1)
        : await db.select({ id: users.id, name: users.name, email: users.email }).from(users);

      const results = [];
      for (const u of targetUsers) {
        const digest = await getUserDigestData(u.id);
        if (digest.watching.length === 0 && digest.toWatch.length === 0) continue;
        const result = await sendEmail(
          u.email,
          monthlyDigestEmail(u.name, digest.watching, digest.toWatch, digest.activeSubSlugs)
        );
        results.push({ email: u.email, ...result });
      }
      return NextResponse.json({ sent: results.length, results });
    }

    case "nudge-inactive": {
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
