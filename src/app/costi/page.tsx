"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  DollarSign,
  TrendingDown,
  Wallet,
  PieChart,
  Loader2,
  Settings,
  AlertTriangle,
  ChevronRight,
} from "lucide-react";
import { getPaidPlatforms, getFreePlatforms } from "@/lib/platforms";

interface RotationSummary {
  summary: {
    monthlyBudget: number;
    alwaysOnCost?: number;
    totalPlatformsCost: number;
    rotationMonthlyCost: number;
    monthlySavings: number;
    watchlistTotal: number;
    platformsNeeded: number;
    alwaysOnPlatforms?: string[];
  };
  scoredPlatforms: {
    name: string;
    slug: string;
    color: string;
    monthlyPrice: number;
    isFree: boolean;
    seriesAvailable: { name: string }[];
    score: number;
    costPerSeries: number;
  }[];
  message?: string;
}

export default function CostiPage() {
  const [data, setData] = useState<RotationSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/rotation?months=6")
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  const paidPlatforms = getPaidPlatforms();
  const freePlatforms = getFreePlatforms();
  const allPaidTotal = paidPlatforms.reduce(
    (sum, p) => sum + p.monthlyPrice,
    0
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 size={32} className="animate-spin text-accent" />
      </div>
    );
  }

  // Empty state when no watchlist data
  if (data?.message || !data?.scoredPlatforms?.length) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
          <DollarSign size={24} />
          Costi & Risparmio
        </h1>
        <div className="text-center py-16 bg-bg-card rounded-xl border border-border">
          <Wallet size={48} className="mx-auto text-text-secondary/30 mb-4" />
          <p className="text-text-secondary text-lg">
            Aggiungi serie alla watchlist per vedere l&apos;analisi dei costi
          </p>
          <Link
            href="/cerca"
            className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-accent text-white rounded-lg text-sm hover:bg-accent-light transition-colors"
          >
            Cerca Serie <ChevronRight size={16} />
          </Link>
        </div>

        {/* Still show platform prices even with empty watchlist */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-text-primary">
            Listino Piattaforme
          </h2>
          <div className="space-y-3">
            {paidPlatforms.map((p) => (
              <div
                key={p.slug}
                className="flex items-center gap-4 p-4 rounded-xl bg-bg-card border border-border"
              >
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-lg"
                  style={{ backgroundColor: p.color }}
                >
                  {p.icon}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-text-primary">{p.name}</p>
                </div>
                <p className="font-bold text-text-primary">
                  &euro;{p.monthlyPrice.toFixed(2)}/mese
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const summary = data.summary;
  const scored = data.scoredPlatforms;
  const overBudget = summary.monthlyBudget > 0 && summary.rotationMonthlyCost > summary.monthlyBudget;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
          <DollarSign size={24} />
          Costi & Risparmio
        </h1>
        <Link
          href="/impostazioni"
          className="flex items-center gap-1 text-sm text-text-secondary hover:text-accent-light transition-colors"
        >
          <Settings size={14} />
          Budget: &euro;{summary.monthlyBudget.toFixed(2)}/mese
        </Link>
      </div>

      {/* Budget warning */}
      {overBudget && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-danger/10 border border-danger/30">
          <AlertTriangle size={18} className="text-danger flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-danger">
              Il costo medio con rotazione (&euro;{summary.rotationMonthlyCost.toFixed(2)}) supera il tuo budget (&euro;{summary.monthlyBudget.toFixed(2)})
            </p>
            <p className="text-xs text-text-secondary mt-1">
              Prova a ridurre le serie in watchlist o ad aumentare il budget nelle{" "}
              <Link href="/impostazioni" className="text-accent-light underline">
                impostazioni
              </Link>
            </p>
          </div>
        </div>
      )}

      {/* Overview cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-6 rounded-xl bg-danger/10 border border-danger/30">
          <div className="flex items-center gap-2 text-danger text-sm mb-2">
            <Wallet size={16} />
            Se avessi TUTTO attivo
          </div>
          <p className="text-3xl font-bold text-danger">
            &euro;{allPaidTotal.toFixed(2)}/mese
          </p>
          <p className="text-xs text-text-secondary mt-1">
            {paidPlatforms.length} piattaforme a pagamento
          </p>
        </div>

        <div className="p-6 rounded-xl bg-accent/10 border border-accent/30">
          <div className="flex items-center gap-2 text-accent-light text-sm mb-2">
            <PieChart size={16} />
            Con Rotation Planner
          </div>
          <p className="text-3xl font-bold text-accent-light">
            &euro;{summary.rotationMonthlyCost.toFixed(2)}/mese
          </p>
          <p className="text-xs text-text-secondary mt-1">
            Media mensile con rotazione
            {summary.alwaysOnCost != null && summary.alwaysOnCost > 0 && (
              <span> (incl. &euro;{summary.alwaysOnCost.toFixed(2)} sempre attive)</span>
            )}
          </p>
        </div>

        <div className="p-6 rounded-xl bg-success/10 border border-success/30">
          <div className="flex items-center gap-2 text-success text-sm mb-2">
            <TrendingDown size={16} />
            Risparmio
          </div>
          <p className="text-3xl font-bold text-success">
            &euro;{summary.monthlySavings.toFixed(2)}/mese
          </p>
          <p className="text-xs text-text-secondary mt-1">
            {summary.totalPlatformsCost > 0
              ? `${((summary.monthlySavings / summary.totalPlatformsCost) * 100).toFixed(0)}% in meno`
              : "Nessun costo da confrontare"}
          </p>
        </div>
      </div>

      {/* Platform breakdown */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-text-primary">
          Piattaforme a Pagamento
        </h2>
        <div className="space-y-3">
          {paidPlatforms.map((p) => {
            const scored_p = scored.find((s) => s.slug === p.slug);
            const seriesCount = scored_p?.seriesAvailable.length || 0;
            const costPerSeries = scored_p?.costPerSeries;
            const isAlwaysOn = summary.alwaysOnPlatforms?.includes(p.slug);

            return (
              <div
                key={p.slug}
                className={`flex items-center gap-4 p-4 rounded-xl bg-bg-card border ${
                  isAlwaysOn ? "border-accent/40" : "border-border"
                }`}
              >
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-lg"
                  style={{ backgroundColor: p.color }}
                >
                  {p.icon}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-text-primary flex items-center gap-2">
                    {p.name}
                    {isAlwaysOn && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent/10 text-accent-light font-medium">
                        sempre attiva
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-text-secondary">
                    {seriesCount > 0
                      ? `${seriesCount} serie nella tua watchlist`
                      : "Nessuna serie in watchlist"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-text-primary">
                    &euro;{p.monthlyPrice.toFixed(2)}/mese
                  </p>
                  {costPerSeries !== undefined && seriesCount > 0 && (
                    <p className="text-xs text-text-secondary">
                      &euro;{costPerSeries.toFixed(2)}/serie
                    </p>
                  )}
                </div>
                {/* Value bar */}
                <div className="w-24 h-2 rounded-full bg-bg-secondary overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(
                        (seriesCount / Math.max(1, summary.watchlistTotal)) * 100,
                        100
                      )}%`,
                      backgroundColor: p.color,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Free platforms */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-text-primary">
          Piattaforme Gratuite
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {freePlatforms.map((p) => {
            const scored_p = scored.find((s) => s.slug === p.slug);
            const seriesCount = scored_p?.seriesAvailable.length || 0;

            return (
              <div
                key={p.slug}
                className="p-4 rounded-xl bg-bg-card border border-border"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{p.icon}</span>
                  <div>
                    <p className="font-medium text-text-primary">{p.name}</p>
                    <p className="text-xs text-success">GRATIS</p>
                  </div>
                </div>
                {seriesCount > 0 && (
                  <p className="text-xs text-text-secondary mt-2">
                    {seriesCount} serie disponibili
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Annual projection */}
      <div className="p-6 rounded-xl bg-bg-card border border-border">
        <h2 className="text-lg font-semibold text-text-primary mb-4">
          Proiezione Annuale
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-text-secondary">
              Senza rotazione (12 mesi)
            </p>
            <p className="text-2xl font-bold text-danger">
              &euro;{(summary.totalPlatformsCost * 12).toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-sm text-text-secondary">
              Con rotazione (12 mesi)
            </p>
            <p className="text-2xl font-bold text-success">
              &euro;{(summary.rotationMonthlyCost * 12).toFixed(2)}
            </p>
          </div>
        </div>
        <div className="mt-4 p-4 rounded-lg bg-success/10 border border-success/30">
          <p className="text-success font-bold text-lg">
            Risparmio annuo: &euro;{(summary.monthlySavings * 12).toFixed(2)}
          </p>
        </div>
      </div>
    </div>
  );
}
