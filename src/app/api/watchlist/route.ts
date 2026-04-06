import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { watchlist, series, seriesPlatforms, platforms } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { getSeriesDetail, getItalyProviders } from "@/lib/tmdb";
import { getSessionUser, unauthorized } from "@/lib/get-user";

// GET — lista watchlist con dettagli serie e piattaforme
export async function GET() {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  try {
    const items = await db
      .select()
      .from(watchlist)
      .innerJoin(series, eq(watchlist.seriesId, series.id))
      .where(eq(watchlist.userId, user.id))
      .orderBy(desc(watchlist.addedAt));

    const result = await Promise.all(
      items.map(async (item) => {
        const platformLinks = await db
          .select({
            platformName: platforms.name,
            platformSlug: platforms.slug,
            platformColor: platforms.color,
            tmdbProviderId: platforms.tmdbProviderId,
            logoPath: platforms.logoPath,
          })
          .from(seriesPlatforms)
          .innerJoin(platforms, eq(seriesPlatforms.platformId, platforms.id))
          .where(eq(seriesPlatforms.seriesId, item.series.id));

        return {
          ...item.watchlist,
          series: item.series,
          platforms: platformLinks,
        };
      })
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("Watchlist GET error:", error);
    return NextResponse.json(
      { error: "Errore nel recupero watchlist" },
      { status: 500 }
    );
  }
}

// POST — aggiungi serie alla watchlist
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  try {
    const body = await req.json();
    const { tmdbId, priority = "medium" } = body;

    if (!tmdbId) {
      return NextResponse.json({ error: "tmdbId richiesto" }, { status: 400 });
    }

    const detail = await getSeriesDetail(tmdbId);
    const italyProviders = getItalyProviders(detail);
    const avgRunTime = detail.episode_run_time?.length
      ? Math.round(detail.episode_run_time.reduce((a, b) => a + b, 0) / detail.episode_run_time.length)
      : null;

    // Upsert serie
    const [seriesRecord] = await db
      .insert(series)
      .values({
        tmdbId: detail.id,
        name: detail.name,
        originalName: detail.original_name,
        overview: detail.overview,
        posterPath: detail.poster_path,
        backdropPath: detail.backdrop_path,
        firstAirDate: detail.first_air_date,
        lastAirDate: detail.last_air_date,
        status: detail.status,
        voteAverage: detail.vote_average,
        voteCount: detail.vote_count,
        popularity: detail.popularity,
        numberOfSeasons: detail.number_of_seasons,
        numberOfEpisodes: detail.number_of_episodes,
        episodeRunTime: avgRunTime,
        genres: JSON.stringify(detail.genres?.map((g) => g.name) || []),
        networks: JSON.stringify(detail.networks?.map((n) => n.name) || []),
        lastSyncedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: series.tmdbId,
        set: {
          name: detail.name,
          overview: detail.overview,
          posterPath: detail.poster_path,
          backdropPath: detail.backdrop_path,
          status: detail.status,
          voteAverage: detail.vote_average,
          numberOfSeasons: detail.number_of_seasons,
          numberOfEpisodes: detail.number_of_episodes,
          episodeRunTime: avgRunTime,
          lastSyncedAt: new Date(),
          updatedAt: new Date(),
        },
      })
      .returning();

    // Sync piattaforme Italia
    if (italyProviders) {
      const allProviders = [
        ...(italyProviders.flatrate || []).map((p) => ({ ...p, type: "flatrate" })),
        ...(italyProviders.free || []).map((p) => ({ ...p, type: "free" })),
        ...(italyProviders.ads || []).map((p) => ({ ...p, type: "ads" })),
      ];

      for (const provider of allProviders) {
        const [platform] = await db
          .select()
          .from(platforms)
          .where(eq(platforms.tmdbProviderId, provider.provider_id))
          .limit(1);

        if (platform) {
          await db
            .insert(seriesPlatforms)
            .values({
              seriesId: seriesRecord.id,
              platformId: platform.id,
              monetizationType: provider.type,
            })
            .onConflictDoNothing();
        }
      }
    }

    // Add to watchlist for this user
    const [watchlistItem] = await db
      .insert(watchlist)
      .values({
        userId: user.id,
        seriesId: seriesRecord.id,
        priority: priority as "low" | "medium" | "high",
      })
      .onConflictDoNothing()
      .returning();

    return NextResponse.json(
      { success: true, item: watchlistItem, series: seriesRecord },
      { status: 201 }
    );
  } catch (error) {
    console.error("Watchlist POST error:", error);
    return NextResponse.json(
      { error: "Errore nell'aggiunta alla watchlist" },
      { status: 500 }
    );
  }
}

// DELETE — rimuovi dalla watchlist
export async function DELETE(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  try {
    const { tmdbId } = await req.json();

    if (!tmdbId) {
      return NextResponse.json({ error: "tmdbId richiesto" }, { status: 400 });
    }

    const [seriesRecord] = await db
      .select()
      .from(series)
      .where(eq(series.tmdbId, tmdbId))
      .limit(1);

    if (seriesRecord) {
      await db
        .delete(watchlist)
        .where(
          and(
            eq(watchlist.seriesId, seriesRecord.id),
            eq(watchlist.userId, user.id)
          )
        );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Watchlist DELETE error:", error);
    return NextResponse.json(
      { error: "Errore nella rimozione" },
      { status: 500 }
    );
  }
}
