"use client";

import { useState, useEffect, use } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Star, Clock, Film, Plus, Check, ArrowLeft, Loader2, ExternalLink,
  Play, Newspaper,
} from "lucide-react";
import { imageUrl, MOVIE_GENRE_MAP } from "@/lib/tmdb";
import { getPlatformByTmdbId, getPlatformUrl } from "@/lib/platforms";
import type { TMDBMovieDetail, TMDBWatchProviderCountry, TMDBVideo } from "@/lib/tmdb";

function YouTubeTrailer({ video }: { video: TMDBVideo }) {
  const [playing, setPlaying] = useState(false);
  if (playing) {
    return (
      <div className="aspect-video rounded-xl overflow-hidden">
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${video.key}?autoplay=1&rel=0`}
          title={video.name} allow="autoplay; encrypted-media" allowFullScreen
          className="w-full h-full" loading="lazy"
        />
      </div>
    );
  }
  return (
    <button onClick={() => setPlaying(true)} className="relative aspect-video rounded-xl overflow-hidden group w-full">
      <img src={`https://img.youtube.com/vi/${video.key}/hqdefault.jpg`} alt={video.name} className="w-full h-full object-cover" loading="lazy" />
      <div className="absolute inset-0 bg-black/40 flex items-center justify-center group-hover:bg-black/50 transition-colors">
        <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:scale-110 transition-transform">
          <Play size={28} className="text-white fill-white ml-1" />
        </div>
      </div>
      <div className="absolute bottom-3 left-3 right-3">
        <p className="text-white text-sm font-medium truncate drop-shadow-lg">{video.name}</p>
      </div>
    </button>
  );
}

function formatRuntime(minutes: number | null): string {
  if (!minutes) return "N/A";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}min` : `${m}min`;
}

export default function FilmDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [detail, setDetail] = useState<TMDBMovieDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [inWatchlist, setInWatchlist] = useState(false);
  const [adding, setAdding] = useState(false);
  const [activeSubs, setActiveSubs] = useState<string[]>([]);

  useEffect(() => {
    const fetchDetail = async () => {
      setLoading(true);
      try {
        const [detailRes, watchlistRes, settingsRes] = await Promise.all([
          fetch(`/api/tmdb/movies/${id}`),
          fetch("/api/watchlist?type=movie"),
          fetch("/api/settings"),
        ]);
        const detailData = await detailRes.json();
        const watchlistData = await watchlistRes.json();
        const settingsData = await settingsRes.json();

        setDetail(detailData);
        if (Array.isArray(watchlistData)) {
          setInWatchlist(watchlistData.some((w: { movie: { tmdbId: number } }) => w.movie?.tmdbId === Number(id)));
        }
        if (settingsData.active_subscriptions) {
          try { setActiveSubs(JSON.parse(settingsData.active_subscriptions)); } catch { /* */ }
        }
      } catch { setDetail(null); }
      finally { setLoading(false); }
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
          body: JSON.stringify({ tmdbId: detail.id, type: "movie" }),
        });
        setInWatchlist(false);
      } else {
        await fetch("/api/watchlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tmdbId: detail.id, type: "movie" }),
        });
        setInWatchlist(true);
      }
    } finally { setAdding(false); }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-32"><Loader2 size={32} className="animate-spin text-accent" /></div>;
  }
  if (!detail) {
    return <div className="text-center py-16"><p className="text-text-secondary">Film non trovato</p></div>;
  }

  const italyProviders: TMDBWatchProviderCountry | null = detail["watch/providers"]?.results?.IT || null;
  const allProviders = [
    ...(italyProviders?.flatrate || []).map((p) => ({ ...p, type: "Abbonamento" })),
    ...(italyProviders?.free || []).map((p) => ({ ...p, type: "Gratis" })),
    ...(italyProviders?.ads || []).map((p) => ({ ...p, type: "Con pubblicita" })),
  ];

  const director = detail.credits?.crew?.find((c) => c.job === "Director");
  const cast = detail.credits?.cast?.slice(0, 8) || [];
  const trailers = (detail.videos?.results || [])
    .filter((v) => v.site === "YouTube" && (v.type === "Trailer" || v.type === "Teaser"))
    .sort((a, b) => (a.type === "Trailer" ? -1 : 1));

  return (
    <div className="space-y-6">
      <Link href="/esplora" className="inline-flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors text-sm">
        <ArrowLeft size={16} /> Torna ad Esplora
      </Link>

      {/* Hero */}
      <div className="relative rounded-2xl overflow-hidden">
        {detail.backdrop_path && (
          <div className="absolute inset-0">
            <Image src={imageUrl(detail.backdrop_path, "w780")} alt="" fill className="object-cover" sizes="100vw" />
            <div className="absolute inset-0 bg-gradient-to-t from-bg-primary via-bg-primary/80 to-transparent" />
          </div>
        )}
        <div className="relative flex gap-6 p-6 pt-32">
          <div className="w-40 h-60 rounded-xl overflow-hidden relative flex-shrink-0 shadow-2xl">
            <Image src={imageUrl(detail.poster_path, "w342")} alt={detail.title} fill className="object-cover" sizes="160px" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 text-xs font-medium flex items-center gap-1">
                <Film size={12} /> Film
              </span>
            </div>
            <h1 className="text-3xl font-bold text-text-primary">{detail.title}</h1>
            {detail.original_title !== detail.title && (
              <p className="text-text-secondary mt-1">{detail.original_title}</p>
            )}
            <div className="flex items-center gap-4 mt-3 flex-wrap">
              <span className="flex items-center gap-1 text-sm">
                <Star size={16} className="text-warning fill-warning" />
                {detail.vote_average?.toFixed(1)} ({detail.vote_count} voti)
              </span>
              <span className="flex items-center gap-1 text-sm text-text-secondary">
                <Clock size={16} />
                {formatRuntime(detail.runtime)}
              </span>
              {detail.release_date && (
                <span className="text-sm text-text-secondary">
                  {detail.release_date.slice(0, 4)}
                </span>
              )}
            </div>
            <div className="flex gap-2 mt-3 flex-wrap">
              {(detail.genres || []).map((g) => (
                <span key={g.id} className="px-3 py-1 rounded-full text-xs bg-bg-card border border-border text-text-secondary">
                  {g.name}
                </span>
              ))}
            </div>

            {/* Director + Cast */}
            {director && (
              <p className="text-sm text-text-secondary mt-3">
                Regia di <strong className="text-text-primary">{director.name}</strong>
              </p>
            )}

            <button
              onClick={toggleWatchlist}
              disabled={adding}
              className={`mt-4 px-6 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 transition-colors ${
                inWatchlist ? "bg-accent text-white hover:bg-danger" : "bg-accent text-white hover:bg-accent-light"
              }`}
            >
              {adding ? <Loader2 size={16} className="animate-spin" /> : inWatchlist ? <Check size={16} /> : <Plus size={16} />}
              {inWatchlist ? "Nella Watchlist" : "Aggiungi alla Watchlist"}
            </button>
          </div>
        </div>
      </div>

      {/* Overview + Where to watch */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_20rem] gap-6 items-start">
        <div>
          {detail.overview && (
            <>
              <h2 className="text-lg font-semibold text-text-primary mb-2">Di cosa parla</h2>
              <p className="text-text-secondary leading-relaxed">{detail.overview}</p>
            </>
          )}
          {cast.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-semibold text-text-primary mb-2">Cast principale</h3>
              <div className="flex flex-wrap gap-2">
                {cast.map((c) => (
                  <span key={c.id} className="px-2.5 py-1 rounded-lg text-xs bg-bg-card border border-border text-text-secondary">
                    {c.name} <span className="text-text-secondary/50">({c.character})</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div>
          <h2 className="text-lg font-semibold text-text-primary mb-3">Dove vederlo</h2>
          {allProviders.length > 0 ? (
            <div className="space-y-2">
              {allProviders.map((p) => {
                const platformInfo = getPlatformByTmdbId(p.provider_id);
                const isActive = platformInfo && activeSubs.includes(platformInfo.slug);
                const outboundUrl = platformInfo ? getPlatformUrl(platformInfo) : null;
                return (
                  <a key={`${p.provider_id}-${p.type}`} href={outboundUrl || "#"} target="_blank" rel="noopener noreferrer sponsored"
                    className={`group flex items-center gap-3 p-3 rounded-xl bg-bg-card border transition-all hover:scale-[1.02] hover:shadow-lg ${
                      isActive ? "border-success/50 hover:border-success" : "border-border hover:border-accent/50"
                    }`}>
                    {p.logo_path && <Image src={imageUrl(p.logo_path, "w92")} alt={p.provider_name} width={36} height={36} className="rounded-lg" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-primary flex items-center gap-1.5">
                        <span className="truncate">{p.provider_name}</span>
                        {isActive && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-success/10 text-success font-bold flex-shrink-0">ATTIVO</span>}
                      </p>
                      <p className="text-[11px] text-text-secondary">
                        {p.type}
                        {platformInfo && !isActive && !platformInfo.isFree && <span className="text-accent-light"> · €{platformInfo.monthlyPrice.toFixed(2)}/mese</span>}
                        {platformInfo?.isFree && <span className="text-success"> · Gratis</span>}
                        {isActive && <span className="text-success"> · Abbonato</span>}
                      </p>
                    </div>
                    <ExternalLink size={14} className="text-text-secondary/30 group-hover:text-accent-light transition-colors flex-shrink-0" />
                  </a>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-text-secondary">Non disponibile in streaming in Italia</p>
          )}
          {allProviders.length > 0 && (
            <p className="text-[10px] text-text-secondary/40 mt-2">Potremmo ricevere una piccola commissione — non ti costa nulla in piu.</p>
          )}
        </div>
      </div>

      {/* Trailer */}
      {trailers.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-text-primary mb-3 flex items-center gap-2">
            <Play size={18} className="text-accent-light" /> Trailer
          </h2>
          <div className={`grid gap-3 ${trailers.length > 1 ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1 max-w-2xl"}`}>
            {trailers.slice(0, 4).map((v) => <YouTubeTrailer key={v.id} video={v} />)}
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
