"use client";

import { useState, useEffect, useRef } from "react";
import { Search, X, Tv, Film } from "lucide-react";
import { MediaGrid } from "@/components/series-grid";
import { normalizeToMediaItem } from "@/lib/tmdb";
import type { TMDBSeries, TMDBMovie, TMDBMediaItem } from "@/lib/tmdb";

type MediaType = "tv" | "movie";

export default function CercaPage() {
  const [mediaType, setMediaType] = useState<MediaType>("tv");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<TMDBMediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [watchlistIds, setWatchlistIds] = useState<Set<string>>(new Set());
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/watchlist?type=series").then((r) => r.json()),
      fetch("/api/watchlist?type=movie").then((r) => r.json()),
    ]).then(([seriesData, movieData]) => {
      const ids = new Set<string>();
      if (Array.isArray(seriesData)) seriesData.forEach((d: { series: { tmdbId: number } }) => ids.add(`tv:${d.series.tmdbId}`));
      if (Array.isArray(movieData)) movieData.forEach((d: { movie: { tmdbId: number } }) => ids.add(`movie:${d.movie.tmdbId}`));
      setWatchlistIds(ids);
    }).catch(() => {});
  }, []);

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) { setResults([]); setSearched(false); return; }

    const controller = new AbortController();
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      setSearched(true);
      try {
        const endpoint = mediaType === "movie" ? "/api/tmdb/movies/search" : "/api/tmdb/search";
        const res = await fetch(`${endpoint}?q=${encodeURIComponent(query)}`, { signal: controller.signal });
        const data = await res.json();
        setResults(
          (data.results || []).map((item: TMDBSeries | TMDBMovie) => normalizeToMediaItem(item, mediaType))
        );
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setResults([]);
      } finally { setLoading(false); }
    }, 400);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); controller.abort(); };
  }, [query, mediaType]);

  const toggleWatchlist = async (tmdbId: number, type: "movie" | "tv") => {
    const key = `${type}:${tmdbId}`;
    if (watchlistIds.has(key)) {
      await fetch("/api/watchlist", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tmdbId, type }) });
      setWatchlistIds((prev) => { const next = new Set(prev); next.delete(key); return next; });
    } else {
      await fetch("/api/watchlist", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tmdbId, type }) });
      setWatchlistIds((prev) => new Set(prev).add(key));
    }
  };

  const isMovie = mediaType === "movie";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">
          Cerca {isMovie ? "Film" : "Serie TV"}
        </h1>
        <p className="text-text-secondary mt-1">
          Cerca e scopri su quale piattaforma {isMovie ? "trovarlo" : "trovarla"}
        </p>
      </div>

      {/* Media type selector */}
      <div className="flex gap-1 p-1 rounded-xl bg-bg-card border border-border w-fit">
        <button onClick={() => { setMediaType("tv"); setResults([]); setSearched(false); }}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            mediaType === "tv" ? "bg-accent text-white" : "text-text-secondary hover:text-text-primary"
          }`}>
          <Tv size={15} /> Serie TV
        </button>
        <button onClick={() => { setMediaType("movie"); setResults([]); setSearched(false); }}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            mediaType === "movie" ? "bg-purple-500 text-white" : "text-text-secondary hover:text-text-primary"
          }`}>
          <Film size={15} /> Film
        </button>
      </div>

      {/* Search bar */}
      <div className="relative max-w-2xl">
        <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary" />
        <input
          ref={inputRef} type="text" value={query} onChange={(e) => setQuery(e.target.value)}
          placeholder={isMovie ? "Cerca un film..." : "Cerca una serie TV..."}
          className="w-full pl-12 pr-12 py-3 rounded-xl bg-bg-card border border-border text-text-primary placeholder-text-secondary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent text-lg"
        />
        {query && (
          <button onClick={() => setQuery("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary">
            <X size={20} />
          </button>
        )}
      </div>

      {!searched && !loading && (
        <div className="text-center py-16">
          <Search size={48} className="mx-auto text-text-secondary/30 mb-4" />
          <p className="text-text-secondary">Inizia a scrivere per cercare {isMovie ? "film" : "serie TV"}</p>
        </div>
      )}

      <div key={mediaType} className="fade-in">
        <MediaGrid items={results} watchlistIds={watchlistIds} onToggleWatchlist={toggleWatchlist} loading={loading} />
      </div>

      {searched && !loading && results.length === 0 && query.trim() && (
        <div className="text-center py-16">
          <p className="text-text-secondary text-lg">Nessun risultato per &quot;{query}&quot;</p>
        </div>
      )}
    </div>
  );
}
