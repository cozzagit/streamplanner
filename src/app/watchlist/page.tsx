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
      <div className="space-y-4">
        <div className="skeleton h-8 w-48" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="skeleton h-24 w-full" />
        ))}
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

      {/* List */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <List size={48} className="mx-auto text-text-secondary/30 mb-4" />
          <p className="text-text-secondary">
            {items.length === 0
              ? "La tua watchlist e vuota. Esplora e aggiungi serie!"
              : "Nessuna serie con questi filtri"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
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
                className="flex items-center gap-4 p-4 rounded-xl bg-bg-card border border-border hover:border-accent/30 transition-colors group"
              >
                {/* Poster */}
                <Link
                  href={`/serie/${item.series.tmdbId}`}
                  className="flex-shrink-0"
                >
                  <div className="w-16 h-24 rounded-lg overflow-hidden relative">
                    <Image
                      src={imageUrl(item.series.posterPath, "w154")}
                      alt={item.series.name}
                      fill
                      className="object-cover"
                      sizes="64px"
                    />
                  </div>
                </Link>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <Link href={`/serie/${item.series.tmdbId}`}>
                    <h3 className="font-semibold text-text-primary truncate hover:text-accent-light transition-colors">
                      {item.series.name}
                    </h3>
                  </Link>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="flex items-center gap-1 text-xs text-text-secondary">
                      <Star size={12} className="text-warning fill-warning" />
                      {item.series.voteAverage?.toFixed(1)}
                    </span>
                    <span className="text-xs text-text-secondary">
                      {item.series.numberOfSeasons}S &middot;{" "}
                      {item.series.numberOfEpisodes}E
                    </span>
                    {genres.slice(0, 2).map((g: string) => (
                      <span
                        key={g}
                        className="text-[10px] px-2 py-0.5 rounded-full bg-bg-secondary text-text-secondary"
                      >
                        {g}
                      </span>
                    ))}
                  </div>

                  {/* Platforms */}
                  {item.platforms.length > 0 && (
                    <div className="flex gap-1 mt-2">
                      {item.platforms.map((p) => (
                        <span
                          key={p.platformSlug}
                          className="text-[10px] px-2 py-0.5 rounded-full font-medium"
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
                </div>

                {/* Status & Priority */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {/* Priority selector */}
                  <select
                    value={item.priority}
                    onChange={(e) =>
                      updateItem(item.id, { priority: e.target.value })
                    }
                    className={`appearance-none px-2 py-1 rounded-full text-[10px] font-medium border-0 cursor-pointer focus:outline-none ${priorityCfg?.color}`}
                  >
                    {Object.entries(PRIORITY_CONFIG).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v.label}
                      </option>
                    ))}
                  </select>

                  {/* Status selector */}
                  <div className="relative">
                    <select
                      value={item.status}
                      onChange={(e) =>
                        updateItem(item.id, { status: e.target.value })
                      }
                      className={`appearance-none pl-7 pr-6 py-1.5 rounded-lg text-xs font-medium bg-bg-secondary border border-border cursor-pointer focus:outline-none focus:border-accent ${statusCfg?.color}`}
                    >
                      {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v.label}
                        </option>
                      ))}
                    </select>
                    <StatusIcon
                      size={14}
                      className={`absolute left-2 top-1/2 -translate-y-1/2 ${statusCfg?.color}`}
                    />
                    <ChevronDown
                      size={12}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 text-text-secondary"
                    />
                  </div>

                  {/* Delete */}
                  <button
                    onClick={() => removeItem(item.series.tmdbId)}
                    className="p-2 rounded-lg text-text-secondary hover:text-danger hover:bg-danger/10 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
