import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  watchlist,
  series,
  seriesPlatforms,
  platforms,
  rotationPlans,
  settings,
  movieWatchlist,
  movies,
  moviePlatforms,
} from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { getSessionUser, unauthorized } from "@/lib/get-user";

export const dynamic = "force-dynamic";

const DEFAULT_EPISODE_RUNTIME = 45; // minutes
const DAY_KEYS = ["dom", "lun", "mar", "mer", "gio", "ven", "sab"] as const;

interface SeriesInfo {
  seriesId: string;
  tmdbId: number;
  name: string;
  priority: string;
  status: string;
  remainingEpisodes: number;
  episodeRunTime: number;
  totalHours: number;
  platformIds: string[];
}

interface PlatformInfo {
  platformId: string;
  tmdbProviderId: number;
  name: string;
  slug: string;
  color: string;
  monthlyPrice: number;
  isFree: boolean;
}

// GET — calcola la rotation ottimale basata su tempo di visione
export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  const monthsAhead = Number(req.nextUrl.searchParams.get("months") || "6");

  try {
    // 1. Load settings
    const allSettings = await db
      .select()
      .from(settings)
      .where(eq(settings.userId, user.id));
    const settingsMap: Record<string, string> = {};
    allSettings.forEach((s) => {
      settingsMap[s.key] = s.value;
    });

    const monthlyBudget = settingsMap.monthly_budget
      ? Number(settingsMap.monthly_budget)
      : 15;

    let alwaysOnSlugs: string[] = [];
    try { alwaysOnSlugs = JSON.parse(settingsMap.always_on_platforms || "[]"); } catch { /* */ }

    let excludedSlugs: string[] = [];
    try { excludedSlugs = JSON.parse(settingsMap.excluded_platforms || "[]"); } catch { /* */ }

    let activeSubSlugs: string[] = [];
    try { activeSubSlugs = JSON.parse(settingsMap.active_subscriptions || "[]"); } catch { /* */ }

    // Parse weekly schedule to calculate monthly viewing capacity
    let weeklySchedule: Record<string, number> = {
      lun: 2, mar: 2, mer: 2, gio: 2, ven: 2, sab: 3, dom: 3,
    };
    try { weeklySchedule = JSON.parse(settingsMap.weekly_schedule || "{}"); } catch { /* */ }

    const weeklyHours = Object.values(weeklySchedule).reduce((a, b) => a + b, 0);
    const monthlyViewingHours = weeklyHours * 4.33; // avg weeks per month

    // 2. Load watchlist with series info
    const watchlistItems = await db
      .select()
      .from(watchlist)
      .innerJoin(series, eq(watchlist.seriesId, series.id))
      .where(
        and(
          eq(watchlist.userId, user.id),
          inArray(watchlist.status, ["to_watch", "watching"])
        )
      );

    if (watchlistItems.length === 0) {
      return NextResponse.json({
        message: "Aggiungi serie alla watchlist per generare il piano",
        plans: [],
        monthlyBudget,
      });
    }

    // 3. Get all platforms
    const allPlatforms = await db.select().from(platforms);
    const platformById = new Map<string, PlatformInfo>();
    const platformBySlug = new Map<string, PlatformInfo>();
    for (const p of allPlatforms) {
      const info: PlatformInfo = {
        platformId: p.id,
        tmdbProviderId: p.tmdbProviderId,
        name: p.name,
        slug: p.slug,
        color: p.color || "#666",
        monthlyPrice: p.monthlyPrice || 0,
        isFree: p.isFree,
      };
      platformById.set(p.id, info);
      platformBySlug.set(p.slug, info);
    }

    // 4. Build series info with platform availability
    const seriesInfoList: SeriesInfo[] = [];

    for (const item of watchlistItems) {
      const runtime = item.series.episodeRunTime || DEFAULT_EPISODE_RUNTIME;
      const totalEpisodes = item.series.numberOfEpisodes || 1;

      const watched = item.watchlist.watchedEpisodes || 0;
      const remainingEpisodes = Math.max(0, totalEpisodes - watched);
      if (remainingEpisodes === 0) continue; // fully watched
      const totalMinutes = remainingEpisodes * runtime;

      // Get platforms for this series
      const platformLinks = await db
        .select({ platformId: seriesPlatforms.platformId })
        .from(seriesPlatforms)
        .where(eq(seriesPlatforms.seriesId, item.series.id));

      const platformIds = platformLinks
        .map((pl) => pl.platformId)
        .filter((pid) => {
          const p = platformById.get(pid);
          return p && !excludedSlugs.includes(p.slug);
        });

      seriesInfoList.push({
        seriesId: item.series.id,
        tmdbId: item.series.tmdbId,
        name: item.series.name,
        priority: item.watchlist.priority,
        status: item.watchlist.status!,
        remainingEpisodes,
        episodeRunTime: runtime,
        totalHours: Math.round(totalMinutes / 60 * 10) / 10,
        platformIds,
      });
    }

    // 4b. Add movies
    const movieItems = await db
      .select()
      .from(movieWatchlist)
      .innerJoin(movies, eq(movieWatchlist.movieId, movies.id))
      .where(and(eq(movieWatchlist.userId, user.id), inArray(movieWatchlist.status, ["to_watch"])));

    for (const item of movieItems) {
      const runtime = item.movies.runtime || 120;
      const totalMinutes = runtime;

      const platformLinks = await db
        .select({ platformId: moviePlatforms.platformId })
        .from(moviePlatforms)
        .where(eq(moviePlatforms.movieId, item.movies.id));

      const platformIds = platformLinks
        .map((pl) => pl.platformId)
        .filter((pid) => {
          const p = platformById.get(pid);
          return p && !excludedSlugs.includes(p.slug);
        });

      seriesInfoList.push({
        seriesId: item.movies.id,
        tmdbId: item.movies.tmdbId,
        name: item.movies.title,
        priority: item.movie_watchlist.priority,
        status: item.movie_watchlist.status!,
        remainingEpisodes: 1,
        episodeRunTime: runtime,
        totalHours: Math.round(totalMinutes / 60 * 10) / 10,
        platformIds,
      });
    }

    // 5. Categorize series by coverage type
    const coveredByActiveSub: { series: SeriesInfo; platform: PlatformInfo }[] = [];
    const coveredByFree: { series: SeriesInfo; platform: PlatformInfo }[] = [];
    const coveredByAlwaysOn: { series: SeriesInfo; platform: PlatformInfo }[] = [];
    const needsRotation: SeriesInfo[] = [];

    for (const s of seriesInfoList) {
      // Check active subscriptions first
      const activeSubPlatform = s.platformIds
        .map((pid) => platformById.get(pid)!)
        .find((p) => activeSubSlugs.includes(p.slug));
      if (activeSubPlatform) {
        coveredByActiveSub.push({ series: s, platform: activeSubPlatform });
        continue;
      }

      // Check free platforms
      const freePlatform = s.platformIds
        .map((pid) => platformById.get(pid)!)
        .find((p) => p.isFree);
      if (freePlatform) {
        coveredByFree.push({ series: s, platform: freePlatform });
        continue;
      }

      // Check always-on
      const alwaysOnPlatform = s.platformIds
        .map((pid) => platformById.get(pid)!)
        .find((p) => alwaysOnSlugs.includes(p.slug));
      if (alwaysOnPlatform) {
        coveredByAlwaysOn.push({ series: s, platform: alwaysOnPlatform });
        continue;
      }

      // Needs rotation
      needsRotation.push(s);
    }

    // 6. Assign rotation series to best platforms using greedy set-cover
    // Group by platform, pick platform that covers the most weighted hours
    const assignments: { platform: PlatformInfo; seriesList: SeriesInfo[]; totalHours: number; monthsNeeded: number }[] = [];
    const assigned = new Set<string>();

    const remaining = [...needsRotation];

    while (remaining.length > 0) {
      // Score each platform by how many unassigned series it covers
      let bestPlatformId: string | null = null;
      let bestScore = -1;
      let bestCoverage: SeriesInfo[] = [];

      const candidatePlatforms = new Map<string, SeriesInfo[]>();

      for (const s of remaining) {
        if (assigned.has(s.seriesId)) continue;
        for (const pid of s.platformIds) {
          const p = platformById.get(pid);
          if (!p || p.isFree || activeSubSlugs.includes(p.slug) || alwaysOnSlugs.includes(p.slug)) continue;
          if (!candidatePlatforms.has(pid)) candidatePlatforms.set(pid, []);
          candidatePlatforms.get(pid)!.push(s);
        }
      }

      if (candidatePlatforms.size === 0) break; // remaining series have no available platforms

      for (const [pid, coveringSeries] of candidatePlatforms) {
        const p = platformById.get(pid)!;
        // Score: weighted series count / cost
        const weightedScore = coveringSeries.reduce((sum, s) => {
          const prioW = s.priority === "high" ? 3 : s.priority === "medium" ? 2 : 1;
          const statusW = s.status === "watching" ? 2 : 1;
          return sum + prioW * statusW;
        }, 0);
        const score = p.monthlyPrice > 0 ? weightedScore / p.monthlyPrice : weightedScore * 100;

        if (score > bestScore) {
          bestScore = score;
          bestPlatformId = pid;
          bestCoverage = coveringSeries;
        }
      }

      if (!bestPlatformId) break;

      const platform = platformById.get(bestPlatformId)!;
      const totalHours = bestCoverage.reduce((sum, s) => sum + s.totalHours, 0);
      const monthsNeeded = monthlyViewingHours > 0
        ? Math.max(1, Math.ceil(totalHours / monthlyViewingHours))
        : 1;

      assignments.push({
        platform,
        seriesList: bestCoverage,
        totalHours,
        monthsNeeded,
      });

      bestCoverage.forEach((s) => assigned.add(s.seriesId));
      // Remove assigned from remaining
      for (let i = remaining.length - 1; i >= 0; i--) {
        if (assigned.has(remaining[i].seriesId)) remaining.splice(i, 1);
      }
    }

    // Sort assignments: highest priority first, then by score
    assignments.sort((a, b) => {
      const prioA = Math.max(...a.seriesList.map((s) => s.priority === "high" ? 3 : s.priority === "medium" ? 2 : 1));
      const prioB = Math.max(...b.seriesList.map((s) => s.priority === "high" ? 3 : s.priority === "medium" ? 2 : 1));
      if (prioA !== prioB) return prioB - prioA;
      return b.totalHours - a.totalHours;
    });

    // 7. Build month-by-month plan
    // If past day 7 of current month, rotation starts next month
    // (not worth subscribing for the remaining days)
    const now = new Date();
    const plans = [];
    let monthIndex = now.getDate() > 7 ? 1 : 0;

    // Always-on cost
    const alwaysOnCost = coveredByAlwaysOn.reduce((sum, { platform }) => {
      return sum + (platform.isFree ? 0 : platform.monthlyPrice);
    }, 0);
    // Deduplicate always-on platforms
    const alwaysOnPlatformSet = new Set(coveredByAlwaysOn.map((a) => a.platform.slug));
    const uniqueAlwaysOnCost = [...alwaysOnPlatformSet].reduce((sum, slug) => {
      const p = platformBySlug.get(slug);
      return sum + (p && !p.isFree ? p.monthlyPrice : 0);
    }, 0);

    for (const assignment of assignments) {
      for (let m = 0; m < assignment.monthsNeeded && monthIndex < monthsAhead; m++) {
        const planMonth = ((now.getMonth() + monthIndex) % 12) + 1;
        const planYear = now.getFullYear() + Math.floor((now.getMonth() + monthIndex) / 12);

        const monthCost = (assignment.platform.isFree ? 0 : assignment.platform.monthlyPrice) + uniqueAlwaysOnCost;
        const isFirstMonth = m === 0;
        const isLastMonth = m === assignment.monthsNeeded - 1;

        // Calculate hours for this specific month
        const hoursThisMonth = isLastMonth
          ? assignment.totalHours - m * monthlyViewingHours
          : Math.min(monthlyViewingHours, assignment.totalHours - m * monthlyViewingHours);

        plans.push({
          month: planMonth,
          year: planYear,
          label: new Date(planYear, planMonth - 1).toLocaleDateString("it-IT", {
            month: "long",
            year: "numeric",
          }),
          mainPlatform: {
            platformId: assignment.platform.platformId,
            name: assignment.platform.name,
            slug: assignment.platform.slug,
            color: assignment.platform.color,
            monthlyPrice: assignment.platform.monthlyPrice,
            isFree: assignment.platform.isFree,
            coveredSeries: isFirstMonth
              ? assignment.seriesList.map((s) => ({
                  seriesId: s.seriesId,
                  tmdbId: s.tmdbId,
                  name: s.name,
                  priority: s.priority,
                  status: s.status,
                  episodes: s.remainingEpisodes,
                  hours: s.totalHours,
                }))
              : [], // only show series list on first month
          },
          alwaysOnPlatforms: coveredByAlwaysOn.length > 0
            ? [...alwaysOnPlatformSet].map((slug) => {
                const p = platformBySlug.get(slug)!;
                const seriesOnPlatform = coveredByAlwaysOn
                  .filter((a) => a.platform.slug === slug)
                  .map((a) => ({ name: a.series.name, priority: a.series.priority }));
                return { ...p, coveredSeries: isFirstMonth && monthIndex === 0 ? seriesOnPlatform : [] };
              })
            : [],
          freePlatforms: monthIndex === 0 && isFirstMonth
            ? [...new Set(coveredByFree.map((f) => f.platform.slug))].map((slug) => {
                const p = platformBySlug.get(slug)!;
                const seriesOnPlatform = coveredByFree
                  .filter((f) => f.platform.slug === slug)
                  .map((f) => ({ name: f.series.name, priority: f.series.priority }));
                return { ...p, coveredSeries: seriesOnPlatform };
              })
            : [],
          estimatedCost: monthCost,
          totalHoursOnPlatform: Math.round(assignment.totalHours * 10) / 10,
          viewingHoursThisMonth: Math.round(Math.max(0, hoursThisMonth) * 10) / 10,
          monthsForPlatform: assignment.monthsNeeded,
          currentMonthOfPlatform: m + 1,
          seriesCovered: assignment.seriesList.length,
          withinBudget: monthlyBudget === 0 || monthCost <= monthlyBudget,
        });

        monthIndex++;
      }
    }

    // If there are months left in the plan horizon with nothing to rotate
    // (all series covered), fill remaining as "no rotation needed"

    // 8. Calculate savings
    const allRotatablePlatformSlugs = new Set<string>();
    assignments.forEach((a) => allRotatablePlatformSlugs.add(a.platform.slug));

    const totalIfAllActive = [...allRotatablePlatformSlugs].reduce((sum, slug) => {
      const p = platformBySlug.get(slug);
      return sum + (p ? p.monthlyPrice : 0);
    }, 0) + uniqueAlwaysOnCost;

    const rotationMonthlyCost = plans.length > 0
      ? plans.reduce((sum, p) => sum + p.estimatedCost, 0) / plans.length
      : 0;

    const activeSubsCost = [...new Set(coveredByActiveSub.map((a) => a.platform.slug))].reduce((sum, slug) => {
      const p = platformBySlug.get(slug);
      return sum + (p && !p.isFree ? p.monthlyPrice : 0);
    }, 0);

    // Uncovered series (no platform available)
    const uncoveredSeries = needsRotation.filter((s) => !assigned.has(s.seriesId));

    return NextResponse.json({
      plans,
      activeSubscriptions: (() => {
        const grouped = new Map<string, { platform: PlatformInfo; series: SeriesInfo[] }>();
        for (const { series: s, platform: p } of coveredByActiveSub) {
          if (!grouped.has(p.slug)) grouped.set(p.slug, { platform: p, series: [] });
          grouped.get(p.slug)!.series.push(s);
        }
        return [...grouped.values()].map((g) => ({
          name: g.platform.name,
          slug: g.platform.slug,
          color: g.platform.color,
          monthlyPrice: g.platform.monthlyPrice,
          seriesCovered: g.series.length,
          totalHours: Math.round(g.series.reduce((s, ser) => s + ser.totalHours, 0) * 10) / 10,
          coveredSeries: g.series.map((s) => ({
            name: s.name,
            priority: s.priority,
            episodes: s.remainingEpisodes,
            hours: s.totalHours,
          })),
        }));
      })(),
      uncoveredSeries: uncoveredSeries.map((s) => ({ name: s.name, tmdbId: s.tmdbId })),
      summary: {
        monthlyBudget,
        weeklyHours,
        monthlyViewingHours: Math.round(monthlyViewingHours * 10) / 10,
        alwaysOnCost: uniqueAlwaysOnCost,
        activeSubsCost,
        totalPlatformsCost: totalIfAllActive,
        rotationMonthlyCost: Math.round(rotationMonthlyCost * 100) / 100,
        monthlySavings: Math.round((totalIfAllActive - rotationMonthlyCost) * 100) / 100,
        watchlistTotal: seriesInfoList.length,
        totalViewingHours: Math.round(seriesInfoList.reduce((s, si) => s + si.totalHours, 0) * 10) / 10,
        seriesCoveredByActiveSubs: coveredByActiveSub.length,
        seriesCoveredByFree: coveredByFree.length,
        platformsNeeded: allRotatablePlatformSlugs.size,
        monthsInPlan: plans.length,
        alwaysOnPlatforms: [...alwaysOnPlatformSet],
        activeSubscriptions: activeSubSlugs,
      },
    });
  } catch (error) {
    console.error("Rotation plan error:", error);
    return NextResponse.json(
      { error: "Errore nel calcolo del piano" },
      { status: 500 }
    );
  }
}

// POST — conferma un piano mensile
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  try {
    const body = await req.json();
    const { month, year, platformId, estimatedCost, seriesCount, reason } = body;

    const [plan] = await db
      .insert(rotationPlans)
      .values({
        userId: user.id,
        month,
        year,
        platformId,
        isRecommended: true,
        isConfirmed: true,
        estimatedCost,
        seriesCount: seriesCount || 0,
        reason: reason || null,
      })
      .returning();

    return NextResponse.json(plan, { status: 201 });
  } catch (error) {
    console.error("Rotation confirm error:", error);
    return NextResponse.json(
      { error: "Errore nella conferma del piano" },
      { status: 500 }
    );
  }
}
