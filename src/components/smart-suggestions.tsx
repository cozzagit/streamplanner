"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Lightbulb, Plus, Loader2, Star, Clock } from "lucide-react";
import { imageUrl } from "@/lib/tmdb";
import { TRACKED_PLATFORMS } from "@/lib/platforms";

interface MonthData {
  label: string;
  month: number;
  year: number;
  availableHours: number;
  confirmedHours: number;
  rotationHours: number;
}

interface SuggestedSeries {
  id: number;
  name: string;
  posterPath: string | null;
  voteAverage: number;
}

interface SuggestionsResponse {
  months: MonthData[];
  suggestions: SuggestedSeries[];
  stats: {
    monthlyHours: number;
    totalPlannedHours: number;
    confirmedHours: number;
    rotationHours: number;
    watchlistSize: number;
    totalFreeHours: number;
  };
}

export function SmartSuggestions() {
  const [data, setData] = useState<SuggestionsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState<number | null>(null);
  const [added, setAdded] = useState<Set<number>>(new Set());

  useEffect(() => {
    // Fetch suggestions + real schedule to get accurate hours per month
    Promise.all([
      fetch(`/api/suggestions?_t=${Date.now()}`).then((r) => r.json()),
      fetch(`/api/schedule?_t=${Date.now()}`).then((r) => r.json()),
      fetch(`/api/settings?_t=${Date.now()}`).then((r) => r.json()),
    ])
      .then(([sugData, schedData, settingsData]) => {
        if (sugData?.months && schedData?.schedule) {
          // Get active subscription slugs to distinguish confirmed vs rotation
          let activeSlugs: string[] = [];
          try { activeSlugs = JSON.parse(settingsData?.active_subscriptions || "[]"); } catch { /* */ }
          const activeSet = new Set(activeSlugs);
          // Build name→slug lookup and identify free platforms
          const nameToSlug = new Map<string, string>();
          const freeSlugs = new Set<string>();
          for (const p of TRACKED_PLATFORMS) {
            nameToSlug.set(p.name, p.slug);
            if (p.isFree) freeSlugs.add(p.slug);
          }

          // Aggregate real scheduled minutes per month, split by platform type
          const byMonth = new Map<string, { confirmed: number; rotation: number }>();
          for (const [dateStr, entries] of Object.entries(
            schedData.schedule as Record<string, { minutes: number; platformName?: string }[]>
          )) {
            const parts = dateStr.split("-");
            const key = `${parseInt(parts[0])}-${parseInt(parts[1])}`;
            if (!byMonth.has(key)) byMonth.set(key, { confirmed: 0, rotation: 0 });
            const bucket = byMonth.get(key)!;
            for (const entry of entries) {
              // Determine if this entry is on an active/free platform or rotation
              const pName = entry.platformName || "";
              const slug = nameToSlug.get(pName) || "";
              const isActive = activeSet.has(slug) || freeSlugs.has(slug);
              if (isActive) {
                bucket.confirmed += entry.minutes || 0;
              } else {
                bucket.rotation += entry.minutes || 0;
              }
            }
          }

          // Override month data with real schedule
          for (const month of sugData.months) {
            const key = `${month.year}-${month.month}`;
            const real = byMonth.get(key);
            if (real) {
              month.confirmedHours = Math.min(Math.round(real.confirmed / 60), month.availableHours);
              month.rotationHours = Math.min(
                Math.round(real.rotation / 60),
                Math.max(0, month.availableHours - month.confirmedHours)
              );
            } else {
              month.confirmedHours = 0;
              month.rotationHours = 0;
            }
          }

          sugData.stats.totalFreeHours = sugData.months.reduce(
            (a: number, m: MonthData) => a + Math.max(0, m.availableHours - m.confirmedHours - m.rotationHours),
            0
          );
        }
        setData(sugData);
      })
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
  if (!data) return null;

  const { months, suggestions, stats } = data;
  const hasFreeTime = stats.totalFreeHours > 0;

  return (
    <div className="rounded-xl border border-border bg-bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border">
        <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center flex-shrink-0">
          <Clock size={16} className="text-accent-light" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-text-primary">Capacita Visione</p>
          <p className="text-[11px] text-text-secondary">
            {stats.confirmedHours || 0}h sicure
            {(stats.rotationHours || 0) > 0 && <span className="text-accent-light"> + {stats.rotationHours}h con rotazione</span>}
            {hasFreeTime && <span className="text-warning"> · {stats.totalFreeHours}h libere</span>}
          </p>
        </div>
      </div>

      {/* Monthly bars */}
      <div className="p-4 space-y-3">
        <div className="flex gap-2 items-end">
          {months.map((m) => {
            const confPct = m.availableHours > 0 ? Math.min(100, Math.round((m.confirmedHours / m.availableHours) * 100)) : 0;
            const rotPct = m.availableHours > 0 ? Math.min(100 - confPct, Math.round((m.rotationHours / m.availableHours) * 100)) : 0;
            const totalPct = confPct + rotPct;
            const freeHours = Math.max(0, m.availableHours - m.confirmedHours - m.rotationHours);

            return (
              <div key={`${m.month}-${m.year}`} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full h-24 bg-bg-secondary rounded-lg overflow-hidden flex flex-col justify-end relative">
                  {/* Rotation layer (top, striped) */}
                  {rotPct > 0 && (
                    <div
                      className="w-full bg-accent/30"
                      style={{
                        height: `${rotPct}%`,
                        backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(99,102,241,0.15) 3px, rgba(99,102,241,0.15) 6px)",
                      }}
                    />
                  )}
                  {/* Confirmed layer (bottom, solid) */}
                  {confPct > 0 && (
                    <div
                      className={`w-full ${totalPct >= 90 ? "bg-success" : "bg-accent"}`}
                      style={{ height: `${confPct}%` }}
                    />
                  )}
                  {/* Percentage */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className={`text-[10px] font-bold ${totalPct > 50 ? "text-white" : "text-text-secondary"}`}>
                      {confPct}%
                    </span>
                  </div>
                </div>
                <span className="text-[10px] font-medium text-text-secondary">{m.label}</span>
                <span className={`text-[9px] tabular-nums ${freeHours > 0 ? "text-warning" : "text-success"}`}>
                  {freeHours > 0 ? `${freeHours}h` : "pieno"}
                </span>
              </div>
            );
          })}
        </div>
        {/* Legend */}
        <div className="flex items-center gap-4 text-[10px] text-text-secondary">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm bg-accent inline-block" /> Abbonamenti attivi
          </span>
          {months.some((m) => m.rotationHours > 0) && (
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-sm bg-accent/30 inline-block" style={{
                backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(99,102,241,0.2) 2px, rgba(99,102,241,0.2) 4px)",
              }} /> Con rotazione
            </span>
          )}
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm bg-bg-secondary inline-block border border-border" /> Libero
          </span>
        </div>
      </div>

      {/* Suggestions */}
      {suggestions.length > 0 && hasFreeTime && (
        <div className="px-4 pb-4">
          <div className="flex items-center gap-2 mb-2">
            <Lightbulb size={14} className="text-accent-light" />
            <p className="text-xs text-text-secondary">
              Riempi il calendario — le migliori serie sui tuoi abbonamenti
            </p>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1 carousel-scroll">
            {suggestions.map((s) => {
              const isAdded = added.has(s.id);
              const isAdding = adding === s.id;
              return (
                <div key={s.id} className="flex-shrink-0 w-24 group">
                  <div className="relative aspect-[2/3] rounded-lg overflow-hidden mb-1">
                    <Link href={`/serie/${s.id}`}>
                      <Image
                        src={imageUrl(s.posterPath, "w185")}
                        alt={s.name}
                        fill
                        className="object-cover"
                        sizes="96px"
                      />
                    </Link>
                    <div className="absolute top-1 left-1 flex items-center gap-0.5 bg-black/70 rounded-full px-1.5 py-0.5 text-[9px]">
                      <Star size={8} className="text-warning fill-warning" />
                      {s.voteAverage?.toFixed(1)}
                    </div>
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
      )}
    </div>
  );
}
