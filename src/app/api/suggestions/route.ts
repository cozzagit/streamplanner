import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { watchlist, series, settings } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { discoverByProvider } from "@/lib/tmdb";
import { TRACKED_PLATFORMS } from "@/lib/platforms";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  // Load settings
  const userSettings = await db
    .select({ key: settings.key, value: settings.value })
    .from(settings)
    .where(eq(settings.userId, userId));
  const settingsMap = Object.fromEntries(userSettings.map((s) => [s.key, s.value]));

  const activeSubs: string[] = settingsMap.active_subscriptions
    ? JSON.parse(settingsMap.active_subscriptions) : [];
  const weeklySchedule: Record<string, number> = settingsMap.weekly_schedule
    ? JSON.parse(settingsMap.weekly_schedule) : { lun: 2, mar: 2, mer: 2, gio: 2, ven: 2, sab: 3, dom: 3 };
  const weeklyHours = Object.values(weeklySchedule).reduce((a, b) => a + b, 0);
  const monthlyHours = Math.round(weeklyHours * 4.33);
  const excludedGenres = settingsMap.excluded_genres
    ? JSON.parse(settingsMap.excluded_genres).join(",") : "";

  // Watchlist with remaining hours
  const userItems = await db
    .select({
      tmdbId: series.tmdbId,
      watchedEpisodes: watchlist.watchedEpisodes,
      totalEpisodes: series.numberOfEpisodes,
      runTime: series.episodeRunTime,
    })
    .from(watchlist)
    .innerJoin(series, eq(watchlist.seriesId, series.id))
    .where(and(eq(watchlist.userId, userId), sql`${watchlist.status} IN ('to_watch', 'watching')`));

  const watchlistTmdbIds = new Set(userItems.map((w) => w.tmdbId));
  const totalPlannedHours = userItems.reduce((sum, item) => {
    const remaining = (item.totalEpisodes || 0) - (item.watchedEpisodes || 0);
    return sum + Math.ceil((remaining * (item.runTime || 45)) / 60);
  }, 0);

  // Build monthly capacity breakdown (next 6 months)
  const now = new Date();
  const months: { label: string; month: number; year: number; availableHours: number; plannedHours: number }[] = [];
  let hoursRemaining = totalPlannedHours;

  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const label = d.toLocaleDateString("it-IT", { month: "short" }).replace(".", "");
    const daysInMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();

    // Calculate available hours for this month accounting for day of week distribution
    let available = 0;
    for (let day = 1; day <= daysInMonth; day++) {
      // Skip past days in current month
      if (i === 0 && day < now.getDate()) continue;
      const dayDate = new Date(d.getFullYear(), d.getMonth(), day);
      const dayKeys = ["dom", "lun", "mar", "mer", "gio", "ven", "sab"];
      available += weeklySchedule[dayKeys[dayDate.getDay()]] || 0;
    }

    const planned = Math.min(hoursRemaining, available);
    hoursRemaining = Math.max(0, hoursRemaining - available);

    months.push({
      label: label.charAt(0).toUpperCase() + label.slice(1),
      month: d.getMonth() + 1,
      year: d.getFullYear(),
      availableHours: Math.round(available),
      plannedHours: Math.round(planned),
    });
  }

  // Fetch suggestions: unified across all active platforms, deduplicated
  const seenIds = new Set<number>();
  const allSuggestions: { id: number; name: string; posterPath: string | null; voteAverage: number }[] = [];

  for (const slug of activeSubs) {
    const platform = TRACKED_PLATFORMS.find((p) => p.slug === slug);
    if (!platform) continue;
    if (allSuggestions.length >= 12) break;

    try {
      const discover = await discoverByProvider(platform.tmdbId, {
        page: 1,
        sortBy: "popularity.desc",
        minVoteCount: 50,
        withoutGenres: excludedGenres || undefined,
      });

      for (const s of discover.results || []) {
        if (watchlistTmdbIds.has(s.id) || seenIds.has(s.id)) continue;
        seenIds.add(s.id);
        allSuggestions.push({
          id: s.id,
          name: s.name,
          posterPath: s.poster_path,
          voteAverage: s.vote_average,
        });
        if (allSuggestions.length >= 12) break;
      }
    } catch { /* ignore */ }
  }

  // Sort by rating
  allSuggestions.sort((a, b) => (b.voteAverage || 0) - (a.voteAverage || 0));

  return NextResponse.json({
    months,
    suggestions: allSuggestions,
    stats: {
      monthlyHours,
      totalPlannedHours,
      watchlistSize: watchlistTmdbIds.size,
      totalFreeHours: months.reduce((a, m) => a + Math.max(0, m.availableHours - m.plannedHours), 0),
    },
  });
}
