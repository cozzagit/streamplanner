"use client";

import { useState, useEffect, useRef } from "react";
import { Search, X } from "lucide-react";
import { SeriesGrid } from "@/components/series-grid";
import type { TMDBSeries } from "@/lib/tmdb";

export default function CercaPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<TMDBSeries[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [watchlistIds, setWatchlistIds] = useState<Set<number>>(new Set());
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load watchlist IDs
  useEffect(() => {
    fetch("/api/watchlist")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setWatchlistIds(
            new Set(data.map((d: { series: { tmdbId: number } }) => d.series.tmdbId))
          );
        }
      })
      .catch(() => {});
  }, []);

  // Auto-focus
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Debounced search with abort support
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!query.trim()) {
      setResults([]);
      setSearched(false);
      return;
    }

    const controller = new AbortController();

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      setSearched(true);
      try {
        const res = await fetch(
          `/api/tmdb/search?q=${encodeURIComponent(query)}`,
          { signal: controller.signal }
        );
        const data = await res.json();
        setResults(data.results || []);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      controller.abort();
    };
  }, [query]);

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Cerca Serie TV</h1>
        <p className="text-text-secondary mt-1">
          Cerca qualsiasi serie e scopri su quale piattaforma trovarla
        </p>
      </div>

      {/* Search bar */}
      <div className="relative max-w-2xl">
        <Search
          size={20}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary"
        />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cerca una serie TV..."
          className="w-full pl-12 pr-12 py-3 rounded-xl bg-bg-card border border-border text-text-primary placeholder-text-secondary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent text-lg"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary"
          >
            <X size={20} />
          </button>
        )}
      </div>

      {/* Results */}
      {!searched && !loading && (
        <div className="text-center py-16">
          <Search size={48} className="mx-auto text-text-secondary/30 mb-4" />
          <p className="text-text-secondary">
            Inizia a scrivere per cercare serie TV
          </p>
        </div>
      )}

      <SeriesGrid
        series={results}
        watchlistIds={watchlistIds}
        onToggleWatchlist={toggleWatchlist}
        loading={loading}
      />

      {searched && !loading && results.length === 0 && query.trim() && (
        <div className="text-center py-16">
          <p className="text-text-secondary text-lg">
            Nessun risultato per &quot;{query}&quot;
          </p>
        </div>
      )}
    </div>
  );
}
