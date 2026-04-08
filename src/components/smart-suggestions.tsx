"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Lightbulb, Plus, Loader2, Star, ChevronDown, ChevronUp, Clock } from "lucide-react";
import { imageUrl } from "@/lib/tmdb";

interface Suggestion {
  platform: { name: string; slug: string; color: string; tmdbId: number };
  reason: string;
  freeHours: number;
  series: {
    id: number;
    name: string;
    posterPath: string | null;
    voteAverage: number;
    overview: string;
  }[];
}

interface SuggestionsData {
  suggestions: Suggestion[];
  stats: {
    monthlyHours: number;
    totalPlannedHours: number;
    totalPlannedMonths: number;
    watchlistSize: number;
  };
}

export function SmartSuggestions() {
  const [data, setData] = useState<SuggestionsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(true);
  const [adding, setAdding] = useState<number | null>(null);
  const [added, setAdded] = useState<Set<number>>(new Set());

  useEffect(() => {
    fetch(`/api/suggestions?_t=${Date.now()}`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  const addToWatchlist = async (tmdbId: number) => {
    setAdding(tmdbId);
    try {
      await fetch("/api/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tmdbId }),
      });
      setAdded((prev) => new Set(prev).add(tmdbId));
    } finally {
      setAdding(null);
    }
  };

  if (loading) return null;
  if (!data || data.suggestions.length === 0) return null;

  const { stats } = data;

  return (
    <div className="rounded-xl border border-accent/30 bg-accent/5 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 p-4 text-left"
      >
        <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center flex-shrink-0">
          <Lightbulb size={16} className="text-accent-light" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-text-primary">
            Suggerimenti per riempire il calendario
          </p>
          <p className="text-[11px] text-text-secondary">
            {stats.totalPlannedHours}h pianificate · {stats.monthlyHours}h/mese disponibili
            {stats.totalPlannedMonths <= 1 && stats.watchlistSize > 0 && (
              <span className="text-warning"> · Meno di un mese di contenuti!</span>
            )}
            {stats.watchlistSize === 0 && (
              <span className="text-warning"> · Watchlist vuota!</span>
            )}
          </p>
        </div>
        <span className="text-xs px-2 py-1 rounded-full bg-accent/20 text-accent-light font-medium">
          {data.suggestions.reduce((a, s) => a + s.series.length, 0)} serie consigliate
        </span>
        {expanded ? <ChevronUp size={16} className="text-text-secondary" /> : <ChevronDown size={16} className="text-text-secondary" />}
      </button>

      {/* Content */}
      {expanded && (
        <div className="px-4 pb-4 space-y-4">
          {data.suggestions.map((suggestion) => (
            <div key={suggestion.platform.slug}>
              {/* Platform header */}
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
                  style={{ backgroundColor: suggestion.platform.color }}
                >
                  {suggestion.platform.name.charAt(0)}
                </div>
                <p className="text-xs text-text-secondary">{suggestion.reason}</p>
              </div>

              {/* Series row */}
              <div className="flex gap-2 overflow-x-auto pb-1 carousel-scroll">
                {suggestion.series.map((s) => {
                  const isAdded = added.has(s.id);
                  const isAdding = adding === s.id;
                  return (
                    <div
                      key={s.id}
                      className="flex-shrink-0 w-28 group"
                    >
                      <div className="relative aspect-[2/3] rounded-lg overflow-hidden mb-1">
                        <Link href={`/serie/${s.id}`}>
                          <Image
                            src={imageUrl(s.posterPath, "w185")}
                            alt={s.name}
                            fill
                            className="object-cover"
                            sizes="112px"
                          />
                        </Link>
                        {/* Rating */}
                        <div className="absolute top-1 left-1 flex items-center gap-0.5 bg-black/70 rounded-full px-1.5 py-0.5 text-[9px]">
                          <Star size={8} className="text-warning fill-warning" />
                          {s.voteAverage?.toFixed(1)}
                        </div>
                        {/* Add button */}
                        <button
                          onClick={() => !isAdded && addToWatchlist(s.id)}
                          disabled={isAdded || isAdding}
                          className={`absolute bottom-1 right-1 w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                            isAdded
                              ? "bg-success text-white"
                              : "bg-accent/90 text-white opacity-0 group-hover:opacity-100"
                          }`}
                        >
                          {isAdding ? (
                            <Loader2 size={10} className="animate-spin" />
                          ) : isAdded ? (
                            <span className="text-[10px]">&#10003;</span>
                          ) : (
                            <Plus size={10} />
                          )}
                        </button>
                      </div>
                      <Link href={`/serie/${s.id}`}>
                        <p className="text-[10px] text-text-primary truncate hover:text-accent-light transition-colors">
                          {s.name}
                        </p>
                      </Link>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
