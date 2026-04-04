"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { CalendarDays, ChevronLeft, ChevronRight, Loader2, AlertCircle } from "lucide-react";
import { imageUrl } from "@/lib/tmdb";

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

export default function CalendarioPage() {
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

        // Include series that may still have upcoming episodes
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
                errors.push(`${w.series.name}: errore episodi S${latestSeason}`);
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
              if (err instanceof DOMException && err.name === "AbortError") return;
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

  // Limit navigation to reasonable bounds (6 months back, 12 months forward)
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

  // Filter episodes for current month
  const monthEpisodes = episodes
    .filter((ep) => {
      const d = new Date(ep.airDate);
      return (
        d.getMonth() === currentMonth.month &&
        d.getFullYear() === currentMonth.year
      );
    })
    .sort((a, b) => a.airDate.localeCompare(b.airDate));

  // Group by date
  const grouped = monthEpisodes.reduce<Record<string, Episode[]>>(
    (acc, ep) => {
      if (!acc[ep.airDate]) acc[ep.airDate] = [];
      acc[ep.airDate].push(ep);
      return acc;
    },
    {}
  );

  // Count today's and upcoming episodes
  const today = new Date().toISOString().slice(0, 10);
  const todayCount = episodes.filter((e) => e.airDate === today).length;
  const upcomingCount = episodes.filter((e) => e.airDate > today).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
          <CalendarDays size={24} />
          Calendario Uscite
        </h1>
        {!loading && episodes.length > 0 && (
          <p className="text-text-secondary text-sm mt-1">
            {todayCount > 0 && `${todayCount} oggi \u00B7 `}
            {upcomingCount} in arrivo
          </p>
        )}
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-start gap-3 p-3 rounded-lg bg-warning/10 border border-warning/30">
          <AlertCircle size={16} className="text-warning flex-shrink-0 mt-0.5" />
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
            Mostriamo le uscite per serie &quot;Returning&quot;, &quot;In Production&quot; e &quot;Planned&quot;
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
                <h3 className={`text-sm font-semibold mb-3 capitalize flex items-center gap-2 ${
                  isToday
                    ? "text-accent"
                    : isPast
                    ? "text-text-secondary/50"
                    : "text-accent-light"
                }`}>
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
