import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, watchlist, series, settings } from "@/db/schema";
import { eq, sql, and, inArray } from "drizzle-orm";
import { sendEmail, monthlyDigestEmail, inactivityNudgeEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

const CRON_SECRET = process.env.CRON_SECRET || "";

export async function GET(request: NextRequest) {
  // Verify cron secret
  const secret = request.nextUrl.searchParams.get("secret");
  if (!CRON_SECRET || secret !== CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const action = request.nextUrl.searchParams.get("action");

  if (action === "monthly-digest") {
    const allUsers = await db.select({ id: users.id, name: users.name, email: users.email }).from(users);
    const results = [];

    for (const u of allUsers) {
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
        .where(eq(watchlist.userId, u.id));

      const [activeSubs] = await db
        .select({ value: settings.value })
        .from(settings)
        .where(and(eq(settings.userId, u.id), eq(settings.key, "active_subscriptions")))
        .limit(1);

      const activeSubSlugs: string[] = activeSubs ? JSON.parse(activeSubs.value) : [];

      const watching = items
        .filter((i) => i.status === "watching")
        .map((i) => ({
          name: i.seriesName, watched: i.watchedEpisodes, total: i.totalEpisodes || 0,
          pct: i.totalEpisodes ? Math.round((i.watchedEpisodes / i.totalEpisodes) * 100) : 0,
        }));
      const toWatch = items
        .filter((i) => i.status === "to_watch")
        .map((i) => ({ name: i.seriesName, episodes: i.totalEpisodes || 0, priority: i.priority }));

      if (watching.length === 0 && toWatch.length === 0) continue;

      const result = await sendEmail(u.email, monthlyDigestEmail(u.name, watching, toWatch, activeSubSlugs));
      results.push({ email: u.email, ...result });
    }

    return NextResponse.json({ action: "monthly-digest", sent: results.length, results });
  }

  if (action === "nudge-inactive") {
    const days = Number(request.nextUrl.searchParams.get("days")) || 14;
    const inactiveUsers = await db
      .select({
        id: users.id, name: users.name, email: users.email,
        lastActivity: sql<string>`MAX(${watchlist.updatedAt})`.as("last_activity"),
      })
      .from(users)
      .leftJoin(watchlist, eq(users.id, watchlist.userId))
      .groupBy(users.id, users.name, users.email)
      .having(
        sql`MAX(${watchlist.updatedAt}) < NOW() - INTERVAL '${sql.raw(String(days))} days'
            OR MAX(${watchlist.updatedAt}) IS NULL`
      );

    const results = [];
    for (const u of inactiveUsers) {
      const pending = await db
        .select({ name: series.name })
        .from(watchlist)
        .innerJoin(series, eq(watchlist.seriesId, series.id))
        .where(and(eq(watchlist.userId, u.id), inArray(watchlist.status, ["to_watch", "watching"])));

      if (pending.length === 0) continue;
      const daysSince = u.lastActivity
        ? Math.floor((Date.now() - new Date(u.lastActivity).getTime()) / 86400000)
        : days;

      const result = await sendEmail(
        u.email,
        inactivityNudgeEmail(u.name, daysSince, pending.map((p) => p.name))
      );
      results.push({ email: u.email, ...result });
    }

    return NextResponse.json({ action: "nudge-inactive", sent: results.length, results });
  }

  return NextResponse.json({ error: "Unknown action. Use ?action=monthly-digest or ?action=nudge-inactive" }, { status: 400 });
}
