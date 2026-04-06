"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  PlayCircle,
  Tv,
  Clock,
  Timer,
  Zap,
} from "lucide-react";
import { imageUrl } from "@/lib/tmdb";

// ─── Types ──────────────────────────────────────────────────

interface WatchlistSeries {
  series: {
    tmdbId: number;
    name: string;
    posterPath: string | null;
    numberOfSeasons: number;
    status: string;
  };
}

interface Episode {
  seriesName: string;
  seriesPoster: string | null;
  tmdbId: number;
  seasonNumber: number;
  episodeNumber: number;
  name: string;
  airDate: string;
}

interface ScheduleEntry {
  seriesName: string;
  seriesTmdbId: number;
  posterPath: string | null;
  episodes: number;
  episodeFrom: number;
  episodeTo: number;
  minutes: number;
  priority: string;
  status: string;
}

interface ScheduleData {
  schedule: Record<string, ScheduleEntry[]>;
  stats: {
    totalEpisodes: number;
    totalHours: number;
    daysNeeded: number;
    seriesCount: number;
  };
}

// ─── Tabs ───────────────────────────────────────────────────

type TabId = "schedule" | "releases";

export default function CalendarioPage() {
  const [activeTab, setActiveTab] = useState<TabId>("schedule");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
          <CalendarDays size={24} />
          Calendario
        </h1>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-bg-card rounded-xl border border-border p-1">
        <button
          onClick={() => setActiveTab("schedule")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            activeTab === "schedule"
              ? "bg-accent text-white"
              : "text-text-secondary hover:text-text-primary hover:bg-bg-secondary"
          }`}
        >
          <PlayCircle size={16} />
          Programmazione
        </button>
        <button
          onClick={() => setActiveTab("releases")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            activeTab === "releases"
              ? "bg-accent text-white"
              : "text-text-secondary hover:text-text-primary hover:bg-bg-secondary"
          }`}
        >
          <Tv size={16} />
          Uscite
        </button>
      </div>

      {activeTab === "schedule" ? <ScheduleView /> : <ReleasesView />}
    </div>
  );
}

// ─── Schedule View ──────────────────────────────────────────

function ScheduleView() {
  const [data, setData] = useState<ScheduleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [weekOffset, setWeekOffset] = useState(0);

  useEffect(() => {
    fetch("/api/schedule")
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={32} className="animate-spin text-accent" />
        <span className="ml-3 text-text-secondary">Generazione programma...</span>
      </div>
    );
  }

  if (!data || !data.schedule || Object.keys(data.schedule).length === 0) {
    return (
      <div className="text-center py-16">
        <PlayCircle size={48} className="mx-auto text-text-secondary/30 mb-4" />
        <p className="text-text-secondary">
          Nessuna serie da programmare nella watchlist.
        </p>
        <p className="text-text-secondary text-sm mt-2">
          Aggiungi serie con stato &quot;Da Vedere&quot; o &quot;In Corso&quot; e imposta le ore
          settimanali nelle{" "}
          <Link href="/impostazioni" className="text-accent hover:underline">
            impostazioni
          </Link>
          .
        </p>
      </div>
    );
  }

  const { schedule, stats } = data;
  const allDates = Object.keys(schedule).sort();
  const today = new Date().toISOString().slice(0, 10);

  // Get the week's dates
  const weekStart = new Date();
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() + weekOffset * 7);
  // Align to Monday
  const dayOfWeek = weekStart.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  weekStart.setDate(weekStart.getDate() + mondayOffset);

  const weekDates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    weekDates.push(d.toISOString().slice(0, 10));
  }

  const lastScheduleDate = allDates[allDates.length - 1];
  const maxWeeksAhead = Math.ceil(
    (new Date(lastScheduleDate).getTime() - new Date().getTime()) / (7 * 86400000)
  ) + 1;

  const weekLabel = (() => {
    const ws = new Date(weekDates[0]);
    const we = new Date(weekDates[6]);
    const fmt = (d: Date) =>
      d.toLocaleDateString("it-IT", { day: "numeric", month: "short" });
    return `${fmt(ws)} — ${fmt(we)}`;
  })();

  // Weekly stats
  const weekMinutes = weekDates.reduce((sum, date) => {
    const entries = schedule[date] || [];
    return sum + entries.reduce((s, e) => s + e.minutes, 0);
  }, 0);
  const weekEpisodes = weekDates.reduce((sum, date) => {
    const entries = schedule[date] || [];
    return sum + entries.reduce((s, e) => s + e.episodes, 0);
  }, 0);

  return (
    <div className="space-y-4">
      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-xl bg-bg-card border border-border text-center">
          <p className="text-2xl font-bold text-accent-light">{stats.seriesCount}</p>
          <p className="text-[11px] text-text-secondary">Serie</p>
        </div>
        <div className="p-3 rounded-xl bg-bg-card border border-border text-center">
          <p className="text-2xl font-bold text-accent-light">{stats.totalEpisodes}</p>
          <p className="text-[11px] text-text-secondary">Episodi totali</p>
        </div>
        <div className="p-3 rounded-xl bg-bg-card border border-border text-center">
          <p className="text-2xl font-bold text-accent-light">{stats.totalHours}h</p>
          <p className="text-[11px] text-text-secondary">Ore di visione</p>
        </div>
        <div className="p-3 rounded-xl bg-bg-card border border-border text-center">
          <p className="text-2xl font-bold text-accent-light">{stats.daysNeeded}</p>
          <p className="text-[11px] text-text-secondary">Giorni necessari</p>
        </div>
      </div>

      {/* Week navigator */}
      <div className="flex items-center justify-between bg-bg-card rounded-xl border border-border p-4">
        <button
          onClick={() => setWeekOffset((w) => Math.max(0, w - 1))}
          disabled={weekOffset <= 0}
          className="p-2 rounded-lg hover:bg-bg-secondary transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronLeft size={20} />
        </button>
        <div className="text-center">
          <h2 className="text-sm font-semibold capitalize">{weekLabel}</h2>
          {weekOffset === 0 && (
            <p className="text-[11px] text-accent">Questa settimana</p>
          )}
        </div>
        <button
          onClick={() => setWeekOffset((w) => Math.min(maxWeeksAhead, w + 1))}
          disabled={weekOffset >= maxWeeksAhead}
          className="p-2 rounded-lg hover:bg-bg-secondary transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Week summary */}
      {weekEpisodes > 0 && (
        <div className="flex items-center gap-4 text-xs text-text-secondary px-1">
          <span className="flex items-center gap-1">
            <Zap size={12} className="text-accent" />
            {weekEpisodes} episodi
          </span>
          <span className="flex items-center gap-1">
            <Timer size={12} className="text-accent" />
            {Math.round(weekMinutes / 60 * 10) / 10}h
          </span>
        </div>
      )}

      {/* Day columns */}
      <div className="space-y-3">
        {weekDates.map((date) => {
          const entries = schedule[date] || [];
          const d = new Date(date);
          const isToday = date === today;
          const isPast = date < today;
          const dayName = d.toLocaleDateString("it-IT", { weekday: "short" });
          const dayNum = d.getDate();
          const dayMinutes = entries.reduce((s, e) => s + e.minutes, 0);

          return (
            <div
              key={date}
              className={`rounded-xl border transition-colors ${
                isToday
                  ? "bg-accent/5 border-accent/30"
                  : isPast
                  ? "bg-bg-card/50 border-border/50 opacity-60"
                  : "bg-bg-card border-border"
              }`}
            >
              {/* Day header */}
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/50">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                      isToday
                        ? "bg-accent text-white"
                        : "bg-bg-secondary text-text-secondary"
                    }`}
                  >
                    {dayNum}
                  </span>
                  <span
                    className={`text-sm font-medium capitalize ${
                      isToday ? "text-accent" : "text-text-primary"
                    }`}
                  >
                    {dayName}
                    {isToday && (
                      <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full bg-accent/20 text-accent font-bold uppercase">
                        Oggi
                      </span>
                    )}
                  </span>
                </div>
                {dayMinutes > 0 && (
                  <span className="text-[11px] text-text-secondary flex items-center gap-1">
                    <Clock size={11} />
                    {dayMinutes >= 60
                      ? `${Math.floor(dayMinutes / 60)}h ${dayMinutes % 60 > 0 ? `${dayMinutes % 60}m` : ""}`
                      : `${dayMinutes}m`}
                  </span>
                )}
              </div>

              {/* Episodes */}
              {entries.length === 0 ? (
                <div className="px-4 py-3">
                  <p className="text-xs text-text-secondary/50 italic">Giorno libero</p>
                </div>
              ) : (
                <div className="p-2 space-y-1.5">
                  {entries.map((entry, i) => {
                    const priorityColors = {
                      high: "border-l-danger",
                      medium: "border-l-warning",
                      low: "border-l-text-secondary/30",
                    };
                    const borderColor =
                      priorityColors[entry.priority as keyof typeof priorityColors] ||
                      "border-l-border";

                    return (
                      <Link
                        key={`${entry.seriesTmdbId}-${i}`}
                        href={`/serie/${entry.seriesTmdbId}`}
                        className={`flex items-center gap-3 p-2.5 rounded-lg bg-bg-secondary/50 border-l-[3px] ${borderColor} hover:bg-bg-secondary transition-colors`}
                      >
                        <div className="w-9 h-13 rounded overflow-hidden relative flex-shrink-0">
                          <Image
                            src={imageUrl(entry.posterPath, "w92")}
                            alt={entry.seriesName}
                            fill
                            className="object-cover"
                            sizes="36px"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-text-primary truncate">
                            {entry.seriesName}
                          </p>
                          <p className="text-xs text-text-secondary">
                            {entry.episodes === 1
                              ? `Ep. ${entry.episodeFrom}`
                              : `Ep. ${entry.episodeFrom}–${entry.episodeTo}`}
                            <span className="mx-1">&middot;</span>
                            {entry.minutes >= 60
                              ? `${Math.floor(entry.minutes / 60)}h ${entry.minutes % 60 > 0 ? `${entry.minutes % 60}m` : ""}`
                              : `${entry.minutes}m`}
                          </p>
                        </div>
                        <span className="text-xs font-medium text-accent-light tabular-nums flex-shrink-0">
                          {entry.episodes} ep
                        </span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Releases View (existing calendar logic) ────────────────

function ReleasesView() {
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return { month: now.getMonth(), year: now.getFullYear() };
  });

  useEffect(() => {
    const controller = new AbortController();

    const fetchCalendar = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/watchlist", { signal: controller.signal });
        const watchlist: WatchlistSeries[] = await res.json();
        if (!Array.isArray(watchlist)) {
          setEpisodes([]);
          return;
        }

        const activeSeries = watchlist.filter(
          (w) =>
            w.series.status === "Returning Series" ||
            w.series.status === "In Production" ||
            w.series.status === "Planned"
        );

        if (activeSeries.length === 0) {
          setEpisodes([]);
          return;
        }

        const allEpisodes: Episode[] = [];
        const errors: string[] = [];

        await Promise.all(
          activeSeries.map(async (w) => {
            try {
              const detailRes = await fetch(
                `/api/tmdb/series/${w.series.tmdbId}`,
                { signal: controller.signal }
              );
              if (!detailRes.ok) {
                errors.push(`${w.series.name}: errore dettagli`);
                return;
              }
              const detail = await detailRes.json();
              const latestSeason = detail.number_of_seasons;

              if (!latestSeason || latestSeason < 1) return;

              const epRes = await fetch(
                `/api/tmdb/season?seriesId=${w.series.tmdbId}&season=${latestSeason}`,
                { signal: controller.signal }
              );
              if (!epRes.ok) {
                errors.push(
                  `${w.series.name}: errore episodi S${latestSeason}`
                );
                return;
              }
              const epData = await epRes.json();

              if (epData.episodes && Array.isArray(epData.episodes)) {
                for (const ep of epData.episodes) {
                  if (ep.air_date) {
                    allEpisodes.push({
                      seriesName: w.series.name,
                      seriesPoster: w.series.posterPath,
                      tmdbId: w.series.tmdbId,
                      seasonNumber: ep.season_number,
                      episodeNumber: ep.episode_number,
                      name: ep.name || `Episodio ${ep.episode_number}`,
                      airDate: ep.air_date,
                    });
                  }
                }
              }
            } catch (err) {
              if (err instanceof DOMException && err.name === "AbortError")
                return;
              errors.push(`${w.series.name}: errore di rete`);
            }
          })
        );

        setEpisodes(allEpisodes);
        if (errors.length > 0) {
          setError(`Problemi con: ${errors.join(", ")}`);
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError("Errore nel caricamento del calendario");
        setEpisodes([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCalendar();
    return () => controller.abort();
  }, []);

  const monthStr = new Date(
    currentMonth.year,
    currentMonth.month
  ).toLocaleDateString("it-IT", { month: "long", year: "numeric" });

  const now = new Date();
  const minDate = new Date(now.getFullYear(), now.getMonth() - 6);
  const maxDate = new Date(now.getFullYear(), now.getMonth() + 12);

  const canGoPrev =
    new Date(currentMonth.year, currentMonth.month - 1) >= minDate;
  const canGoNext =
    new Date(currentMonth.year, currentMonth.month + 1) <= maxDate;

  const prevMonth = () => {
    if (!canGoPrev) return;
    setCurrentMonth((prev) => {
      const d = new Date(prev.year, prev.month - 1);
      return { month: d.getMonth(), year: d.getFullYear() };
    });
  };

  const nextMonth = () => {
    if (!canGoNext) return;
    setCurrentMonth((prev) => {
      const d = new Date(prev.year, prev.month + 1);
      return { month: d.getMonth(), year: d.getFullYear() };
    });
  };

  const monthEpisodes = episodes
    .filter((ep) => {
      const d = new Date(ep.airDate);
      return (
        d.getMonth() === currentMonth.month &&
        d.getFullYear() === currentMonth.year
      );
    })
    .sort((a, b) => a.airDate.localeCompare(b.airDate));

  const grouped = monthEpisodes.reduce<Record<string, Episode[]>>(
    (acc, ep) => {
      if (!acc[ep.airDate]) acc[ep.airDate] = [];
      acc[ep.airDate].push(ep);
      return acc;
    },
    {}
  );

  const today = new Date().toISOString().slice(0, 10);
  const todayCount = episodes.filter((e) => e.airDate === today).length;
  const upcomingCount = episodes.filter((e) => e.airDate > today).length;

  return (
    <div className="space-y-6">
      {!loading && episodes.length > 0 && (
        <p className="text-text-secondary text-sm">
          {todayCount > 0 && `${todayCount} oggi \u00B7 `}
          {upcomingCount} in arrivo
        </p>
      )}

      {error && (
        <div className="flex items-start gap-3 p-3 rounded-lg bg-warning/10 border border-warning/30">
          <AlertCircle
            size={16}
            className="text-warning flex-shrink-0 mt-0.5"
          />
          <p className="text-xs text-warning">{error}</p>
        </div>
      )}

      {/* Month nav */}
      <div className="flex items-center justify-between bg-bg-card rounded-xl border border-border p-4">
        <button
          onClick={prevMonth}
          disabled={!canGoPrev}
          className="p-2 rounded-lg hover:bg-bg-secondary transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronLeft size={20} />
        </button>
        <h2 className="text-lg font-semibold capitalize">{monthStr}</h2>
        <button
          onClick={nextMonth}
          disabled={!canGoNext}
          className="p-2 rounded-lg hover:bg-bg-secondary transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={32} className="animate-spin text-accent" />
          <span className="ml-3 text-text-secondary">
            Caricamento episodi...
          </span>
        </div>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="text-center py-16">
          <CalendarDays
            size={48}
            className="mx-auto text-text-secondary/30 mb-4"
          />
          <p className="text-text-secondary">
            Nessuna uscita questo mese per le serie in watchlist
          </p>
          <p className="text-text-secondary text-sm mt-2">
            Mostriamo le uscite per serie &quot;Returning&quot;, &quot;In
            Production&quot; e &quot;Planned&quot;
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([date, eps]) => {
            const d = new Date(date);
            const isToday = date === today;
            const isPast = date < today;
            const dayStr = d.toLocaleDateString("it-IT", {
              weekday: "long",
              day: "numeric",
              month: "long",
            });

            return (
              <div key={date}>
                <h3
                  className={`text-sm font-semibold mb-3 capitalize flex items-center gap-2 ${
                    isToday
                      ? "text-accent"
                      : isPast
                      ? "text-text-secondary/50"
                      : "text-accent-light"
                  }`}
                >
                  {dayStr}
                  {isToday && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent/20 text-accent font-bold uppercase">
                      Oggi
                    </span>
                  )}
                </h3>
                <div className="space-y-2">
                  {eps.map((ep) => (
                    <Link
                      key={`${ep.tmdbId}-${ep.seasonNumber}-${ep.episodeNumber}`}
                      href={`/serie/${ep.tmdbId}`}
                      className={`flex items-center gap-3 p-3 rounded-lg bg-bg-card border border-border hover:border-accent/30 transition-colors ${
                        isPast ? "opacity-60" : ""
                      }`}
                    >
                      <div className="w-10 h-14 rounded overflow-hidden relative flex-shrink-0">
                        <Image
                          src={imageUrl(ep.seriesPoster, "w92")}
                          alt={ep.seriesName}
                          fill
                          className="object-cover"
                          sizes="40px"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text-primary truncate">
                          {ep.seriesName}
                        </p>
                        <p className="text-xs text-text-secondary">
                          S{ep.seasonNumber}E{ep.episodeNumber} &mdash;{" "}
                          {ep.name}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
