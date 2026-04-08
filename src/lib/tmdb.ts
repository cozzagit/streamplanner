const TMDB_BASE = process.env.TMDB_BASE_URL || "https://api.themoviedb.org/3";
const TMDB_KEY = process.env.TMDB_API_KEY || "";
const WATCH_REGION = "IT";
const LANGUAGE = "it-IT";

interface TMDBResponse<T> {
  page: number;
  results: T[];
  total_pages: number;
  total_results: number;
}

export interface TMDBSeries {
  id: number;
  name: string;
  original_name: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  first_air_date: string;
  vote_average: number;
  vote_count: number;
  popularity: number;
  genre_ids: number[];
}

export interface TMDBSeriesDetail {
  id: number;
  name: string;
  original_name: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  first_air_date: string;
  last_air_date: string;
  status: string;
  vote_average: number;
  vote_count: number;
  popularity: number;
  number_of_seasons: number;
  number_of_episodes: number;
  episode_run_time: number[];
  genres: { id: number; name: string }[];
  networks: { id: number; name: string; logo_path: string }[];
  seasons: TMDBSeason[];
  "watch/providers"?: {
    results: Record<string, TMDBWatchProviderCountry>;
  };
  videos?: {
    results: TMDBVideo[];
  };
}

export interface TMDBSeason {
  id: number;
  season_number: number;
  name: string;
  episode_count: number;
  air_date: string;
  overview: string;
  poster_path: string | null;
}

export interface TMDBEpisode {
  id: number;
  name: string;
  overview: string;
  season_number: number;
  episode_number: number;
  air_date: string;
  still_path: string | null;
  vote_average: number;
}

export interface TMDBWatchProvider {
  provider_id: number;
  provider_name: string;
  logo_path: string;
  display_priority: number;
}

export interface TMDBWatchProviderCountry {
  link: string;
  flatrate?: TMDBWatchProvider[];
  free?: TMDBWatchProvider[];
  ads?: TMDBWatchProvider[];
  rent?: TMDBWatchProvider[];
  buy?: TMDBWatchProvider[];
}

export interface TMDBGenre {
  id: number;
  name: string;
}

export interface TMDBVideo {
  id: string;
  key: string;
  name: string;
  site: string;
  type: string;
  official: boolean;
  published_at: string;
}

// ─── Movie Interfaces ───────────────────────────────────────

export interface TMDBMovie {
  id: number;
  title: string;
  original_title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  vote_average: number;
  vote_count: number;
  popularity: number;
  genre_ids: number[];
}

export interface TMDBMovieDetail {
  id: number;
  title: string;
  original_title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  status: string;
  runtime: number | null;
  vote_average: number;
  vote_count: number;
  popularity: number;
  genres: { id: number; name: string }[];
  production_companies: { id: number; name: string; logo_path: string | null }[];
  "watch/providers"?: {
    results: Record<string, TMDBWatchProviderCountry>;
  };
  videos?: {
    results: TMDBVideo[];
  };
  credits?: {
    cast: { id: number; name: string; character: string; profile_path: string | null; order: number }[];
    crew: { id: number; name: string; job: string; department: string; profile_path: string | null }[];
  };
}

/** Unified media item for cards/grids — normalizes movie + series differences */
export interface TMDBMediaItem {
  id: number;
  mediaType: "movie" | "tv";
  title: string;
  originalTitle: string;
  overview: string;
  posterPath: string | null;
  backdropPath: string | null;
  date: string;
  voteAverage: number;
  voteCount: number;
  popularity: number;
  genreIds: number[];
}

export function normalizeToMediaItem(item: TMDBSeries | TMDBMovie, mediaType: "movie" | "tv"): TMDBMediaItem {
  if (mediaType === "movie") {
    const m = item as TMDBMovie;
    return {
      id: m.id, mediaType: "movie", title: m.title, originalTitle: m.original_title,
      overview: m.overview, posterPath: m.poster_path, backdropPath: m.backdrop_path,
      date: m.release_date, voteAverage: m.vote_average, voteCount: m.vote_count,
      popularity: m.popularity, genreIds: m.genre_ids || [],
    };
  }
  const s = item as TMDBSeries;
  return {
    id: s.id, mediaType: "tv", title: s.name, originalTitle: s.original_name,
    overview: s.overview, posterPath: s.poster_path, backdropPath: s.backdrop_path,
    date: s.first_air_date, voteAverage: s.vote_average, voteCount: s.vote_count,
    popularity: s.popularity, genreIds: s.genre_ids || [],
  };
}

// ─── Helpers ─────────────────────────────────────────────────

async function tmdbFetch<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(`${TMDB_BASE}${endpoint}`);
  url.searchParams.set("api_key", TMDB_KEY);
  url.searchParams.set("language", LANGUAGE);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch(url.toString(), {
      next: { revalidate: 3600 },
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new Error(`TMDB API error: ${res.status} ${res.statusText} — ${endpoint}`);
    }
    return res.json();
  } finally {
    clearTimeout(timeout);
  }
}

// ─── Public API ──────────────────────────────────────────────

/** Trending TV series this week */
export async function getTrending(
  timeWindow: "day" | "week" = "week",
  page = 1
): Promise<TMDBResponse<TMDBSeries>> {
  return tmdbFetch(`/trending/tv/${timeWindow}`, { page: String(page) });
}

/** Discover TV series, optionally filtered by provider */
export async function discoverByProvider(
  providerId: number | null,
  options: {
    page?: number;
    sortBy?: string;
    minVote?: number;
    minVoteCount?: number;
    dateFrom?: string;
    dateTo?: string;
    withoutGenres?: string;
  } = {}
): Promise<TMDBResponse<TMDBSeries>> {
  const params: Record<string, string> = {
    sort_by: options.sortBy || "popularity.desc",
    page: String(options.page || 1),
  };
  if (providerId) {
    params.with_watch_providers = String(providerId);
    params.watch_region = WATCH_REGION;
    params.with_watch_monetization_types = "flatrate|free|ads";
  }
  if (options.minVote) params["vote_average.gte"] = String(options.minVote);
  if (options.minVoteCount) params["vote_count.gte"] = String(options.minVoteCount);
  if (options.dateFrom) params["first_air_date.gte"] = options.dateFrom;
  if (options.dateTo) params["first_air_date.lte"] = options.dateTo;
  if (options.withoutGenres) params.without_genres = options.withoutGenres;

  return tmdbFetch("/discover/tv", params);
}

/** Search TV series by name */
export async function searchSeries(
  query: string,
  page = 1
): Promise<TMDBResponse<TMDBSeries>> {
  return tmdbFetch("/search/tv", { query, page: String(page) });
}

/** Get full details + watch providers for a series */
export async function getSeriesDetail(tmdbId: number): Promise<TMDBSeriesDetail> {
  return tmdbFetch(`/tv/${tmdbId}`, {
    append_to_response: "watch/providers,videos",
  });
}

/** Get season episodes */
export async function getSeasonEpisodes(
  tmdbId: number,
  seasonNumber: number
): Promise<{ episodes: TMDBEpisode[] }> {
  return tmdbFetch(`/tv/${tmdbId}/season/${seasonNumber}`);
}

/** Get available watch providers for Italy */
export async function getItalianProviders(): Promise<TMDBWatchProvider[]> {
  const data = await tmdbFetch<{ results: TMDBWatchProvider[] }>(
    "/watch/providers/tv",
    { watch_region: WATCH_REGION }
  );
  return data.results;
}

/** Get all TV genres */
export async function getGenres(): Promise<TMDBGenre[]> {
  const data = await tmdbFetch<{ genres: TMDBGenre[] }>("/genre/tv/list");
  return data.genres;
}

/** Get Italy watch providers for a specific series */
export function getItalyProviders(
  detail: TMDBSeriesDetail
): TMDBWatchProviderCountry | null {
  return detail["watch/providers"]?.results?.IT || null;
}

// ─── Movie API ──────────────────────────────────────────────

/** Trending movies */
export async function getTrendingMovies(
  timeWindow: "day" | "week" = "week",
  page = 1
): Promise<TMDBResponse<TMDBMovie>> {
  return tmdbFetch(`/trending/movie/${timeWindow}`, { page: String(page) });
}

/** Discover movies by provider */
export async function discoverMovies(
  providerId: number | null,
  options: {
    page?: number;
    sortBy?: string;
    minVote?: number;
    minVoteCount?: number;
    dateFrom?: string;
    dateTo?: string;
    withoutGenres?: string;
  } = {}
): Promise<TMDBResponse<TMDBMovie>> {
  const params: Record<string, string> = {
    sort_by: options.sortBy || "popularity.desc",
    page: String(options.page || 1),
  };
  if (providerId) {
    params.with_watch_providers = String(providerId);
    params.watch_region = WATCH_REGION;
    params.with_watch_monetization_types = "flatrate|free|ads";
  }
  if (options.minVote) params["vote_average.gte"] = String(options.minVote);
  if (options.minVoteCount) params["vote_count.gte"] = String(options.minVoteCount);
  if (options.dateFrom) params["primary_release_date.gte"] = options.dateFrom;
  if (options.dateTo) params["primary_release_date.lte"] = options.dateTo;
  if (options.withoutGenres) params.without_genres = options.withoutGenres;

  return tmdbFetch("/discover/movie", params);
}

/** Search movies */
export async function searchMovies(
  query: string,
  page = 1
): Promise<TMDBResponse<TMDBMovie>> {
  return tmdbFetch("/search/movie", { query, page: String(page) });
}

/** Get full movie details + watch providers + videos + credits */
export async function getMovieDetail(tmdbId: number): Promise<TMDBMovieDetail> {
  return tmdbFetch(`/movie/${tmdbId}`, {
    append_to_response: "watch/providers,videos,credits",
  });
}

/** Build image URL */
export function imageUrl(path: string | null, size: "w92" | "w154" | "w185" | "w342" | "w500" | "w780" | "original" = "w342"): string {
  if (!path) return "/placeholder-poster.svg";
  return `https://image.tmdb.org/t/p/${size}${path}`;
}

// ─── Genre Map ───────────────────────────────────────────────
export const GENRE_MAP: Record<number, string> = {
  10759: "Action & Adventure",
  16: "Animazione",
  35: "Commedia",
  80: "Crime",
  99: "Documentario",
  18: "Dramma",
  10751: "Family",
  10762: "Kids",
  9648: "Mistero",
  10763: "News",
  10764: "Reality",
  10765: "Sci-Fi & Fantasy",
  10766: "Soap",
  10767: "Talk",
  10768: "War & Politics",
  37: "Western",
};

export const MOVIE_GENRE_MAP: Record<number, string> = {
  28: "Azione",
  12: "Avventura",
  16: "Animazione",
  35: "Commedia",
  80: "Crime",
  99: "Documentario",
  18: "Dramma",
  10751: "Family",
  14: "Fantasy",
  36: "Storia",
  27: "Horror",
  10402: "Musica",
  9648: "Mistero",
  10749: "Romantico",
  878: "Fantascienza",
  53: "Thriller",
  10752: "Guerra",
  37: "Western",
};

/** Get the right genre map for a media type */
export function getGenreMap(mediaType: "movie" | "tv"): Record<number, string> {
  return mediaType === "movie" ? MOVIE_GENRE_MAP : GENRE_MAP;
}
