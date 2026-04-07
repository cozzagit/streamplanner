import { NextResponse } from "next/server";
import { db } from "@/db";
import { watchlist, series, seriesPlatforms, platforms, settings } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { getSessionUser, unauthorized } from "@/lib/get-user";

export const dynamic = "force-dynamic";

const DEFAULT_EPISODE_RUNTIME = 45;
const SCHEDULE_DAYS = 90;
const DAY_KEYS = ["dom", "lun", "mar", "mer", "gio", "ven", "sab"] as const;

function localDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function monthIndex(date: Date): number {
  return date.getFullYear() * 12 + date.getMonth();
}

interface ScheduleEntry {
  seriesName: string;
  seriesTmdbId: number;
  posterPath: string | null;
  watchlistId: string;
  episodes: number;
  episodeFrom: number;
  episodeTo: number;
  minutes: number;
  priority: string;
  status: string;
  platformName?: string;
  platformColor?: string;
  totalEpisodes: number;
  watchedSoFar: number;
}

interface SeriesItem {
  seriesName: string;
  seriesTmdbId: number;
  posterPath: string | null;
  watchlistId: string;
  priority: string;
  status: string;
  runtime: number;
  totalEpisodes: number;
  watchedEpisodes: number;
  remainingEpisodes: number;
  scheduledEpisodes: number;
  platformSlug: string | null;
  platformName: string | null;
  platformColor: string | null;
  isAlwaysAvailable: boolean;
  // For rotation series: which month window
  activeFromMonth: number | null;
  activeUntilMonth: number | null;
}

export async function GET() {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  try {
    // 1. Load settings
    const userSettings = await db.select().from(settings).where(eq(settings.userId, user.id));
    const settingsMap: Record<string, string> = {};
    userSettings.forEach((s) => { settingsMap[s.key] = s.value; });

    let weeklySchedule: Record<string, number> = {
      lun: 2, mar: 2, mer: 2, gio: 2, ven: 2, sab: 3, dom: 3,
    };
    try { weeklySchedule = JSON.parse(settingsMap.weekly_schedule || "{}"); } catch { /* */ }

    let activeSubSlugs: string[] = [];
    try { activeSubSlugs = JSON.parse(settingsMap.active_subscriptions || "[]"); } catch { /* */ }

    let alwaysOnSlugs: string[] = [];
    try { alwaysOnSlugs = JSON.parse(settingsMap.always_on_platforms || "[]"); } catch { /* */ }

    let excludedSlugs: string[] = [];
    try { excludedSlugs = JSON.parse(settingsMap.excluded_platforms || "[]"); } catch { /* */ }

    const weeklyHours = Object.values(weeklySchedule).reduce((a, b) => a + b, 0);
    const monthlyViewingHours = weeklyHours * 4.33;

    // 2. Get watchlist
    const items = await db
      .select()
      .from(watchlist)
      .innerJoin(series, eq(watchlist.seriesId, series.id))
      .where(and(eq(watchlist.userId, user.id), inArray(watchlist.status, ["to_watch", "watching"])));

    if (items.length === 0) {
      return NextResponse.json({
        schedule: {},
        stats: {
          totalEpisodes: 0, totalHours: 0,
          scheduledEpisodes: 0, scheduledHours: 0,
          daysNeeded: 0, seriesCount: 0,
          weeklyHours, allScheduled: true,
        },
      });
    }

    // 3. Load platforms
    const allPlatforms = await db.select().from(platforms);
    const platformById = new Map(allPlatforms.map((p) => [p.id, p]));

    // 4. Build series list
    const allSeries: SeriesItem[] = [];

    for (const item of items) {
      const runtime = item.series.episodeRunTime || DEFAULT_EPISODE_RUNTIME;
      const totalEpisodes = item.series.numberOfEpisodes || 1;
      const watched = item.watchlist.watchedEpisodes || 0;
      const remainingEpisodes = Math.max(0, totalEpisodes - watched);
      if (remainingEpisodes === 0) continue;

      const platformLinks = await db
        .select({ platformId: seriesPlatforms.platformId })
        .from(seriesPlatforms)
        .where(eq(seriesPlatforms.seriesId, item.series.id));

      const seriesPlatformInfos = platformLinks
        .map((pl) => platformById.get(pl.platformId))
        .filter((p) => p && !excludedSlugs.includes(p.slug));

      const activeSub = seriesPlatformInfos.find((p) => p && activeSubSlugs.includes(p.slug));
      const freePlatform = seriesPlatformInfos.find((p) => p && p.isFree);
      const alwaysOn = seriesPlatformInfos.find((p) => p && alwaysOnSlugs.includes(p.slug));
      const bestPaid = seriesPlatformInfos.find((p) => p && !p.isFree && !activeSubSlugs.includes(p.slug) && !alwaysOnSlugs.includes(p.slug));
      const bestPlatform = activeSub || freePlatform || alwaysOn || bestPaid || null;
      const isAlwaysAvailable = !!(activeSub || freePlatform || alwaysOn);

      allSeries.push({
        seriesName: item.series.name,
        seriesTmdbId: item.series.tmdbId,
        posterPath: item.series.posterPath,
        watchlistId: item.watchlist.id,
        priority: item.watchlist.priority,
        status: item.watchlist.status!,
        runtime, totalEpisodes, watchedEpisodes: watched, remainingEpisodes,
        scheduledEpisodes: 0,
        platformSlug: bestPlatform?.slug || null,
        platformName: bestPlatform?.name || null,
        platformColor: bestPlatform?.color || null,
        isAlwaysAvailable,
        activeFromMonth: null,
        activeUntilMonth: null,
      });
    }

    // 5. Compute rotation windows for paid platforms
    // These define WHEN to subscribe, but series on active subs run in parallel
    const now = new Date();
    const currentMonthIdx = monthIndex(now);

    const rotationByPlatform = new Map<string, SeriesItem[]>();
    for (const s of allSeries) {
      if (s.isAlwaysAvailable || !s.platformSlug) continue;
      if (!rotationByPlatform.has(s.platformSlug)) rotationByPlatform.set(s.platformSlug, []);
      rotationByPlatform.get(s.platformSlug)!.push(s);
    }

    // Sort platforms: watching first, then highest priority, then most hours
    const platformRotationOrder = [...rotationByPlatform.entries()]
      .map(([slug, seriesList]) => {
        const totalHours = seriesList.reduce((sum, s) => sum + (s.remainingEpisodes * s.runtime) / 60, 0);
        const monthsNeeded = monthlyViewingHours > 0 ? Math.max(1, Math.ceil(totalHours / monthlyViewingHours)) : 1;
        const maxPriority = Math.max(...seriesList.map((s) =>
          s.priority === "high" ? 3 : s.priority === "medium" ? 2 : 1
        ));
        const hasWatching = seriesList.some((s) => s.status === "watching");
        return { slug, seriesList, totalHours, monthsNeeded, maxPriority, hasWatching };
      })
      .sort((a, b) => {
        // Priority is king — user's explicit choice
        if (a.maxPriority !== b.maxPriority) return b.maxPriority - a.maxPriority;
        // Within same priority, watching series get preference
        if (a.hasWatching && !b.hasWatching) return -1;
        if (!a.hasWatching && b.hasWatching) return 1;
        // Then more content first (use platform efficiently)
        return b.totalHours - a.totalHours;
      });

    // Assign month windows sequentially starting from current month
    let nextMonthStart = currentMonthIdx;
    for (const { seriesList, monthsNeeded } of platformRotationOrder) {
      const fromMonth = nextMonthStart;
      const untilMonth = nextMonthStart + monthsNeeded - 1;
      for (const s of seriesList) {
        s.activeFromMonth = fromMonth;
        s.activeUntilMonth = untilMonth;
      }
      nextMonthStart = untilMonth + 1;
    }

    // 6. Build daily schedule
    // KEY DESIGN: Active-sub series and rotation series run IN PARALLEL.
    // Each day's viewing time is split between:
    //   - Rotation series (scheduled during their platform window)
    //   - Always-available series (fill remaining time)
    // This ensures rotation platforms are used efficiently while
    // active-sub content doesn't block rotation series.

    const rotationSeries = allSeries.filter((s) => !s.isAlwaysAvailable && s.activeFromMonth !== null);
    const alwaysAvailSeries = allSeries.filter((s) => s.isAlwaysAvailable || (s.activeFromMonth === null && s.platformSlug === null));

    // Sort each group by priority
    const sortByPriority = (a: SeriesItem, b: SeriesItem) => {
      const statusOrder = { watching: 0, to_watch: 1 };
      const sa = statusOrder[a.status as keyof typeof statusOrder] ?? 1;
      const sb = statusOrder[b.status as keyof typeof statusOrder] ?? 1;
      if (sa !== sb) return sa - sb;
      const prioOrder = { high: 0, medium: 1, low: 2 };
      return (prioOrder[a.priority as keyof typeof prioOrder] ?? 1) - (prioOrder[b.priority as keyof typeof prioOrder] ?? 1);
    };

    rotationSeries.sort(sortByPriority);
    alwaysAvailSeries.sort(sortByPriority);

    const totalRemainingEpisodes = allSeries.reduce((s, q) => s + q.remainingEpisodes, 0);
    const totalRemainingMinutes = allSeries.reduce((s, q) => s + q.remainingEpisodes * q.runtime, 0);

    const schedule: Record<string, ScheduleEntry[]> = {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let totalScheduledEpisodes = 0;
    let totalScheduledMinutes = 0;
    let daysUsed = 0;

    for (let d = 0; d < SCHEDULE_DAYS; d++) {
      const allDone = allSeries.every((s) => s.scheduledEpisodes >= s.remainingEpisodes);
      if (allDone) break;

      const date = new Date(today);
      date.setDate(date.getDate() + d);
      const dayOfWeek = date.getDay();
      const dayKey = DAY_KEYS[dayOfWeek];
      const availableHours = weeklySchedule[dayKey] || 0;
      if (availableHours <= 0) continue;

      const dateMonthIdx = monthIndex(date);
      let availableMinutes = availableHours * 60;
      const dateStr = localDateStr(date);
      const dayEntries: ScheduleEntry[] = [];

      const scheduleFromList = (list: SeriesItem[], minutesLeft: number): number => {
        for (const item of list) {
          if (minutesLeft < item.runtime * 0.5) break;
          const remaining = item.remainingEpisodes - item.scheduledEpisodes;
          if (remaining <= 0) continue;

          // Check rotation window
          if (item.activeFromMonth !== null && item.activeUntilMonth !== null) {
            if (dateMonthIdx < item.activeFromMonth || dateMonthIdx > item.activeUntilMonth) {
              continue;
            }
          }

          const maxEpisodes = Math.floor(minutesLeft / item.runtime);
          if (maxEpisodes <= 0) continue;
          const episodesToSchedule = Math.min(maxEpisodes, remaining);
          const episodeFrom = item.watchedEpisodes + item.scheduledEpisodes + 1;
          const episodeTo = item.watchedEpisodes + item.scheduledEpisodes + episodesToSchedule;
          const minutesUsed = episodesToSchedule * item.runtime;

          dayEntries.push({
            seriesName: item.seriesName,
            seriesTmdbId: item.seriesTmdbId,
            posterPath: item.posterPath,
            watchlistId: item.watchlistId,
            episodes: episodesToSchedule,
            episodeFrom, episodeTo,
            minutes: minutesUsed,
            priority: item.priority,
            status: item.status,
            platformName: item.platformName || undefined,
            platformColor: item.platformColor || undefined,
            totalEpisodes: item.totalEpisodes,
            watchedSoFar: item.watchedEpisodes + item.scheduledEpisodes,
          });

          item.scheduledEpisodes += episodesToSchedule;
          minutesLeft -= minutesUsed;
          totalScheduledEpisodes += episodesToSchedule;
          totalScheduledMinutes += minutesUsed;
        }
        return minutesLeft;
      };

      // ROTATION SERIES FIRST — they have a limited time window
      availableMinutes = scheduleFromList(rotationSeries, availableMinutes);

      // THEN ALWAYS-AVAILABLE — fill remaining time with active sub / free content
      availableMinutes = scheduleFromList(alwaysAvailSeries, availableMinutes);

      if (dayEntries.length > 0) {
        schedule[dateStr] = dayEntries;
        daysUsed++;
      }
    }

    const allScheduled = allSeries.every((s) => s.scheduledEpisodes >= s.remainingEpisodes);

    return NextResponse.json({
      schedule,
      stats: {
        totalEpisodes: totalRemainingEpisodes,
        totalHours: Math.round(totalRemainingMinutes / 60 * 10) / 10,
        scheduledEpisodes: totalScheduledEpisodes,
        scheduledHours: Math.round(totalScheduledMinutes / 60 * 10) / 10,
        daysNeeded: daysUsed,
        seriesCount: allSeries.length,
        weeklyHours,
        allScheduled,
      },
    });
  } catch (error) {
    console.error("Schedule GET error:", error);
    return NextResponse.json(
      { error: "Errore nella generazione del programma" },
      { status: 500 }
    );
  }
}
