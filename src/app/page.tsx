"use client";

import { useState, useEffect, useCallback } from "react";
import { PlatformFilter } from "@/components/platform-filter";
import { SeriesGrid } from "@/components/series-grid";
import { TrendingUp, Sparkles, Clock } from "lucide-react";
import type { TMDBSeries } from "@/lib/tmdb";

type Tab = "trending" | "new" | "top";

export default function EsploraPage() {
  const [tab, setTab] = useState<Tab>("trending");
  const [platform, setPlatform] = useState<number | null>(null);
  const [seriesList, setSeriesList] = useState<TMDBSeries[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [watchlistIds, setWatchlistIds] = useState<Set<number>>(new Set());

  // Fetch watchlist IDs
  useEffect(() => {
    fetch("/api/watchlist")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setWatchlistIds(new Set(data.map((d: { series: { tmdbId: number } }) => d.series.tmdbId)));
        }
      })
      .catch(() => {});
  }, []);

  // Fetch series
  const fetchSeries = useCallback(async () => {
    setLoading(true);
    try {
      let url: string;
      if (platform) {
        const sortBy =
          tab === "trending"
            ? "popularity.desc"
            : tab === "new"
            ? "first_air_date.desc"
            : "vote_average.desc";
        const params = new URLSearchParams({
          provider: String(platform),
          page: String(page),
          sort: sortBy,
        });
        if (tab === "top") params.set("minVote", "7");
        if (tab === "new") {
          const d = new Date();
          d.setMonth(d.getMonth() - 3);
          params.set("from", d.toISOString().split("T")[0]);
        }
        url = `/api/tmdb/discover?${params}`;
      } else {
        url = `/api/tmdb/trending?page=${page}&window=${
          tab === "trending" ? "week" : "day"
        }`;
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
  }, [tab, platform, page]);

  useEffect(() => {
    setPage(1);
  }, [tab, platform]);

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
    { key: "top" as Tab, label: "Top Rated", icon: Clock },
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

      {/* Platform filter */}
      <PlatformFilter selected={platform} onChange={setPlatform} />

      {/* Grid */}
      <SeriesGrid
        series={seriesList}
        watchlistIds={watchlistIds}
        onToggleWatchlist={toggleWatchlist}
        loading={loading}
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
