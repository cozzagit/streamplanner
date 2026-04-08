"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Users,
  Tv,
  List,
  TrendingUp,
  Loader2,
  ShieldAlert,
  Crown,
  Calendar,
  BarChart3,
  Star,
} from "lucide-react";
import { imageUrl } from "@/lib/tmdb";

interface AdminData {
  users: {
    id: string;
    name: string;
    email: string;
    role: string;
    createdAt: string;
    watchlistCount: number;
  }[];
  stats: {
    totalUsers: number;
    totalWatchlistItems: number;
    totalSeries: number;
  };
  topSeries: {
    name: string;
    tmdbId: number;
    posterPath: string | null;
    voteAverage: number | null;
    addCount: number;
  }[];
  recentSignups: { date: string; count: number }[];
  statusDistribution: { status: string; count: number }[];
  priorityDistribution: { priority: string; count: number }[];
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  to_watch: { label: "Da Vedere", color: "text-accent-light" },
  watching: { label: "In Corso", color: "text-warning" },
  completed: { label: "Completata", color: "text-success" },
  dropped: { label: "Abbandonata", color: "text-danger" },
};

const PRIORITY_LABELS: Record<string, { label: string; color: string }> = {
  high: { label: "Alta", color: "text-danger" },
  medium: { label: "Media", color: "text-warning" },
  low: { label: "Bassa", color: "text-text-secondary" },
};

export default function AdminPage() {
  const [data, setData] = useState<AdminData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/admin?_t=${Date.now()}`)
      .then((r) => {
        if (r.status === 403) throw new Error("forbidden");
        if (!r.ok) throw new Error("error");
        return r.json();
      })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 size={32} className="animate-spin text-accent" />
      </div>
    );
  }

  if (error === "forbidden") {
    return (
      <div className="text-center py-16">
        <ShieldAlert size={48} className="mx-auto text-danger/50 mb-4" />
        <p className="text-text-secondary text-lg">Accesso riservato agli amministratori</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-16">
        <p className="text-text-secondary">Errore nel caricamento dei dati</p>
      </div>
    );
  }

  const { users, stats, topSeries, statusDistribution, priorityDistribution } = data;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
        <ShieldAlert size={24} className="text-accent-light" />
        Admin Dashboard
      </h1>

      {/* Stats overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-xl bg-bg-card border border-border">
          <div className="flex items-center gap-2 text-accent-light text-sm mb-1">
            <Users size={16} />
            Utenti registrati
          </div>
          <p className="text-3xl font-bold text-text-primary">{stats.totalUsers}</p>
        </div>
        <div className="p-5 rounded-xl bg-bg-card border border-border">
          <div className="flex items-center gap-2 text-accent-light text-sm mb-1">
            <List size={16} />
            Serie in watchlist
          </div>
          <p className="text-3xl font-bold text-text-primary">{stats.totalWatchlistItems}</p>
        </div>
        <div className="p-5 rounded-xl bg-bg-card border border-border">
          <div className="flex items-center gap-2 text-accent-light text-sm mb-1">
            <Tv size={16} />
            Serie nel catalogo
          </div>
          <p className="text-3xl font-bold text-text-primary">{stats.totalSeries}</p>
        </div>
      </div>

      {/* Two columns: Users + Top Series */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-6">
        {/* Users list */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">
            <Users size={18} />
            Utenti ({users.length})
          </h2>
          <div className="space-y-2">
            {users.map((u) => (
              <div
                key={u.id}
                className="flex items-center gap-3 p-3 rounded-xl bg-bg-card border border-border"
              >
                <div className="w-9 h-9 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
                  {u.role === "admin" ? (
                    <Crown size={14} className="text-warning" />
                  ) : (
                    <Users size={14} className="text-accent-light" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate flex items-center gap-1.5">
                    {u.name}
                    {u.role === "admin" && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-warning/15 text-warning font-bold">
                        ADMIN
                      </span>
                    )}
                  </p>
                  <p className="text-[11px] text-text-secondary truncate">{u.email}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-medium text-text-primary">{Number(u.watchlistCount)} serie</p>
                  <p className="text-[10px] text-text-secondary flex items-center gap-1 justify-end">
                    <Calendar size={9} />
                    {new Date(u.createdAt).toLocaleDateString("it-IT", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top series */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">
            <TrendingUp size={18} />
            Serie Piu Popolari
          </h2>
          <div className="space-y-2">
            {topSeries.map((s, i) => (
              <Link
                key={s.tmdbId}
                href={`/serie/${s.tmdbId}`}
                className="flex items-center gap-3 p-3 rounded-xl bg-bg-card border border-border hover:border-accent/50 transition-colors"
              >
                <span className="text-lg font-bold text-text-secondary/40 w-6 text-center flex-shrink-0">
                  {i + 1}
                </span>
                {s.posterPath && (
                  <Image
                    src={imageUrl(s.posterPath, "w92")}
                    alt={s.name}
                    width={36}
                    height={54}
                    className="rounded-lg object-cover"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">{s.name}</p>
                  <p className="text-[11px] text-text-secondary flex items-center gap-1">
                    <Star size={10} className="text-warning fill-warning" />
                    {s.voteAverage?.toFixed(1)}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-accent-light">{s.addCount}</p>
                  <p className="text-[10px] text-text-secondary">utenti</p>
                </div>
              </Link>
            ))}
            {topSeries.length === 0 && (
              <p className="text-sm text-text-secondary py-4">Nessuna serie ancora aggiunta</p>
            )}
          </div>
        </div>
      </div>

      {/* Distribution stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Status distribution */}
        <div className="p-5 rounded-xl bg-bg-card border border-border">
          <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2 mb-3">
            <BarChart3 size={16} className="text-accent-light" />
            Stato Watchlist
          </h3>
          <div className="space-y-2">
            {statusDistribution.map((s) => {
              const total = statusDistribution.reduce((acc, x) => acc + Number(x.count), 0);
              const pct = total > 0 ? Math.round((Number(s.count) / total) * 100) : 0;
              const info = STATUS_LABELS[s.status] || { label: s.status, color: "text-text-secondary" };
              return (
                <div key={s.status} className="flex items-center gap-3">
                  <span className={`text-xs font-medium w-24 ${info.color}`}>{info.label}</span>
                  <div className="flex-1 h-2 rounded-full bg-bg-secondary overflow-hidden">
                    <div
                      className="h-full rounded-full bg-accent transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-xs text-text-secondary w-12 text-right">{s.count} ({pct}%)</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Priority distribution */}
        <div className="p-5 rounded-xl bg-bg-card border border-border">
          <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2 mb-3">
            <BarChart3 size={16} className="text-accent-light" />
            Priorita Watchlist
          </h3>
          <div className="space-y-2">
            {priorityDistribution.map((p) => {
              const total = priorityDistribution.reduce((acc, x) => acc + Number(x.count), 0);
              const pct = total > 0 ? Math.round((Number(p.count) / total) * 100) : 0;
              const info = PRIORITY_LABELS[p.priority] || { label: p.priority, color: "text-text-secondary" };
              return (
                <div key={p.priority} className="flex items-center gap-3">
                  <span className={`text-xs font-medium w-24 ${info.color}`}>{info.label}</span>
                  <div className="flex-1 h-2 rounded-full bg-bg-secondary overflow-hidden">
                    <div
                      className="h-full rounded-full bg-accent transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-xs text-text-secondary w-12 text-right">{p.count} ({pct}%)</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
