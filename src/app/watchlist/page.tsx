"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  List,
  Star,
  Trash2,
  ChevronDown,
  Eye,
  Play,
  CheckCircle,
  XCircle,
  Filter,
} from "lucide-react";
import { imageUrl } from "@/lib/tmdb";

interface WatchlistItem {
  id: string;
  status: string;
  priority: string;
  currentSeason: number | null;
  currentEpisode: number | null;
  watchedEpisodes: number;
  addedAt: string;
  series: {
    id: string;
    tmdbId: number;
    name: string;
    posterPath: string | null;
    voteAverage: number;
    numberOfSeasons: number;
    numberOfEpisodes: number;
    status: string;
    genres: string;
    firstAirDate: string;
  };
  platforms: {
    platformName: string;
    platformSlug: string;
    platformColor: string;
  }[];
}

const STATUS_CONFIG = {
  to_watch: { label: "Da Vedere", icon: Eye, color: "text-accent-light" },
  watching: { label: "In Corso", icon: Play, color: "text-warning" },
  completed: { label: "Completata", icon: CheckCircle, color: "text-success" },
  dropped: { label: "Abbandonata", icon: XCircle, color: "text-danger" },
};

const PRIORITY_CONFIG = {
  high: { label: "Alta", color: "bg-danger/20 text-danger" },
  medium: { label: "Media", color: "bg-warning/20 text-warning" },
  low: { label: "Bassa", color: "bg-text-secondary/20 text-text-secondary" },
};

export default function WatchlistPage() {
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [filterPriority, setFilterPriority] = useState<string | null>(null);

  const fetchWatchlist = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/watchlist");
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWatchlist();
  }, []);

  const removeItem = async (tmdbId: number) => {
    await fetch("/api/watchlist", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tmdbId }),
    });
    setItems((prev) => prev.filter((i) => i.series.tmdbId !== tmdbId));
  };

  const updateItem = async (
    id: string,
    updates: Record<string, unknown>
  ) => {
    await fetch(`/api/watchlist/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    fetchWatchlist();
  };

  const filtered = items.filter((i) => {
    if (filterStatus && i.status !== filterStatus) return false;
    if (filterPriority && i.priority !== filterPriority) return false;
    return true;
  });

  const stats = {
    total: items.length,
    toWatch: items.filter((i) => i.status === "to_watch").length,
    watching: items.filter((i) => i.status === "watching").length,
    completed: items.filter((i) => i.status === "completed").length,
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="skeleton h-8 w-48" />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="rounded-xl overflow-hidden">
              <div className="skeleton aspect-[2/3] w-full" />
              <div className="p-3 space-y-2">
                <div className="skeleton h-4 w-3/4" />
                <div className="skeleton h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <List size={24} />
            Watchlist
          </h1>
          <p className="text-text-secondary mt-1">
            {stats.total} serie &middot; {stats.toWatch} da vedere &middot;{" "}
            {stats.watching} in corso &middot; {stats.completed} completate
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setFilterStatus(null)}
          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
            !filterStatus
              ? "bg-accent text-white border-accent"
              : "bg-bg-card text-text-secondary border-border hover:border-accent/50"
          }`}
        >
          <Filter size={12} className="inline mr-1" />
          Tutte
        </button>
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
          <button
            key={key}
            onClick={() =>
              setFilterStatus(filterStatus === key ? null : key)
            }
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              filterStatus === key
                ? "bg-accent text-white border-accent"
                : "bg-bg-card text-text-secondary border-border hover:border-accent/50"
            }`}
          >
            {cfg.label}
          </button>
        ))}
        <div className="w-px bg-border mx-1" />
        {Object.entries(PRIORITY_CONFIG).map(([key, cfg]) => (
          <button
            key={key}
            onClick={() =>
              setFilterPriority(filterPriority === key ? null : key)
            }
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              filterPriority === key
                ? cfg.color + " border-current"
                : "bg-bg-card text-text-secondary border-border hover:border-accent/50"
            }`}
          >
            {cfg.label}
          </button>
        ))}
      </div>

      {/* Cards Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <List size={48} className="mx-auto text-text-secondary/30 mb-4" />
          <p className="text-text-secondary">
            {items.length === 0
              ? "La tua watchlist è vuota. Esplora e aggiungi serie!"
              : "Nessuna serie con questi filtri"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {filtered.map((item) => {
            const statusCfg =
              STATUS_CONFIG[item.status as keyof typeof STATUS_CONFIG];
            const priorityCfg =
              PRIORITY_CONFIG[item.priority as keyof typeof PRIORITY_CONFIG];
            let genres: string[] = [];
            try {
              genres = item.series.genres ? JSON.parse(item.series.genres) : [];
            } catch {
              // ignore invalid JSON
            }
            const StatusIcon = statusCfg?.icon || Eye;

            return (
              <div
                key={item.id}
                className="rounded-xl bg-bg-card border border-border hover:border-accent/30 transition-all hover:shadow-lg hover:shadow-accent/5 group overflow-hidden flex flex-col"
              >
                {/* Poster with overlay */}
                <Link
                  href={`/serie/${item.series.tmdbId}`}
                  className="relative aspect-[2/3] block overflow-hidden"
                >
                  <Image
                    src={imageUrl(item.series.posterPath, "w342")}
                    alt={item.series.name}
                    fill
                    className="object-cover transition-transform group-hover:scale-105"
                    sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
                  />
                  {/* Top badges */}
                  <div className="absolute top-2 left-2 right-2 flex justify-between items-start">
                    <span className="flex items-center gap-1 text-[11px] font-medium bg-black/70 backdrop-blur-sm text-white px-2 py-1 rounded-md">
                      <Star size={11} className="text-warning fill-warning" />
                      {item.series.voteAverage?.toFixed(1)}
                    </span>
                    {priorityCfg && (
                      <span className={`text-[10px] font-semibold px-2 py-1 rounded-md backdrop-blur-sm ${
                        item.priority === "high"
                          ? "bg-danger/80 text-white"
                          : item.priority === "medium"
                          ? "bg-warning/80 text-black"
                          : "bg-black/50 text-white/70"
                      }`}>
                        {priorityCfg.label}
                      </span>
                    )}
                  </div>
                  {/* Bottom gradient overlay */}
                  <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/80 to-transparent" />
                  {/* Status badge on poster */}
                  <div className="absolute bottom-2 left-2 flex items-center gap-1.5">
                    <StatusIcon size={13} className="text-white" />
                    <span className="text-[11px] font-medium text-white">
                      {statusCfg?.label}
                    </span>
                  </div>
                  {/* Seasons info */}
                  <span className="absolute bottom-2 right-2 text-[10px] text-white/70 font-medium">
                    {item.series.numberOfSeasons}S &middot; {item.series.numberOfEpisodes}E
                  </span>
                  {/* Delete button */}
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      removeItem(item.series.tmdbId);
                    }}
                    className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 backdrop-blur-sm text-white/70 hover:text-danger hover:bg-danger/20 transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 size={14} />
                  </button>
                </Link>

                {/* Card body */}
                <div className="p-3 flex flex-col gap-2 flex-1">
                  <Link href={`/serie/${item.series.tmdbId}`}>
                    <h3 className="font-semibold text-sm text-text-primary line-clamp-2 leading-tight hover:text-accent-light transition-colors">
                      {item.series.name}
                    </h3>
                  </Link>

                  {/* Genres */}
                  {genres.length > 0 && (
                    <div className="flex gap-1 flex-wrap">
                      {genres.slice(0, 2).map((g: string) => (
                        <span
                          key={g}
                          className="text-[10px] px-1.5 py-0.5 rounded bg-bg-secondary text-text-secondary"
                        >
                          {g}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Platforms */}
                  {item.platforms.length > 0 && (
                    <div className="flex gap-1 flex-wrap mt-auto">
                      {item.platforms.map((p) => (
                        <span
                          key={p.platformSlug}
                          className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                          style={{
                            backgroundColor: p.platformColor + "20",
                            color: p.platformColor,
                          }}
                        >
                          {p.platformName}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Watched progress */}
                  <div className="flex items-center gap-1.5 mt-auto">
                    <span className="text-[10px] text-text-secondary">Visti</span>
                    <input
                      type="number"
                      min={0}
                      max={item.series.numberOfEpisodes}
                      value={item.watchedEpisodes || 0}
                      onChange={(e) => {
                        const val = Math.max(0, Math.min(item.series.numberOfEpisodes, Number(e.target.value) || 0));
                        updateItem(item.id, { watchedEpisodes: val });
                      }}
                      className="w-12 px-1.5 py-1 rounded-md text-[11px] text-center font-medium bg-bg-secondary border border-border text-text-primary focus:outline-none focus:border-accent tabular-nums"
                    />
                    <span className="text-[10px] text-text-secondary">/ {item.series.numberOfEpisodes}</span>
                    {item.watchedEpisodes > 0 && item.series.numberOfEpisodes > 0 && (
                      <div className="flex-1 h-1 bg-bg-secondary rounded-full overflow-hidden ml-1">
                        <div
                          className="h-full bg-accent rounded-full"
                          style={{ width: `${Math.round((item.watchedEpisodes / item.series.numberOfEpisodes) * 100)}%` }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Selectors */}
                  <div className="flex gap-1.5 mt-1">
                    <div className="relative flex-1">
                      <select
                        value={item.status}
                        onChange={(e) =>
                          updateItem(item.id, { status: e.target.value })
                        }
                        className={`appearance-none w-full pl-6 pr-5 py-1.5 rounded-lg text-[11px] font-medium bg-bg-secondary border border-border cursor-pointer focus:outline-none focus:border-accent ${statusCfg?.color}`}
                      >
                        {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                          <option key={k} value={k}>
                            {v.label}
                          </option>
                        ))}
                      </select>
                      <StatusIcon
                        size={12}
                        className={`absolute left-1.5 top-1/2 -translate-y-1/2 ${statusCfg?.color} pointer-events-none`}
                      />
                      <ChevronDown
                        size={10}
                        className="absolute right-1 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none"
                      />
                    </div>
                    <select
                      value={item.priority}
                      onChange={(e) =>
                        updateItem(item.id, { priority: e.target.value })
                      }
                      className={`appearance-none px-2 py-1.5 rounded-lg text-[11px] font-medium border border-border cursor-pointer focus:outline-none focus:border-accent ${priorityCfg?.color}`}
                    >
                      {Object.entries(PRIORITY_CONFIG).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
