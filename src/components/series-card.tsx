"use client";

import Image from "next/image";
import Link from "next/link";
import { Star, Plus, Check, Film, Tv } from "lucide-react";
import { imageUrl, getGenreMap } from "@/lib/tmdb";
import type { TMDBMediaItem } from "@/lib/tmdb";
import type { PlatformConfig } from "@/lib/platforms";

interface MediaCardProps {
  item: TMDBMediaItem;
  providers?: { id: number; name: string; logo: string }[];
  platformDots?: PlatformConfig[];
  inWatchlist?: boolean;
  onToggleWatchlist?: (tmdbId: number, mediaType: "movie" | "tv") => void;
  compact?: boolean;
  showTypeBadge?: boolean;
}

export function SeriesCard(props: MediaCardProps) {
  return <MediaCard {...props} />;
}

export function MediaCard({
  item,
  providers,
  platformDots,
  inWatchlist,
  onToggleWatchlist,
  compact,
  showTypeBadge = false,
}: MediaCardProps) {
  const year = item.date?.slice(0, 4) || "N/A";
  const genreMap = getGenreMap(item.mediaType);
  const genres = item.genreIds
    ?.slice(0, 2)
    .map((id) => genreMap[id])
    .filter(Boolean);
  const detailUrl = item.mediaType === "movie" ? `/film/${item.id}` : `/serie/${item.id}`;
  const isMovie = item.mediaType === "movie";

  return (
    <div
      className={`series-card group relative rounded-xl overflow-hidden bg-bg-card border border-border ${
        compact ? "w-40 flex-shrink-0" : "w-full"
      }`}
    >
      {/* Poster */}
      <Link href={detailUrl}>
        <div className="relative aspect-[2/3]">
          <Image
            src={imageUrl(item.posterPath, compact ? "w342" : "w500")}
            alt={item.title}
            fill
            className="object-cover"
            sizes={compact ? "160px" : "(max-width: 768px) 50vw, 200px"}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

          {/* Rating badge */}
          <div className="absolute top-2 left-2 flex items-center gap-1 bg-black/70 backdrop-blur-sm rounded-full px-2 py-0.5 text-xs">
            <Star size={12} className="text-warning fill-warning" />
            <span>{item.voteAverage?.toFixed(1)}</span>
          </div>

          {/* Type badge */}
          {showTypeBadge && (
            <div className={`absolute top-2 left-16 flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
              isMovie
                ? "bg-purple-500/80 text-white"
                : "bg-accent/80 text-white"
            }`}>
              {isMovie ? <Film size={10} /> : <Tv size={10} />}
              {isMovie ? "Film" : "Serie"}
            </div>
          )}

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
            onToggleWatchlist(item.id, item.mediaType);
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
        <Link href={detailUrl}>
          <h3
            className={`font-semibold text-text-primary truncate hover:text-accent-light transition-colors ${
              compact ? "text-xs" : "text-sm"
            }`}
          >
            {item.title}
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
