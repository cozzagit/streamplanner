import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { users, watchlist, series, settings } from "@/db/schema";
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

  // Get user settings
  const userSettings = await db
    .select({ key: settings.key, value: settings.value })
    .from(settings)
    .where(eq(settings.userId, userId));

  const settingsMap = Object.fromEntries(userSettings.map((s) => [s.key, s.value]));
  const activeSubs: string[] = settingsMap.active_subscriptions
    ? JSON.parse(settingsMap.active_subscriptions)
    : [];
  const weeklySchedule: Record<string, number> = settingsMap.weekly_schedule
    ? JSON.parse(settingsMap.weekly_schedule)
    : { lun: 2, mar: 2, mer: 2, gio: 2, ven: 2, sab: 3, dom: 3 };
  const weeklyHours = Object.values(weeklySchedule).reduce((a, b) => a + b, 0);
  const monthlyHours = Math.round(weeklyHours * 4.33);

  // Get user's current watchlist series (to exclude from suggestions)
  const userWatchlist = await db
    .select({ tmdbId: series.tmdbId })
    .from(watchlist)
    .innerJoin(series, eq(watchlist.seriesId, series.id))
    .where(eq(watchlist.userId, userId));
  const watchlistTmdbIds = new Set(userWatchlist.map((w) => w.tmdbId));

  // Calculate how many hours are already planned
  const userItems = await db
    .select({
      watchedEpisodes: watchlist.watchedEpisodes,
      totalEpisodes: series.numberOfEpisodes,
      runTime: series.episodeRunTime,
    })
    .from(watchlist)
    .innerJoin(series, eq(watchlist.seriesId, series.id))
    .where(
      and(
        eq(watchlist.userId, userId),
        sql`${watchlist.status} IN ('to_watch', 'watching')`
      )
    );

  const totalPlannedHours = userItems.reduce((sum, item) => {
    const remaining = (item.totalEpisodes || 0) - (item.watchedEpisodes || 0);
    const runtime = item.runTime || 45;
    return sum + Math.ceil((remaining * runtime) / 60);
  }, 0);

  const totalPlannedMonths = monthlyHours > 0 ? Math.ceil(totalPlannedHours / monthlyHours) : 0;

  // Identify platforms with spare capacity
  // Active subs: always available, suggest if few series
  // Rotation: suggest for platforms that will be activated
  interface SuggestionEntry {
    platform: { name: string; slug: string; color: string; tmdbId: number };
    reason: string;
    freeHours: number;
    series: { id: number; name: string; posterPath: string | null; voteAverage: number; overview: string }[];
  }
  const suggestions: SuggestionEntry[] = [];

  const freeHoursLeft = Math.max(0, monthlyHours - Math.min(totalPlannedHours, monthlyHours));
  const hasLowContent = totalPlannedMonths <= 2;
  const excludedGenres = settingsMap.excluded_genres
    ? JSON.parse(settingsMap.excluded_genres).join(",")
    : "";

  // Helper to fetch and filter TMDB series for a platform
  async function fetchSuggestions(
    platform: typeof TRACKED_PLATFORMS[0],
    sortBy: string,
    minVote?: number,
    limit = 6
  ) {
    const discover = await discoverByProvider(platform.tmdbId, {
      page: 1,
      sortBy,
      minVoteCount: sortBy.includes("vote") ? 200 : 50,
      minVote,
      withoutGenres: excludedGenres || undefined,
    });
    return (discover.results || [])
      .filter((s) => !watchlistTmdbIds.has(s.id))
      .slice(0, limit)
      .map((s) => ({
        id: s.id,
        name: s.name,
        posterPath: s.poster_path,
        voteAverage: s.vote_average,
        overview: s.overview?.slice(0, 120) || "",
      }));
  }

  // 1. PRIORITY: Active subscriptions — always suggest first (user pays for them!)
  for (const slug of activeSubs) {
    const platform = TRACKED_PLATFORMS.find((p) => p.slug === slug);
    if (!platform) continue;

    try {
      const filtered = await fetchSuggestions(platform, "popularity.desc");
      if (filtered.length > 0) {
        const reason = hasLowContent
          ? `Stai pagando ${platform.name} — riempi il calendario con queste!`
          : `Le piu popolari su ${platform.name} — gia nel tuo abbonamento`;
        suggestions.push({
          platform: { name: platform.name, slug: platform.slug, color: platform.color, tmdbId: platform.tmdbId },
          reason,
          freeHours: freeHoursLeft,
          series: filtered,
        });
      }
    } catch { /* ignore TMDB errors */ }

    // Limit to max 2 active sub suggestions to keep it light
    if (suggestions.length >= 2) break;
  }

  return NextResponse.json({
    suggestions,
    stats: {
      monthlyHours,
      totalPlannedHours,
      totalPlannedMonths,
      watchlistSize: watchlistTmdbIds.size,
    },
  });
}
