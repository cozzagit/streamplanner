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
    append_to_response: "watch/providers",
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
