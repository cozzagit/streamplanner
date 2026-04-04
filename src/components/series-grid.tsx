"use client";

import { SeriesCard } from "./series-card";
import type { TMDBSeries } from "@/lib/tmdb";

interface SeriesGridProps {
  series: TMDBSeries[];
  watchlistIds?: Set<number>;
  onToggleWatchlist?: (tmdbId: number) => void;
  loading?: boolean;
}

export function SeriesGrid({
  series,
  watchlistIds,
  onToggleWatchlist,
  loading,
}: SeriesGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} className="rounded-xl overflow-hidden">
            <div className="skeleton aspect-[2/3]" />
            <div className="p-3 space-y-2">
              <div className="skeleton h-4 w-3/4" />
              <div className="skeleton h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (series.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-text-secondary text-lg">
          Nessuna serie trovata
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {series.map((s) => (
        <SeriesCard
          key={s.id}
          series={s}
          inWatchlist={watchlistIds?.has(s.id)}
          onToggleWatchlist={onToggleWatchlist}
        />
      ))}
    </div>
  );
}
