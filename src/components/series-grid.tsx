"use client";

import Link from "next/link";
import { Tv } from "lucide-react";
import { MediaCard } from "./series-card";
import type { TMDBMediaItem } from "@/lib/tmdb";
import type { PlatformConfig } from "@/lib/platforms";

interface MediaGridProps {
  items: TMDBMediaItem[];
  watchlistIds?: Set<string>;
  onToggleWatchlist?: (tmdbId: number, mediaType: "movie" | "tv") => void;
  loading?: boolean;
  platformDots?: PlatformConfig[];
  showTypeBadge?: boolean;
}

/** Backward-compatible export */
export function SeriesGrid(props: MediaGridProps) {
  return <MediaGrid {...props} />;
}

export function MediaGrid({
  items,
  watchlistIds,
  onToggleWatchlist,
  loading,
  platformDots,
  showTypeBadge,
}: MediaGridProps) {
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

  if (items.length === 0) {
    return (
      <div className="text-center py-16">
        <Tv size={48} className="mx-auto text-text-secondary/20 mb-4" />
        <p className="text-text-secondary text-lg">Nessun contenuto trovato</p>
        <p className="text-text-secondary/60 text-sm mt-1">Prova a cambiare i filtri o a cercare qualcosa di diverso</p>
        <Link
          href="/esplora"
          className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-accent text-white rounded-lg text-sm hover:bg-accent-light transition-colors"
        >
          Esplora i contenuti
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {items.map((item) => (
        <MediaCard
          key={`${item.mediaType}-${item.id}`}
          item={item}
          inWatchlist={watchlistIds?.has(`${item.mediaType}:${item.id}`)}
          onToggleWatchlist={onToggleWatchlist}
          platformDots={platformDots}
          showTypeBadge={showTypeBadge}
        />
      ))}
    </div>
  );
}
