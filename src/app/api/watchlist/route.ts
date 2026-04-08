import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  watchlist, series, seriesPlatforms,
  movieWatchlist, movies, moviePlatforms,
  platforms,
} from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { getSeriesDetail, getItalyProviders, getMovieDetail } from "@/lib/tmdb";
import { getSessionUser, unauthorized } from "@/lib/get-user";

export const dynamic = "force-dynamic";

// GET — lista watchlist con dettagli serie/film e piattaforme
export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  const type = req.nextUrl.searchParams.get("type"); // "series" | "movie" | null (both)

  try {
    const result: unknown[] = [];

    // Series watchlist
    if (!type || type === "series") {
      const items = await db
        .select()
        .from(watchlist)
        .innerJoin(series, eq(watchlist.seriesId, series.id))
        .where(eq(watchlist.userId, user.id))
        .orderBy(desc(watchlist.addedAt));

      const seriesResult = await Promise.all(
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
            mediaType: "tv" as const,
            series: item.series,
            platforms: platformLinks,
          };
        })
      );
      result.push(...seriesResult);
    }

    // Movie watchlist
    if (!type || type === "movie") {
      const items = await db
        .select()
        .from(movieWatchlist)
        .innerJoin(movies, eq(movieWatchlist.movieId, movies.id))
        .where(eq(movieWatchlist.userId, user.id))
        .orderBy(desc(movieWatchlist.addedAt));

      const movieResult = await Promise.all(
        items.map(async (item) => {
          const platformLinks = await db
            .select({
              platformName: platforms.name,
              platformSlug: platforms.slug,
              platformColor: platforms.color,
              tmdbProviderId: platforms.tmdbProviderId,
              logoPath: platforms.logoPath,
            })
            .from(moviePlatforms)
            .innerJoin(platforms, eq(moviePlatforms.platformId, platforms.id))
            .where(eq(moviePlatforms.movieId, item.movies.id));

          return {
            ...item.movie_watchlist,
            mediaType: "movie" as const,
            movie: item.movies,
            platforms: platformLinks,
          };
        })
      );
      result.push(...movieResult);
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Watchlist GET error:", error);
    return NextResponse.json({ error: "Errore nel recupero watchlist" }, { status: 500 });
  }
}

// POST — aggiungi serie o film alla watchlist
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  try {
    const body = await req.json();
    const { tmdbId, type = "series", priority = "medium" } = body;

    if (!tmdbId) {
      return NextResponse.json({ error: "tmdbId richiesto" }, { status: 400 });
    }

    if (type === "movie") {
      return await addMovie(user.id, tmdbId, priority);
    }
    return await addSeries(user.id, tmdbId, priority);
  } catch (error) {
    console.error("Watchlist POST error:", error);
    return NextResponse.json({ error: "Errore nell'aggiunta alla watchlist" }, { status: 500 });
  }
}

async function addSeries(userId: string, tmdbId: number, priority: string) {
  const detail = await getSeriesDetail(tmdbId);
  const italyProviders = getItalyProviders(detail);
  const avgRunTime = detail.episode_run_time?.length
    ? Math.round(detail.episode_run_time.reduce((a: number, b: number) => a + b, 0) / detail.episode_run_time.length)
    : null;
  const seasonsData = detail.seasons
    ?.filter((s) => s.season_number > 0)
    .map((s) => ({ season: s.season_number, episodes: s.episode_count, name: s.name })) || [];

  const [seriesRecord] = await db
    .insert(series)
    .values({
      tmdbId: detail.id, name: detail.name, originalName: detail.original_name,
      overview: detail.overview, posterPath: detail.poster_path, backdropPath: detail.backdrop_path,
      firstAirDate: detail.first_air_date, lastAirDate: detail.last_air_date, status: detail.status,
      voteAverage: detail.vote_average, voteCount: detail.vote_count, popularity: detail.popularity,
      numberOfSeasons: detail.number_of_seasons, numberOfEpisodes: detail.number_of_episodes,
      episodeRunTime: avgRunTime, seasonsData: JSON.stringify(seasonsData),
      genres: JSON.stringify(detail.genres?.map((g) => g.name) || []),
      networks: JSON.stringify(detail.networks?.map((n) => n.name) || []),
      lastSyncedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: series.tmdbId,
      set: {
        name: detail.name, overview: detail.overview, posterPath: detail.poster_path,
        backdropPath: detail.backdrop_path, status: detail.status, voteAverage: detail.vote_average,
        numberOfSeasons: detail.number_of_seasons, numberOfEpisodes: detail.number_of_episodes,
        episodeRunTime: avgRunTime, seasonsData: JSON.stringify(seasonsData),
        lastSyncedAt: new Date(), updatedAt: new Date(),
      },
    })
    .returning();

  await syncProviders(seriesRecord.id, italyProviders, "series");

  const [watchlistItem] = await db
    .insert(watchlist)
    .values({ userId, seriesId: seriesRecord.id, priority: priority as "low" | "medium" | "high" })
    .onConflictDoNothing()
    .returning();

  return NextResponse.json({ success: true, item: watchlistItem, series: seriesRecord }, { status: 201 });
}

async function addMovie(userId: string, tmdbId: number, priority: string) {
  const detail = await getMovieDetail(tmdbId);
  const italyProviders = detail["watch/providers"]?.results?.IT || null;

  const [movieRecord] = await db
    .insert(movies)
    .values({
      tmdbId: detail.id, title: detail.title, originalTitle: detail.original_title,
      overview: detail.overview, posterPath: detail.poster_path, backdropPath: detail.backdrop_path,
      releaseDate: detail.release_date, status: detail.status, runtime: detail.runtime,
      voteAverage: detail.vote_average, voteCount: detail.vote_count, popularity: detail.popularity,
      genres: JSON.stringify(detail.genres?.map((g) => g.name) || []),
      lastSyncedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: movies.tmdbId,
      set: {
        title: detail.title, overview: detail.overview, posterPath: detail.poster_path,
        backdropPath: detail.backdrop_path, status: detail.status, runtime: detail.runtime,
        voteAverage: detail.vote_average, genres: JSON.stringify(detail.genres?.map((g) => g.name) || []),
        lastSyncedAt: new Date(), updatedAt: new Date(),
      },
    })
    .returning();

  await syncProviders(movieRecord.id, italyProviders, "movie");

  const [watchlistItem] = await db
    .insert(movieWatchlist)
    .values({ userId, movieId: movieRecord.id, priority: priority as "low" | "medium" | "high" })
    .onConflictDoNothing()
    .returning();

  return NextResponse.json({ success: true, item: watchlistItem, movie: movieRecord }, { status: 201 });
}

async function syncProviders(
  contentId: string,
  italyProviders: { flatrate?: { provider_id: number }[]; free?: { provider_id: number }[]; ads?: { provider_id: number }[] } | null,
  contentType: "series" | "movie"
) {
  if (!italyProviders) return;

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
      if (contentType === "series") {
        await db.insert(seriesPlatforms)
          .values({ seriesId: contentId, platformId: platform.id, monetizationType: provider.type })
          .onConflictDoNothing();
      } else {
        await db.insert(moviePlatforms)
          .values({ movieId: contentId, platformId: platform.id, monetizationType: provider.type })
          .onConflictDoNothing();
      }
    }
  }
}

// DELETE — rimuovi dalla watchlist
export async function DELETE(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  try {
    const { tmdbId, type = "series" } = await req.json();

    if (!tmdbId) {
      return NextResponse.json({ error: "tmdbId richiesto" }, { status: 400 });
    }

    if (type === "movie") {
      const [movieRecord] = await db.select().from(movies).where(eq(movies.tmdbId, tmdbId)).limit(1);
      if (movieRecord) {
        await db.delete(movieWatchlist).where(
          and(eq(movieWatchlist.movieId, movieRecord.id), eq(movieWatchlist.userId, user.id))
        );
      }
    } else {
      const [seriesRecord] = await db.select().from(series).where(eq(series.tmdbId, tmdbId)).limit(1);
      if (seriesRecord) {
        await db.delete(watchlist).where(
          and(eq(watchlist.seriesId, seriesRecord.id), eq(watchlist.userId, user.id))
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Watchlist DELETE error:", error);
    return NextResponse.json({ error: "Errore nella rimozione" }, { status: 500 });
  }
}
