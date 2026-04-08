"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { PlatformFilter } from "@/components/platform-filter";
import { GenreFilter } from "@/components/genre-filter";
import { SeriesGrid } from "@/components/series-grid";
import { TrendingUp, Sparkles, Star } from "lucide-react";
import type { TMDBSeries } from "@/lib/tmdb";
import { getPlatformByTmdbId } from "@/lib/platforms";

type Tab = "trending" | "new" | "top";

export default function EsploraPage() {
  const [tab, setTab] = useState<Tab>("trending");
  const [platform, setPlatform] = useState<number | null>(null);
  const [seriesList, setSeriesList] = useState<TMDBSeries[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [watchlistIds, setWatchlistIds] = useState<Set<number>>(new Set());
  const [excludedGenres, setExcludedGenres] = useState<Set<number>>(new Set());
  const genresLoaded = useRef(false);

  // Load excluded genres + watchlist on mount
  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        if (data.excluded_genres) {
          try {
            const ids: number[] = JSON.parse(data.excluded_genres);
            setExcludedGenres(new Set(ids));
          } catch { /* ignore */ }
        }
        genresLoaded.current = true;
      })
      .catch(() => { genresLoaded.current = true; });

    fetch("/api/watchlist")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setWatchlistIds(new Set(data.map((d: { series: { tmdbId: number } }) => d.series.tmdbId)));
        }
      })
      .catch(() => {});
  }, []);

  // Save excluded genres when they change
  const handleExcludedGenresChange = (genres: Set<number>) => {
    setExcludedGenres(genres);
    setPage(1);
    // Save to user settings (non-blocking)
    fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ excluded_genres: JSON.stringify([...genres]) }),
    }).catch(() => {});
  };

  // Fetch series
  const fetchSeries = useCallback(async () => {
    setLoading(true);
    try {
      let url: string;
      const withoutGenres = excludedGenres.size > 0 ? [...excludedGenres].join(",") : "";

      // When genres are excluded or platform is set, always use discover
      // (trending endpoint doesn't support without_genres)
      if (tab === "trending" && !platform && !withoutGenres) {
        url = `/api/tmdb/trending?page=${page}&window=week`;
      } else {
        const params = new URLSearchParams({ page: String(page) });

        if (platform) {
          params.set("provider", String(platform));
        }
        if (withoutGenres) {
          params.set("withoutGenres", withoutGenres);
        }

        if (tab === "trending") {
          params.set("sort", "popularity.desc");
        } else if (tab === "new") {
          params.set("sort", "first_air_date.desc");
          const d = new Date();
          d.setMonth(d.getMonth() - 3);
          params.set("from", d.toISOString().split("T")[0]);
          params.set("minVoteCount", "5");
        } else if (tab === "top") {
          params.set("sort", "vote_average.desc");
          params.set("minVote", "7");
          params.set("minVoteCount", "200");
        }

        url = `/api/tmdb/discover?${params}`;
      }

      const res = await fetch(url);
      const data = await res.json();
      setSeriesList(data.results || []);
      setTotalPages(data.total_pages || 1);
    } catch {
      setSeriesList([]);
    } finally {
      setLoading(false);
    }
  }, [tab, platform, page, excludedGenres]);

  useEffect(() => {
    setPage(1);
  }, [tab, platform, excludedGenres]);

  useEffect(() => {
    fetchSeries();
  }, [fetchSeries]);

  const toggleWatchlist = async (tmdbId: number) => {
    if (watchlistIds.has(tmdbId)) {
      await fetch("/api/watchlist", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tmdbId }),
      });
      setWatchlistIds((prev) => {
        const next = new Set(prev);
        next.delete(tmdbId);
        return next;
      });
    } else {
      await fetch("/api/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tmdbId }),
      });
      setWatchlistIds((prev) => new Set(prev).add(tmdbId));
    }
  };

  const TABS = [
    { key: "trending" as Tab, label: "Trending", icon: TrendingUp },
    { key: "new" as Tab, label: "Novita", icon: Sparkles },
    { key: "top" as Tab, label: "Top Rated", icon: Star },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Esplora</h1>
        <p className="text-text-secondary mt-1">
          Scopri le migliori serie TV disponibili sulle piattaforme streaming
        </p>
      </div>

      {/* Tabs */}
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
      <SeriesGrid
        series={seriesList}
        watchlistIds={watchlistIds}
        onToggleWatchlist={toggleWatchlist}
        loading={loading}
        platformDots={platform ? [getPlatformByTmdbId(platform)].filter(Boolean) as import("@/lib/platforms").PlatformConfig[] : undefined}
      />

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 pt-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="px-4 py-2 rounded-lg bg-bg-card border border-border text-sm disabled:opacity-40 hover:bg-bg-card-hover transition-colors"
          >
            Precedente
          </button>
          <span className="text-sm text-text-secondary">
            Pagina {page} di {Math.min(totalPages, 500)}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
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
