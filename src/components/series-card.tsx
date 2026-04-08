"use client";

import Image from "next/image";
import Link from "next/link";
import { Star, Plus, Check } from "lucide-react";
import { imageUrl, GENRE_MAP } from "@/lib/tmdb";
import type { TMDBSeries } from "@/lib/tmdb";
import type { PlatformConfig } from "@/lib/platforms";

interface SeriesCardProps {
  series: TMDBSeries;
  providers?: { id: number; name: string; logo: string }[];
  /** Platforms to show as small dots on the poster */
  platformDots?: PlatformConfig[];
  inWatchlist?: boolean;
  onToggleWatchlist?: (tmdbId: number) => void;
  compact?: boolean;
}

export function SeriesCard({
  series,
  providers,
  platformDots,
  inWatchlist,
  onToggleWatchlist,
  compact,
}: SeriesCardProps) {
  const year = series.first_air_date?.slice(0, 4) || "N/A";
  const genres = series.genre_ids
    ?.slice(0, 2)
    .map((id) => GENRE_MAP[id])
    .filter(Boolean);

  return (
    <div
      className={`series-card group relative rounded-xl overflow-hidden bg-bg-card border border-border ${
        compact ? "w-40 flex-shrink-0" : "w-full"
      }`}
    >
      {/* Poster */}
      <Link href={`/serie/${series.id}`}>
        <div
          className={`relative ${compact ? "aspect-[2/3]" : "aspect-[2/3]"}`}
        >
          <Image
            src={imageUrl(series.poster_path, compact ? "w342" : "w500")}
            alt={series.name}
            fill
            className="object-cover"
            sizes={compact ? "160px" : "(max-width: 768px) 50vw, 200px"}
          />
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

          {/* Rating badge */}
          <div className="absolute top-2 left-2 flex items-center gap-1 bg-black/70 backdrop-blur-sm rounded-full px-2 py-0.5 text-xs">
            <Star size={12} className="text-warning fill-warning" />
            <span>{series.vote_average?.toFixed(1)}</span>
          </div>

          {/* Platform dots */}
          {platformDots && platformDots.length > 0 && (
            <div className="absolute bottom-2 left-2 flex gap-1">
              {platformDots.slice(0, 3).map((p) => (
                <div
                  key={p.tmdbId}
                  title={p.name}
                  className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white shadow-md border border-white/20"
                  style={{ backgroundColor: p.color }}
                >
                  {p.name.charAt(0)}
                </div>
              ))}
              {platformDots.length > 3 && (
                <div className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white bg-black/70 backdrop-blur-sm shadow-md border border-white/20">
                  +{platformDots.length - 3}
                </div>
              )}
            </div>
          )}
        </div>
      </Link>

      {/* Watchlist button */}
      {onToggleWatchlist && (
        <button
          onClick={(e) => {
            e.preventDefault();
            onToggleWatchlist(series.id);
          }}
          className={`absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
            inWatchlist
              ? "bg-accent text-white"
              : "bg-black/70 backdrop-blur-sm text-white hover:bg-accent/80"
          }`}
        >
          {inWatchlist ? <Check size={14} /> : <Plus size={14} />}
        </button>
      )}

      {/* Info */}
      <div className={`p-3 ${compact ? "p-2" : "p-3"}`}>
        <Link href={`/serie/${series.id}`}>
          <h3
            className={`font-semibold text-text-primary truncate hover:text-accent-light transition-colors ${
              compact ? "text-xs" : "text-sm"
            }`}
          >
            {series.name}
          </h3>
        </Link>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-text-secondary">{year}</span>
          {!compact && genres && (
            <span className="text-xs text-text-secondary truncate">
              {genres.join(", ")}
            </span>
          )}
        </div>

        {/* Provider badges */}
        {providers && providers.length > 0 && !compact && (
          <div className="flex flex-wrap gap-1 mt-2">
            {providers.map((p) => (
              <span
                key={p.id}
                className="platform-badge text-[10px]"
                title={p.name}
              >
                {p.logo ? (
                  <Image
                    src={imageUrl(p.logo, "w92")}
                    alt={p.name}
                    width={14}
                    height={14}
                    className="rounded"
                  />
                ) : null}
                {p.name}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
