import { NextResponse } from "next/server";
import { db } from "@/db";
import { watchlist, series, seriesPlatforms, platforms, settings } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { getSessionUser, unauthorized } from "@/lib/get-user";

export const dynamic = "force-dynamic";

const DEFAULT_EPISODE_RUNTIME = 45; // minutes
const SCHEDULE_DAYS = 90;

const DAY_KEYS = ["dom", "lun", "mar", "mer", "gio", "ven", "sab"] as const;

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
  watchedSoFar: number; // watched before this block
}

interface SeriesQueueItem {
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
}

export async function GET() {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  try {
    // Load user settings
    const userSettings = await db
      .select()
      .from(settings)
      .where(eq(settings.userId, user.id));

    const settingsMap: Record<string, string> = {};
    userSettings.forEach((s) => {
      settingsMap[s.key] = s.value;
    });

    let weeklySchedule: Record<string, number> = {
      lun: 2, mar: 2, mer: 2, gio: 2, ven: 2, sab: 3, dom: 3,
    };
    if (settingsMap.weekly_schedule) {
      try { weeklySchedule = JSON.parse(settingsMap.weekly_schedule); } catch { /* */ }
    }

    let activeSubSlugs: string[] = [];
    try { activeSubSlugs = JSON.parse(settingsMap.active_subscriptions || "[]"); } catch { /* */ }

    let alwaysOnSlugs: string[] = [];
    try { alwaysOnSlugs = JSON.parse(settingsMap.always_on_platforms || "[]"); } catch { /* */ }

    let excludedSlugs: string[] = [];
    try { excludedSlugs = JSON.parse(settingsMap.excluded_platforms || "[]"); } catch { /* */ }

    // Get watchlist items
    const items = await db
      .select()
      .from(watchlist)
      .innerJoin(series, eq(watchlist.seriesId, series.id))
      .where(
        and(
          eq(watchlist.userId, user.id),
          inArray(watchlist.status, ["to_watch", "watching"])
        )
      );

    const weeklyHours = Object.values(weeklySchedule).reduce((a, b) => a + b, 0);

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

    // Get all platforms
    const allPlatforms = await db.select().from(platforms);
    const platformById = new Map(allPlatforms.map((p) => [p.id, p]));

    // Build the queue with platform info
    const queue: SeriesQueueItem[] = [];

    for (const item of items) {
      const runtime = item.series.episodeRunTime || DEFAULT_EPISODE_RUNTIME;
      const totalEpisodes = item.series.numberOfEpisodes || 1;

      // Use watchedEpisodes from DB (accurate progress tracking)
      const watched = item.watchlist.watchedEpisodes || 0;
      const remainingEpisodes = Math.max(0, totalEpisodes - watched);

      if (remainingEpisodes === 0) continue; // fully watched, skip

      // Get platforms for this series
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
      const bestPlatform = activeSub || freePlatform || alwaysOn || seriesPlatformInfos[0] || null;

      queue.push({
        seriesName: item.series.name,
        seriesTmdbId: item.series.tmdbId,
        posterPath: item.series.posterPath,
        watchlistId: item.watchlist.id,
        priority: item.watchlist.priority,
        status: item.watchlist.status!,
        runtime,
        totalEpisodes,
        watchedEpisodes: watched,
        remainingEpisodes,
        scheduledEpisodes: 0,
        platformSlug: bestPlatform?.slug || null,
        platformName: bestPlatform?.name || null,
        platformColor: bestPlatform?.color || null,
      });
    }

    // Sort: watching first, then priority high→low
    queue.sort((a, b) => {
      const statusOrder = { watching: 0, to_watch: 1 };
      const sa = statusOrder[a.status as keyof typeof statusOrder] ?? 1;
      const sb = statusOrder[b.status as keyof typeof statusOrder] ?? 1;
      if (sa !== sb) return sa - sb;
      const prioOrder = { high: 0, medium: 1, low: 2 };
      const pa = prioOrder[a.priority as keyof typeof prioOrder] ?? 1;
      const pb = prioOrder[b.priority as keyof typeof prioOrder] ?? 1;
      return pa - pb;
    });

    // Calculate totals
    const totalRemainingEpisodes = queue.reduce((s, q) => s + q.remainingEpisodes, 0);
    const totalRemainingMinutes = queue.reduce((s, q) => s + q.remainingEpisodes * q.runtime, 0);

    // Generate schedule
    const schedule: Record<string, ScheduleEntry[]> = {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let totalScheduledEpisodes = 0;
    let totalScheduledMinutes = 0;
    let daysUsed = 0;

    for (let d = 0; d < SCHEDULE_DAYS; d++) {
      const allDone = queue.every((s) => s.scheduledEpisodes >= s.remainingEpisodes);
      if (allDone) break;

      const date = new Date(today);
      date.setDate(date.getDate() + d);
      const dayOfWeek = date.getDay();
      const dayKey = DAY_KEYS[dayOfWeek];
      const availableHours = weeklySchedule[dayKey] || 0;

      if (availableHours <= 0) continue;

      let availableMinutes = availableHours * 60;
      const dateStr = date.toISOString().slice(0, 10);
      const dayEntries: ScheduleEntry[] = [];

      for (const item of queue) {
        if (availableMinutes < item.runtime * 0.5) break;
        const remaining = item.remainingEpisodes - item.scheduledEpisodes;
        if (remaining <= 0) continue;

        const maxEpisodes = Math.floor(availableMinutes / item.runtime);
        if (maxEpisodes <= 0) continue;
        const episodesToSchedule = Math.min(maxEpisodes, remaining);
        // Episode numbers are relative to remaining (watched + offset)
        const episodeFrom = item.watchedEpisodes + item.scheduledEpisodes + 1;
        const episodeTo = item.watchedEpisodes + item.scheduledEpisodes + episodesToSchedule;
        const minutesUsed = episodesToSchedule * item.runtime;

        dayEntries.push({
          seriesName: item.seriesName,
          seriesTmdbId: item.seriesTmdbId,
          posterPath: item.posterPath,
          watchlistId: item.watchlistId,
          episodes: episodesToSchedule,
          episodeFrom,
          episodeTo,
          minutes: minutesUsed,
          priority: item.priority,
          status: item.status,
          platformName: item.platformName || undefined,
          platformColor: item.platformColor || undefined,
          totalEpisodes: item.totalEpisodes,
          watchedSoFar: item.watchedEpisodes + item.scheduledEpisodes,
        });

        item.scheduledEpisodes += episodesToSchedule;
        availableMinutes -= minutesUsed;
        totalScheduledEpisodes += episodesToSchedule;
        totalScheduledMinutes += minutesUsed;
      }

      if (dayEntries.length > 0) {
        schedule[dateStr] = dayEntries;
        daysUsed++;
      }
    }

    const allScheduled = queue.every((s) => s.scheduledEpisodes >= s.remainingEpisodes);

    return NextResponse.json({
      schedule,
      stats: {
        totalEpisodes: totalRemainingEpisodes,
        totalHours: Math.round(totalRemainingMinutes / 60 * 10) / 10,
        scheduledEpisodes: totalScheduledEpisodes,
        scheduledHours: Math.round(totalScheduledMinutes / 60 * 10) / 10,
        daysNeeded: daysUsed,
        seriesCount: queue.length,
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
