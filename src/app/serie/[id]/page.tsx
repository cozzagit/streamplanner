"use client";

import { useState, useEffect, use } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Star,
  Calendar,
  Tv,
  Plus,
  Check,
  ArrowLeft,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { imageUrl, GENRE_MAP } from "@/lib/tmdb";
import { getPlatformByTmdbId } from "@/lib/platforms";
import type { TMDBSeriesDetail, TMDBWatchProviderCountry } from "@/lib/tmdb";

export default function SerieDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [detail, setDetail] = useState<TMDBSeriesDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [inWatchlist, setInWatchlist] = useState(false);
  const [adding, setAdding] = useState(false);
  const [activeSubs, setActiveSubs] = useState<string[]>([]);

  useEffect(() => {
    const fetchDetail = async () => {
      setLoading(true);
      try {
        const [detailRes, watchlistRes, settingsRes] = await Promise.all([
          fetch(`/api/tmdb/series/${id}`),
          fetch("/api/watchlist"),
          fetch("/api/settings"),
        ]);
        const detailData = await detailRes.json();
        const watchlistData = await watchlistRes.json();
        const settingsData = await settingsRes.json();

        setDetail(detailData);
        if (Array.isArray(watchlistData)) {
          setInWatchlist(
            watchlistData.some(
              (w: { series: { tmdbId: number } }) =>
                w.series.tmdbId === Number(id)
            )
          );
        }
        if (settingsData.active_subscriptions) {
          try { setActiveSubs(JSON.parse(settingsData.active_subscriptions)); } catch { /* ignore */ }
        }
      } catch {
        setDetail(null);
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [id]);

  const toggleWatchlist = async () => {
    if (!detail) return;
    setAdding(true);
    try {
      if (inWatchlist) {
        await fetch("/api/watchlist", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tmdbId: detail.id }),
        });
        setInWatchlist(false);
      } else {
        await fetch("/api/watchlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tmdbId: detail.id }),
        });
        setInWatchlist(true);
      }
    } finally {
      setAdding(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 size={32} className="animate-spin text-accent" />
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="text-center py-16">
        <p className="text-text-secondary">Serie non trovata</p>
      </div>
    );
  }

  const italyProviders: TMDBWatchProviderCountry | null =
    detail["watch/providers"]?.results?.IT || null;

  const allProviders = [
    ...(italyProviders?.flatrate || []).map((p) => ({
      ...p,
      type: "Abbonamento",
    })),
    ...(italyProviders?.free || []).map((p) => ({ ...p, type: "Gratis" })),
    ...(italyProviders?.ads || []).map((p) => ({
      ...p,
      type: "Con pubblicita",
    })),
  ];

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors text-sm"
      >
        <ArrowLeft size={16} />
        Torna ad Esplora
      </Link>

      {/* Hero */}
      <div className="relative rounded-2xl overflow-hidden">
        {detail.backdrop_path && (
          <div className="absolute inset-0">
            <Image
              src={imageUrl(detail.backdrop_path, "w780")}
              alt=""
              fill
              className="object-cover"
              sizes="100vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-bg-primary via-bg-primary/80 to-transparent" />
          </div>
        )}
        <div className="relative flex gap-6 p-6 pt-32">
          {/* Poster */}
          <div className="w-40 h-60 rounded-xl overflow-hidden relative flex-shrink-0 shadow-2xl">
            <Image
              src={imageUrl(detail.poster_path, "w342")}
              alt={detail.name}
              fill
              className="object-cover"
              sizes="160px"
            />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl font-bold text-text-primary">
              {detail.name}
            </h1>
            {detail.original_name !== detail.name && (
              <p className="text-text-secondary mt-1">
                {detail.original_name}
              </p>
            )}

            <div className="flex items-center gap-4 mt-3 flex-wrap">
              <span className="flex items-center gap-1 text-sm">
                <Star size={16} className="text-warning fill-warning" />
                {detail.vote_average?.toFixed(1)} ({detail.vote_count} voti)
              </span>
              <span className="flex items-center gap-1 text-sm text-text-secondary">
                <Calendar size={16} />
                {detail.first_air_date?.slice(0, 4)}
                {detail.last_air_date &&
                  ` — ${detail.last_air_date.slice(0, 4)}`}
              </span>
              <span className="flex items-center gap-1 text-sm text-text-secondary">
                <Tv size={16} />
                {detail.number_of_seasons} stagioni &middot;{" "}
                {detail.number_of_episodes} episodi
              </span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  detail.status === "Returning Series"
                    ? "bg-success/20 text-success"
                    : detail.status === "Ended"
                    ? "bg-text-secondary/20 text-text-secondary"
                    : "bg-warning/20 text-warning"
                }`}
              >
                {detail.status}
              </span>
            </div>

            {/* Genres */}
            <div className="flex gap-2 mt-3 flex-wrap">
              {(detail.genres || []).map((g) => (
                <span
                  key={g.id}
                  className="px-3 py-1 rounded-full text-xs bg-bg-card border border-border text-text-secondary"
                >
                  {g.name}
                </span>
              ))}
            </div>

            {/* Watchlist button */}
            <button
              onClick={toggleWatchlist}
              disabled={adding}
              className={`mt-4 px-6 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 transition-colors ${
                inWatchlist
                  ? "bg-accent text-white hover:bg-danger"
                  : "bg-accent text-white hover:bg-accent-light"
              }`}
            >
              {adding ? (
                <Loader2 size={16} className="animate-spin" />
              ) : inWatchlist ? (
                <Check size={16} />
              ) : (
                <Plus size={16} />
              )}
              {inWatchlist ? "In Watchlist" : "Aggiungi alla Watchlist"}
            </button>
          </div>
        </div>
      </div>

      {/* Overview */}
      {detail.overview && (
        <div>
          <h2 className="text-lg font-semibold text-text-primary mb-2">
            Trama
          </h2>
          <p className="text-text-secondary leading-relaxed">
            {detail.overview}
          </p>
        </div>
      )}

      {/* Where to watch */}
      <div>
        <h2 className="text-lg font-semibold text-text-primary mb-3">
          Dove Guardarla in Italia
        </h2>
        {allProviders.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {allProviders.map((p) => {
              const platformInfo = getPlatformByTmdbId(p.provider_id);
              const isActive = platformInfo && activeSubs.includes(platformInfo.slug);
              return (
                <div
                  key={`${p.provider_id}-${p.type}`}
                  className={`flex items-center gap-3 p-4 rounded-xl bg-bg-card border ${
                    isActive ? "border-success/50" : "border-border"
                  }`}
                >
                  {p.logo_path && (
                    <Image
                      src={imageUrl(p.logo_path, "w92")}
                      alt={p.provider_name}
                      width={40}
                      height={40}
                      className="rounded-lg"
                    />
                  )}
                  <div className="flex-1">
                    <p className="font-medium text-text-primary flex items-center gap-2">
                      {p.provider_name}
                      {isActive && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-success/10 text-success font-bold">
                          ATTIVO
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-text-secondary">{p.type}</p>
                    {platformInfo && !isActive && (
                      <p className="text-xs text-accent-light">
                        {platformInfo.isFree
                          ? "Gratis"
                          : `da \u20AC${platformInfo.monthlyPrice.toFixed(2)}/mese`}
                      </p>
                    )}
                    {isActive && (
                      <p className="text-xs text-success">Hai gia questo abbonamento</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-text-secondary">
            Non disponibile in streaming in Italia al momento
          </p>
        )}
        {italyProviders?.link && (
          <a
            href={italyProviders.link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-accent-light text-sm mt-3 hover:underline"
          >
            Vedi su TMDB <ExternalLink size={14} />
          </a>
        )}
      </div>

      {/* Seasons */}
      {detail.seasons && detail.seasons.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-text-primary mb-3">
            Stagioni
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {detail.seasons
              .filter((s) => s.season_number > 0)
              .map((season) => (
                <div
                  key={season.id}
                  className="rounded-xl bg-bg-card border border-border overflow-hidden"
                >
                  <div className="aspect-[2/3] relative">
                    <Image
                      src={imageUrl(season.poster_path, "w185")}
                      alt={season.name}
                      fill
                      className="object-cover"
                      sizes="150px"
                    />
                  </div>
                  <div className="p-2">
                    <p className="text-xs font-medium text-text-primary truncate">
                      {season.name}
                    </p>
                    <p className="text-[10px] text-text-secondary">
                      {season.episode_count} episodi
                      {season.air_date && ` — ${season.air_date.slice(0, 4)}`}
                    </p>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* TMDB attribution */}
      <div className="text-xs text-text-secondary/50 border-t border-border pt-4">
        Dati forniti da TMDB. Disponibilita streaming fornita da JustWatch.
      </div>
    </div>
  );
}
