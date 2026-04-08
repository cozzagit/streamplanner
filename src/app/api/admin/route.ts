import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { users, watchlist, series, settings } from "@/db/schema";
import { eq, sql, desc, count } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check admin role
  const [user] = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Fetch all stats in parallel
  const [
    allUsers,
    totalWatchlistItems,
    totalSeries,
    topSeries,
    recentUsers,
    statusDistribution,
    priorityDistribution,
  ] = await Promise.all([
    // All users with their watchlist count
    db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        createdAt: users.createdAt,
        watchlistCount: sql<number>`CAST(COUNT(${watchlist.id}) AS INTEGER)`.as("watchlist_count"),
      })
      .from(users)
      .leftJoin(watchlist, eq(users.id, watchlist.userId))
      .groupBy(users.id, users.name, users.email, users.role, users.createdAt)
      .orderBy(desc(users.createdAt)),

    // Total watchlist items
    db.select({ count: count() }).from(watchlist),

    // Total series in DB
    db.select({ count: count() }).from(series),

    // Top 10 most added series
    db
      .select({
        name: series.name,
        tmdbId: series.tmdbId,
        posterPath: series.posterPath,
        voteAverage: series.voteAverage,
        addCount: count(watchlist.id).as("add_count"),
      })
      .from(watchlist)
      .innerJoin(series, eq(watchlist.seriesId, series.id))
      .groupBy(series.id, series.name, series.tmdbId, series.posterPath, series.voteAverage)
      .orderBy(desc(sql`count(${watchlist.id})`))
      .limit(10),

    // Recent signups (last 30 days)
    db
      .select({
        date: sql<string>`TO_CHAR(${users.createdAt} AT TIME ZONE 'Europe/Rome', 'YYYY-MM-DD')`.as("date"),
        count: count(),
      })
      .from(users)
      .where(sql`${users.createdAt} > NOW() - INTERVAL '30 days'`)
      .groupBy(sql`TO_CHAR(${users.createdAt} AT TIME ZONE 'Europe/Rome', 'YYYY-MM-DD')`)
      .orderBy(sql`TO_CHAR(${users.createdAt} AT TIME ZONE 'Europe/Rome', 'YYYY-MM-DD')`),

    // Watchlist status distribution
    db
      .select({
        status: watchlist.status,
        count: count(),
      })
      .from(watchlist)
      .groupBy(watchlist.status),

    // Priority distribution
    db
      .select({
        priority: watchlist.priority,
        count: count(),
      })
      .from(watchlist)
      .groupBy(watchlist.priority),

  ]);

  // Fetch user settings separately
  const userSettingsRaw = await db
    .select({ userId: settings.userId, key: settings.key, value: settings.value })
    .from(settings)
    .where(sql`${settings.key} IN ('active_subscriptions', 'weekly_schedule')`);

  const settingsMap = new Map<string, { activeSubs: string[]; weeklyHours: number }>();
  for (const s of userSettingsRaw) {
    if (!settingsMap.has(s.userId)) {
      settingsMap.set(s.userId, { activeSubs: [], weeklyHours: 0 });
    }
    const entry = settingsMap.get(s.userId)!;
    if (s.key === "active_subscriptions") {
      try { entry.activeSubs = JSON.parse(s.value); } catch { /* ignore */ }
    }
    if (s.key === "weekly_schedule") {
      try {
        const schedule = JSON.parse(s.value) as Record<string, number>;
        entry.weeklyHours = Object.values(schedule).reduce((a, b) => a + b, 0);
      } catch { /* ignore */ }
    }
  }

  const enrichedUsers = allUsers.map((u) => ({
    ...u,
    activeSubs: settingsMap.get(u.id)?.activeSubs || [],
    weeklyHours: settingsMap.get(u.id)?.weeklyHours || 0,
  }));

  return NextResponse.json({
    users: enrichedUsers,
    stats: {
      totalUsers: allUsers.length,
      totalWatchlistItems: totalWatchlistItems[0]?.count || 0,
      totalSeries: totalSeries[0]?.count || 0,
    },
    topSeries,
    recentSignups: recentUsers,
    statusDistribution,
    priorityDistribution,
  });
}
