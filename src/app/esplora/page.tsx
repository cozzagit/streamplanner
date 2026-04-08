"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { PlatformFilter } from "@/components/platform-filter";
import { GenreFilter } from "@/components/genre-filter";
import { MediaGrid } from "@/components/series-grid";
import { TrendingUp, Sparkles, Star, Tv, Film } from "lucide-react";
import { normalizeToMediaItem } from "@/lib/tmdb";
import type { TMDBMediaItem, TMDBSeries, TMDBMovie } from "@/lib/tmdb";
import { getPlatformByTmdbId } from "@/lib/platforms";
import type { PlatformConfig } from "@/lib/platforms";

type Tab = "trending" | "new" | "top";
type MediaType = "tv" | "movie";

export default function EsploraPage() {
  const [mediaType, setMediaType] = useState<MediaType>("tv");
  const [tab, setTab] = useState<Tab>("trending");
  const [platform, setPlatform] = useState<number | null>(null);
  const [itemsList, setItemsList] = useState<TMDBMediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [watchlistIds, setWatchlistIds] = useState<Set<string>>(new Set());
  const [excludedGenres, setExcludedGenres] = useState<Set<number>>(new Set());
  const genresLoaded = useRef(false);

  // Load excluded genres + watchlist on mount
  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        if (data.excluded_genres) {
          try { setExcludedGenres(new Set(JSON.parse(data.excluded_genres) as number[])); } catch { /* */ }
        }
        genresLoaded.current = true;
      })
      .catch(() => { genresLoaded.current = true; });

    // Fetch both series and movie watchlist IDs
    Promise.all([
      fetch("/api/watchlist?type=series").then((r) => r.json()),
      fetch("/api/watchlist?type=movie").then((r) => r.json()),
    ]).then(([seriesData, movieData]) => {
      const ids = new Set<string>();
      if (Array.isArray(seriesData)) {
        seriesData.forEach((d: { series: { tmdbId: number } }) => ids.add(`tv:${d.series.tmdbId}`));
      }
      if (Array.isArray(movieData)) {
        movieData.forEach((d: { movie: { tmdbId: number } }) => ids.add(`movie:${d.movie.tmdbId}`));
      }
      setWatchlistIds(ids);
    }).catch(() => {});
  }, []);

  const handleExcludedGenresChange = (genres: Set<number>) => {
    setExcludedGenres(genres);
    setPage(1);
    fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ excluded_genres: JSON.stringify([...genres]) }),
    }).catch(() => {});
  };

  const fetchContent = useCallback(async () => {
    setLoading(true);
    try {
      const withoutGenres = excludedGenres.size > 0 ? [...excludedGenres].join(",") : "";
      const isMovie = mediaType === "movie";
      const apiBase = isMovie ? "/api/tmdb/movies" : "/api/tmdb";
      let url: string;

      if (tab === "trending" && !platform && !withoutGenres) {
        url = `${apiBase}/trending?page=${page}&window=week`;
      } else {
        const params = new URLSearchParams({ page: String(page) });
        if (platform) params.set("provider", String(platform));
        if (withoutGenres) params.set("withoutGenres", withoutGenres);

        if (tab === "trending") {
          params.set("sort", "popularity.desc");
        } else if (tab === "new") {
          params.set("sort", isMovie ? "primary_release_date.desc" : "first_air_date.desc");
          const d = new Date();
          d.setMonth(d.getMonth() - 3);
          params.set("from", d.toISOString().split("T")[0]);
          params.set("minVoteCount", "5");
        } else if (tab === "top") {
          params.set("sort", "vote_average.desc");
          params.set("minVote", "7");
          params.set("minVoteCount", "200");
        }

        url = `${apiBase}/discover?${params}`;
      }

      const res = await fetch(url);
      const data = await res.json();
      const results = (data.results || []).map((item: TMDBSeries | TMDBMovie) =>
        normalizeToMediaItem(item, mediaType)
      );

      setItemsList(results);
      setTotalPages(data.total_pages || 1);
    } catch {
      setItemsList([]);
    } finally {
      setLoading(false);
    }
  }, [mediaType, tab, platform, page, excludedGenres]);

  useEffect(() => {
    setPage(1);
  }, [mediaType, tab, platform, excludedGenres]);

  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  const toggleWatchlist = async (tmdbId: number, type: "movie" | "tv") => {
    const key = `${type}:${tmdbId}`;
    if (watchlistIds.has(key)) {
      await fetch("/api/watchlist", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tmdbId, type }),
      });
      setWatchlistIds((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    } else {
      await fetch("/api/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tmdbId, type }),
      });
      setWatchlistIds((prev) => new Set(prev).add(key));
    }
  };

  const TABS = [
    { key: "trending" as Tab, label: "Trending", icon: TrendingUp },
    { key: "new" as Tab, label: "Novità", icon: Sparkles },
    { key: "top" as Tab, label: "Top Rated", icon: Star },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Esplora</h1>
        <p className="text-text-secondary mt-1">
          Scopri le migliori {mediaType === "movie" ? "film" : "serie TV"} disponibili in streaming
        </p>
      </div>

      {/* Media type selector */}
      <div className="flex gap-1 p-1 rounded-xl bg-bg-card border border-border w-fit">
        <button
          onClick={() => setMediaType("tv")}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            mediaType === "tv"
              ? "bg-accent text-white"
              : "text-text-secondary hover:text-text-primary"
          }`}
        >
          <Tv size={15} />
          Serie TV
        </button>
        <button
          onClick={() => setMediaType("movie")}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            mediaType === "movie"
              ? "bg-purple-500 text-white"
              : "text-text-secondary hover:text-text-primary"
          }`}
        >
          <Film size={15} />
          Film
        </button>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-2">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === key
                ? "bg-accent text-white"
                : "bg-bg-card text-text-secondary hover:text-text-primary"
            }`}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <PlatformFilter selected={platform} onChange={setPlatform} />
      <GenreFilter excludedGenres={excludedGenres} onChange={handleExcludedGenresChange} />

      {/* Grid */}
      <div key={`${mediaType}-${tab}-${platform}-${page}`} className="fade-in">
        <MediaGrid
          items={itemsList}
          watchlistIds={watchlistIds}
          onToggleWatchlist={toggleWatchlist}
          loading={loading}
          platformDots={platform ? [getPlatformByTmdbId(platform)].filter(Boolean) as PlatformConfig[] : undefined}
        />
      </div>

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 pt-4">
          <button
            onClick={() => { setPage((p) => Math.max(1, p - 1)); window.scrollTo({ top: 0, behavior: "smooth" }); }}
            disabled={page <= 1}
            className="px-4 py-2 rounded-lg bg-bg-card border border-border text-sm disabled:opacity-40 hover:bg-bg-card-hover transition-colors"
          >
            Precedente
          </button>
          <span className="text-sm text-text-secondary">
            Pagina {page} di {Math.min(totalPages, 500)}
          </span>
          <button
            onClick={() => { setPage((p) => Math.min(totalPages, p + 1)); window.scrollTo({ top: 0, behavior: "smooth" }); }}
            disabled={page >= totalPages}
            className="px-4 py-2 rounded-lg bg-bg-card border border-border text-sm disabled:opacity-40 hover:bg-bg-card-hover transition-colors"
          >
            Successiva
          </button>
        </div>
      )}
    </div>
  );
}
