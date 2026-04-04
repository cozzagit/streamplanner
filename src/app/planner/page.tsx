"use client";

import { useState, useEffect } from "react";
import {
  RotateCcw,
  Calendar,
  DollarSign,
  TrendingDown,
  Tv,
  ChevronRight,
  Loader2,
  ArrowRight,
  CheckCircle,
  AlertTriangle,
  Lock,
  Shield,
} from "lucide-react";

interface CoveredSeries {
  seriesId?: string;
  name: string;
  priority: string;
}

interface PlatformEntry {
  platformId: string;
  name: string;
  slug: string;
  color: string;
  monthlyPrice: number;
  isFree: boolean;
  coveredSeries: CoveredSeries[];
}

interface PlanMonth {
  month: number;
  year: number;
  label: string;
  mainPlatform: PlatformEntry;
  alwaysOnPlatforms?: PlatformEntry[];
  freePlatforms: PlatformEntry[];
  estimatedCost: number;
  seriesCovered: number;
  withinBudget?: boolean;
}

interface RotationData {
  plans: PlanMonth[];
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
  message?: string;
}

export default function PlannerPage() {
  const [data, setData] = useState<RotationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [months, setMonths] = useState(6);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<Set<string>>(new Set());

  useEffect(() => {
    setLoading(true);
    fetch(`/api/rotation?months=${months}`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [months]);

  const confirmPlan = async (plan: PlanMonth) => {
    const key = `${plan.month}-${plan.year}`;
    setConfirming(key);
    try {
      const res = await fetch("/api/rotation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          month: plan.month,
          year: plan.year,
          platformId: plan.mainPlatform.platformId,
          estimatedCost: plan.estimatedCost,
          seriesCount: plan.seriesCovered,
          reason: `Rotazione: ${plan.mainPlatform.name} per ${plan.seriesCovered} serie`,
        }),
      });
      if (res.ok) {
        setConfirmed((prev) => new Set(prev).add(key));
      }
    } finally {
      setConfirming(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 size={32} className="animate-spin text-accent" />
      </div>
    );
  }

  if (!data || data.message) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
          <RotateCcw size={24} />
          Rotation Planner
        </h1>
        <div className="text-center py-16 bg-bg-card rounded-xl border border-border">
          <RotateCcw
            size={48}
            className="mx-auto text-text-secondary/30 mb-4"
          />
          <p className="text-text-secondary text-lg">
            {data?.message || "Aggiungi serie alla watchlist per generare il piano di rotazione"}
          </p>
          <a
            href="/cerca"
            className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-accent text-white rounded-lg text-sm hover:bg-accent-light transition-colors"
          >
            Cerca Serie <ChevronRight size={16} />
          </a>
        </div>
      </div>
    );
  }

  const { plans, summary } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
            <RotateCcw size={24} />
            Rotation Planner
          </h1>
          <p className="text-text-secondary mt-1">
            Piano ottimale per i prossimi {months} mesi basato sulla tua watchlist
          </p>
        </div>
        <select
          value={months}
          onChange={(e) => setMonths(Number(e.target.value))}
          className="px-3 py-2 rounded-lg bg-bg-card border border-border text-sm text-text-primary focus:outline-none focus:border-accent"
        >
          <option value={3}>3 mesi</option>
          <option value={6}>6 mesi</option>
          <option value={12}>12 mesi</option>
        </select>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-bg-card border border-border">
          <div className="flex items-center gap-2 text-text-secondary text-xs mb-2">
            <Tv size={14} />
            Serie in watchlist
          </div>
          <p className="text-2xl font-bold text-text-primary">
            {summary.watchlistTotal}
          </p>
        </div>
        <div className="p-4 rounded-xl bg-bg-card border border-border">
          <div className="flex items-center gap-2 text-text-secondary text-xs mb-2">
            <Calendar size={14} />
            Piattaforme necessarie
          </div>
          <p className="text-2xl font-bold text-text-primary">
            {summary.platformsNeeded}
          </p>
        </div>
        <div className="p-4 rounded-xl bg-bg-card border border-border">
          <div className="flex items-center gap-2 text-text-secondary text-xs mb-2">
            <DollarSign size={14} />
            Costo medio/mese
          </div>
          <p className="text-2xl font-bold text-accent-light">
            &euro;{summary.rotationMonthlyCost.toFixed(2)}
          </p>
          {summary.monthlyBudget > 0 && (
            <p className={`text-xs mt-1 ${
              summary.rotationMonthlyCost <= summary.monthlyBudget
                ? "text-success"
                : "text-danger"
            }`}>
              Budget: &euro;{summary.monthlyBudget.toFixed(2)}/mese
            </p>
          )}
        </div>
        <div className="p-4 rounded-xl bg-success/10 border border-success/30">
          <div className="flex items-center gap-2 text-success text-xs mb-2">
            <TrendingDown size={14} />
            Risparmio/mese
          </div>
          <p className="text-2xl font-bold text-success">
            &euro;{summary.monthlySavings.toFixed(2)}
          </p>
          <p className="text-xs text-text-secondary mt-1">
            vs &euro;{summary.totalPlatformsCost.toFixed(2)}/mese (tutte attive)
          </p>
        </div>
      </div>

      {/* Always-on info */}
      {summary.alwaysOnPlatforms && summary.alwaysOnPlatforms.length > 0 && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-accent/5 border border-accent/20">
          <Lock size={16} className="text-accent flex-shrink-0" />
          <div>
            <p className="text-sm text-text-primary">
              <span className="font-medium">Sempre attive:</span>{" "}
              {summary.alwaysOnPlatforms.join(", ")}
            </p>
            {summary.alwaysOnCost != null && summary.alwaysOnCost > 0 && (
              <p className="text-xs text-text-secondary">
                Costo fisso: &euro;{summary.alwaysOnCost.toFixed(2)}/mese
              </p>
            )}
          </div>
        </div>
      )}

      {/* Monthly timeline */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-text-primary">
          Piano Mensile
        </h2>
        {plans.map((plan, i) => {
          const planKey = `${plan.month}-${plan.year}`;
          const isConfirmed = confirmed.has(planKey);
          const isConfirming = confirming === planKey;

          return (
            <div
              key={planKey}
              className="relative flex items-start gap-4"
            >
              {/* Timeline connector */}
              {i < plans.length - 1 && (
                <div className="absolute left-5 top-12 bottom-0 w-0.5 bg-border" />
              )}

              {/* Month indicator */}
              <div
                className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold"
                style={{ backgroundColor: plan.mainPlatform.color }}
              >
                {plan.month}
              </div>

              {/* Plan card */}
              <div className={`flex-1 p-4 rounded-xl bg-bg-card border ${
                plan.withinBudget === false
                  ? "border-danger/50"
                  : isConfirmed
                  ? "border-success/50"
                  : "border-border"
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-text-primary capitalize">
                      {plan.label}
                    </h3>
                    {plan.withinBudget === false && (
                      <span className="flex items-center gap-1 text-xs text-danger">
                        <AlertTriangle size={12} />
                        Supera budget
                      </span>
                    )}
                  </div>
                  <span
                    className="px-3 py-1 rounded-full text-sm font-bold text-white"
                    style={{ backgroundColor: plan.mainPlatform.color }}
                  >
                    {plan.estimatedCost === 0
                      ? "GRATIS"
                      : `\u20AC${plan.estimatedCost.toFixed(2)}/mese`}
                  </span>
                </div>

                {/* Main platform */}
                <div className="flex items-center gap-2 mb-3">
                  <ArrowRight size={14} className="text-accent" />
                  <span className="text-sm font-medium text-text-primary">
                    Abbonati a{" "}
                    <span style={{ color: plan.mainPlatform.color }}>
                      {plan.mainPlatform.name}
                    </span>
                  </span>
                </div>

                {/* Series list */}
                <div className="space-y-1">
                  {plan.mainPlatform.coveredSeries.map((s) => (
                    <div
                      key={s.name}
                      className="flex items-center gap-2 text-sm text-text-secondary"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0" />
                      {s.name}
                      {s.priority === "high" && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-danger/20 text-danger">
                          priorita alta
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                {/* Always-on platforms this month */}
                {plan.alwaysOnPlatforms && plan.alwaysOnPlatforms.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <p className="text-xs text-text-secondary mb-1 flex items-center gap-1">
                      <Shield size={10} />
                      Sempre attive:
                    </p>
                    {plan.alwaysOnPlatforms.map((aop) => (
                      <div key={aop.platformId}>
                        <span
                          className="text-xs font-medium"
                          style={{ color: aop.color }}
                        >
                          {aop.name}
                        </span>
                        {aop.coveredSeries.length > 0 && (
                          <span className="text-xs text-text-secondary">
                            {" "}({aop.coveredSeries.length} serie)
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Free platforms this month */}
                {plan.freePlatforms.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <p className="text-xs text-text-secondary mb-1">
                      + Gratis questo mese:
                    </p>
                    {plan.freePlatforms.map((fp) => (
                      <div key={fp.name} className="text-xs text-success">
                        {fp.name} ({fp.coveredSeries.length} serie)
                      </div>
                    ))}
                  </div>
                )}

                {/* Confirm button */}
                <div className="mt-4 pt-3 border-t border-border">
                  <button
                    onClick={() => confirmPlan(plan)}
                    disabled={isConfirmed || isConfirming}
                    className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${
                      isConfirmed
                        ? "bg-success/10 text-success border border-success/30 cursor-default"
                        : "bg-accent text-white hover:bg-accent-light"
                    }`}
                  >
                    {isConfirming ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : isConfirmed ? (
                      <CheckCircle size={14} />
                    ) : (
                      <CheckCircle size={14} />
                    )}
                    {isConfirmed ? "Confermato" : "Conferma Piano"}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
