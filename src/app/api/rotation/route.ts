import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  watchlist,
  series,
  seriesPlatforms,
  platforms,
  rotationPlans,
  settings,
} from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { getSessionUser, unauthorized } from "@/lib/get-user";

interface PlatformScore {
  platformId: string;
  tmdbProviderId: number;
  name: string;
  slug: string;
  color: string;
  monthlyPrice: number;
  isFree: boolean;
  seriesAvailable: {
    seriesId: string;
    tmdbId: number;
    name: string;
    priority: string;
    status: string;
  }[];
  score: number; // weighted score: series count * priority weight
  costPerSeries: number;
}

// GET — calcola la rotation ottimale
export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  const monthsAhead = Number(req.nextUrl.searchParams.get("months") || "3");

  try {
    // 1. Get all settings for this user
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
    if (settingsMap.always_on_platforms) {
      try {
        alwaysOnSlugs = JSON.parse(settingsMap.always_on_platforms);
      } catch {
        // ignore invalid JSON
      }
    }

    let excludedSlugs: string[] = [];
    if (settingsMap.excluded_platforms) {
      try {
        excludedSlugs = JSON.parse(settingsMap.excluded_platforms);
      } catch {
        // ignore invalid JSON
      }
    }

    let activeSubSlugs: string[] = [];
    if (settingsMap.active_subscriptions) {
      try {
        activeSubSlugs = JSON.parse(settingsMap.active_subscriptions);
      } catch {
        // ignore invalid JSON
      }
    }

    // 2. Get all watchlist items (to_watch and watching only) for this user
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

    // 3. For each watchlist series, get available platforms
    const seriesWithPlatforms = await Promise.all(
      watchlistItems.map(async (item) => {
        const platformLinks = await db
          .select({
            platformId: platforms.id,
            platformName: platforms.name,
            platformSlug: platforms.slug,
            platformColor: platforms.color,
            tmdbProviderId: platforms.tmdbProviderId,
            monthlyPrice: platforms.monthlyPrice,
            isFree: platforms.isFree,
            monetizationType: seriesPlatforms.monetizationType,
          })
          .from(seriesPlatforms)
          .innerJoin(platforms, eq(seriesPlatforms.platformId, platforms.id))
          .where(eq(seriesPlatforms.seriesId, item.series.id));

        return {
          ...item,
          platforms: platformLinks,
        };
      })
    );

    // 4. Build platform → series mapping
    const platformMap = new Map<string, PlatformScore>();

    for (const item of seriesWithPlatforms) {
      for (const pl of item.platforms) {
        const key = pl.platformId;
        if (!platformMap.has(key)) {
          platformMap.set(key, {
            platformId: pl.platformId,
            tmdbProviderId: pl.tmdbProviderId,
            name: pl.platformName,
            slug: pl.platformSlug,
            color: pl.platformColor || "#666",
            monthlyPrice: pl.monthlyPrice || 0,
            isFree: pl.isFree,
            seriesAvailable: [],
            score: 0,
            costPerSeries: 0,
          });
        }

        const entry = platformMap.get(key)!;
        const priorityWeight =
          item.watchlist.priority === "high"
            ? 3
            : item.watchlist.priority === "medium"
            ? 2
            : 1;
        const statusWeight =
          item.watchlist.status === "watching" ? 2 : 1;

        entry.seriesAvailable.push({
          seriesId: item.series.id,
          tmdbId: item.series.tmdbId,
          name: item.series.name,
          priority: item.watchlist.priority,
          status: item.watchlist.status!,
        });
        entry.score += priorityWeight * statusWeight;
      }
    }

    // 5. Filter out excluded platforms and calculate cost-effectiveness
    const scoredPlatforms = Array.from(platformMap.values())
      .filter((p) => !excludedSlugs.includes(p.slug))
      .map((p) => ({
        ...p,
        isActiveSub: activeSubSlugs.includes(p.slug),
        costPerSeries: p.isFree || activeSubSlugs.includes(p.slug)
          ? 0
          : p.monthlyPrice / Math.max(p.seriesAvailable.length, 1),
      }));

    // Active subscriptions: user already pays, covered automatically
    const activeSubPlatforms = scoredPlatforms.filter((p) => p.isActiveSub);
    // Always-on: platforms the user wants to keep in rotation permanently
    const alwaysOnPlatforms = scoredPlatforms.filter((p) =>
      alwaysOnSlugs.includes(p.slug) && !p.isActiveSub
    );
    const alwaysOnCost = alwaysOnPlatforms.reduce(
      (sum, p) => sum + (p.isFree ? 0 : p.monthlyPrice),
      0
    );
    const remainingBudget = Math.max(0, monthlyBudget - alwaysOnCost);

    // Sort by: free first, then best score/cost ratio
    scoredPlatforms.sort((a, b) => {
      if (a.isFree && !b.isFree) return -1;
      if (!a.isFree && b.isFree) return 1;
      const ratioA = a.monthlyPrice > 0 ? a.score / a.monthlyPrice : a.score * 100;
      const ratioB = b.monthlyPrice > 0 ? b.score / b.monthlyPrice : b.score * 100;
      return ratioB - ratioA;
    });

    // 6. Generate monthly plans using greedy set cover with budget constraint
    const now = new Date();
    const plans = [];

    const uncoveredSeries = new Set(
      watchlistItems.map((w) => w.series.id)
    );

    // Pre-cover series available on active subscriptions (user already has them)
    const activeSubCoverage: (typeof scoredPlatforms[0] & { coveredSeries: typeof scoredPlatforms[0]["seriesAvailable"] })[] = [];
    for (const asp of activeSubPlatforms) {
      const covered = asp.seriesAvailable.filter((s) =>
        uncoveredSeries.has(s.seriesId)
      );
      if (covered.length > 0) {
        covered.forEach((s) => uncoveredSeries.delete(s.seriesId));
        activeSubCoverage.push({ ...asp, coveredSeries: covered });
      }
    }

    for (let m = 0; m < monthsAhead && uncoveredSeries.size > 0; m++) {
      const planMonth = ((now.getMonth() + m) % 12) + 1;
      const planYear =
        now.getFullYear() + Math.floor((now.getMonth() + m) / 12);

      let monthCost = 0;
      const monthPlatforms: (PlatformScore & { coveredSeries: typeof scoredPlatforms[0]["seriesAvailable"] })[] = [];

      // Always include always-on platforms first
      for (const aop of alwaysOnPlatforms) {
        const covered = aop.seriesAvailable.filter((s) =>
          uncoveredSeries.has(s.seriesId)
        );
        if (covered.length > 0) {
          covered.forEach((s) => uncoveredSeries.delete(s.seriesId));
          monthPlatforms.push({ ...aop, coveredSeries: covered });
          if (!aop.isFree) monthCost += aop.monthlyPrice;
        }
      }

      // Then add free platforms
      const freePlatforms = scoredPlatforms
        .filter(
          (p) =>
            p.isFree &&
            !p.isActiveSub &&
            !alwaysOnSlugs.includes(p.slug) &&
            p.seriesAvailable.some((s) => uncoveredSeries.has(s.seriesId))
        )
        .map((p) => {
          const covered = p.seriesAvailable.filter((s) =>
            uncoveredSeries.has(s.seriesId)
          );
          covered.forEach((s) => uncoveredSeries.delete(s.seriesId));
          return { ...p, coveredSeries: covered };
        });

      // Find the best paid platform within remaining budget (exclude active subs)
      let bestPlatform: PlatformScore | null = null;
      let bestCoverage = 0;
      let bestRatio = -1;

      for (const platform of scoredPlatforms) {
        if (platform.isFree || platform.isActiveSub || alwaysOnSlugs.includes(platform.slug)) continue;

        // Budget constraint
        if (monthCost + platform.monthlyPrice > monthlyBudget && monthlyBudget > 0) continue;

        const coverage = platform.seriesAvailable.filter((s) =>
          uncoveredSeries.has(s.seriesId)
        ).length;

        if (coverage === 0) continue;

        const ratio = platform.monthlyPrice > 0
          ? coverage / platform.monthlyPrice
          : coverage * 100;

        if (
          coverage > bestCoverage ||
          (coverage === bestCoverage && ratio > bestRatio)
        ) {
          bestPlatform = platform;
          bestCoverage = coverage;
          bestRatio = ratio;
        }
      }

      // If no best platform found and no always-on covered anything, break
      if (!bestPlatform && monthPlatforms.length === 0 && freePlatforms.length === 0) break;

      let mainPlatformEntry;

      if (bestPlatform) {
        const coveredThisMonth = bestPlatform.seriesAvailable.filter((s) =>
          uncoveredSeries.has(s.seriesId)
        );
        coveredThisMonth.forEach((s) => uncoveredSeries.delete(s.seriesId));
        monthCost += bestPlatform.isFree ? 0 : bestPlatform.monthlyPrice;

        mainPlatformEntry = {
          ...bestPlatform,
          coveredSeries: coveredThisMonth,
        };
      } else if (monthPlatforms.length > 0) {
        // Use the always-on platform with most coverage as main
        mainPlatformEntry = monthPlatforms[0];
      } else {
        // Only free platforms
        mainPlatformEntry = freePlatforms[0];
      }

      if (!mainPlatformEntry) break;

      // Separate always-on from main if main is not already always-on
      const alwaysOnForMonth = monthPlatforms.filter(
        (p) => p.platformId !== mainPlatformEntry!.platformId
      );

      plans.push({
        month: planMonth,
        year: planYear,
        label: new Date(planYear, planMonth - 1).toLocaleDateString("it-IT", {
          month: "long",
          year: "numeric",
        }),
        mainPlatform: mainPlatformEntry,
        alwaysOnPlatforms: alwaysOnForMonth,
        freePlatforms: freePlatforms.filter(
          (p) => p.platformId !== mainPlatformEntry!.platformId
        ),
        estimatedCost: monthCost,
        seriesCovered:
          mainPlatformEntry.coveredSeries.length +
          freePlatforms.reduce((s, p) => s + p.coveredSeries.length, 0) +
          alwaysOnForMonth.reduce((s, p) => s + p.coveredSeries.length, 0),
        withinBudget: monthlyBudget === 0 || monthCost <= monthlyBudget,
      });
    }

    // 7. Calculate savings (exclude active subs — user already pays for those)
    const totalRotatablePlatforms = scoredPlatforms
      .filter((p) => !p.isFree && !p.isActiveSub && p.seriesAvailable.length > 0)
      .reduce((sum, p) => sum + p.monthlyPrice, 0);

    const rotationMonthlyCost =
      plans.reduce((sum, p) => sum + p.estimatedCost, 0) / Math.max(plans.length, 1);

    const activeSubsCost = activeSubPlatforms.reduce(
      (sum, p) => sum + (p.isFree ? 0 : p.monthlyPrice), 0
    );

    return NextResponse.json({
      plans,
      activeSubscriptions: activeSubCoverage.map((a) => ({
        name: a.name,
        slug: a.slug,
        color: a.color,
        monthlyPrice: a.monthlyPrice,
        seriesCovered: a.coveredSeries.length,
        coveredSeries: a.coveredSeries,
      })),
      summary: {
        monthlyBudget,
        alwaysOnCost,
        activeSubsCost,
        totalPlatformsCost: totalRotatablePlatforms,
        rotationMonthlyCost: Math.round(rotationMonthlyCost * 100) / 100,
        monthlySavings:
          Math.round((totalRotatablePlatforms - rotationMonthlyCost) * 100) / 100,
        watchlistTotal: watchlistItems.length,
        seriesCoveredByActiveSubs: activeSubCoverage.reduce(
          (s, a) => s + a.coveredSeries.length, 0
        ),
        platformsNeeded: new Set(plans.map((p) => p.mainPlatform.platformId))
          .size,
        alwaysOnPlatforms: alwaysOnSlugs,
        activeSubscriptions: activeSubSlugs,
      },
      scoredPlatforms,
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
