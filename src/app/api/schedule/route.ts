import { NextResponse } from "next/server";
import { db } from "@/db";
import { watchlist, series, settings } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { getSessionUser, unauthorized } from "@/lib/get-user";

const DEFAULT_EPISODE_RUNTIME = 45; // minutes
const SCHEDULE_DAYS = 60; // generate 2 months ahead

const DAY_KEYS = ["dom", "lun", "mar", "mer", "gio", "ven", "sab"] as const;

interface ScheduleEntry {
  seriesName: string;
  seriesTmdbId: number;
  posterPath: string | null;
  episodes: number; // how many episodes this block
  episodeFrom: number; // starting episode number (overall)
  episodeTo: number; // ending episode number (overall)
  minutes: number;
  priority: string;
  status: string;
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

    // Parse weekly schedule
    let weeklySchedule: Record<string, number> = {
      lun: 2, mar: 2, mer: 2, gio: 2, ven: 2, sab: 3, dom: 3,
    };
    if (settingsMap.weekly_schedule) {
      try {
        weeklySchedule = JSON.parse(settingsMap.weekly_schedule);
      } catch { /* use defaults */ }
    }

    // Get watchlist items (to_watch + watching only)
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

    if (items.length === 0) {
      return NextResponse.json({ schedule: {}, stats: { totalEpisodes: 0, totalHours: 0, daysNeeded: 0 } });
    }

    // Build series queue sorted by priority and status
    const queue = items
      .map((item) => {
        const runtime = item.series.episodeRunTime || DEFAULT_EPISODE_RUNTIME;
        const totalEpisodes = item.series.numberOfEpisodes || 1;

        // Estimate watched episodes for "watching" status
        let watchedEpisodes = 0;
        if (item.watchlist.status === "watching" && item.watchlist.currentSeason && item.watchlist.currentEpisode) {
          const avgEpisodesPerSeason = Math.ceil(totalEpisodes / (item.series.numberOfSeasons || 1));
          watchedEpisodes = Math.min(
            totalEpisodes - 1,
            (item.watchlist.currentSeason - 1) * avgEpisodesPerSeason + item.watchlist.currentEpisode
          );
        }

        const remainingEpisodes = Math.max(1, totalEpisodes - watchedEpisodes);

        return {
          seriesName: item.series.name,
          seriesTmdbId: item.series.tmdbId,
          posterPath: item.series.posterPath,
          priority: item.watchlist.priority,
          status: item.watchlist.status,
          runtime,
          totalEpisodes,
          remainingEpisodes,
          scheduledEpisodes: 0,
        };
      })
      .sort((a, b) => {
        // watching first
        const statusOrder = { watching: 0, to_watch: 1 };
        const sa = statusOrder[a.status as keyof typeof statusOrder] ?? 1;
        const sb = statusOrder[b.status as keyof typeof statusOrder] ?? 1;
        if (sa !== sb) return sa - sb;
        // then by priority
        const prioOrder = { high: 0, medium: 1, low: 2 };
        const pa = prioOrder[a.priority as keyof typeof prioOrder] ?? 1;
        const pb = prioOrder[b.priority as keyof typeof prioOrder] ?? 1;
        return pa - pb;
      });

    // Generate schedule
    const schedule: Record<string, ScheduleEntry[]> = {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let totalScheduledEpisodes = 0;
    let totalScheduledMinutes = 0;
    let daysUsed = 0;

    for (let d = 0; d < SCHEDULE_DAYS; d++) {
      const date = new Date(today);
      date.setDate(date.getDate() + d);
      const dayOfWeek = date.getDay(); // 0=dom, 1=lun, ...
      const dayKey = DAY_KEYS[dayOfWeek];
      const availableHours = weeklySchedule[dayKey] || 0;

      if (availableHours <= 0) continue;

      let availableMinutes = availableHours * 60;
      const dateStr = date.toISOString().slice(0, 10);
      const dayEntries: ScheduleEntry[] = [];

      // Fill this day with episodes from the queue
      for (const item of queue) {
        if (availableMinutes <= 0) break;
        const remaining = item.remainingEpisodes - item.scheduledEpisodes;
        if (remaining <= 0) continue;

        // How many episodes fit in remaining time?
        const maxEpisodes = Math.max(1, Math.floor(availableMinutes / item.runtime));
        const episodesToSchedule = Math.min(maxEpisodes, remaining);
        const episodeFrom = item.scheduledEpisodes + 1;
        const episodeTo = item.scheduledEpisodes + episodesToSchedule;
        const minutesUsed = episodesToSchedule * item.runtime;

        dayEntries.push({
          seriesName: item.seriesName,
          seriesTmdbId: item.seriesTmdbId,
          posterPath: item.posterPath,
          episodes: episodesToSchedule,
          episodeFrom,
          episodeTo,
          minutes: minutesUsed,
          priority: item.priority,
          status: item.status,
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

      // Check if all series are fully scheduled
      const allDone = queue.every((s) => s.scheduledEpisodes >= s.remainingEpisodes);
      if (allDone) break;
    }

    return NextResponse.json({
      schedule,
      stats: {
        totalEpisodes: totalScheduledEpisodes,
        totalHours: Math.round(totalScheduledMinutes / 60 * 10) / 10,
        daysNeeded: daysUsed,
        seriesCount: queue.filter((s) => s.scheduledEpisodes > 0).length,
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
