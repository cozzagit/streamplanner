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
  Clock,
  CheckCircle,
  ExternalLink,
} from "lucide-react";
import { getPaidPlatforms, getFreePlatforms, getPlatformBySlug, getPlatformUrl } from "@/lib/platforms";

interface ActiveSubEntry {
  name: string;
  slug: string;
  color: string;
  monthlyPrice: number;
  seriesCovered: number;
  totalHours: number;
  coveredSeries: { name: string; hours: number }[];
}

interface PlanMonth {
  mainPlatform: {
    name: string;
    slug: string;
    color: string;
    monthlyPrice: number;
    coveredSeries: { name: string; hours?: number; episodes?: number }[];
  };
  estimatedCost: number;
  totalHoursOnPlatform: number;
  monthsForPlatform: number;
  currentMonthOfPlatform: number;
}

interface RotationData {
  plans: PlanMonth[];
  activeSubscriptions?: ActiveSubEntry[];
  summary: {
    monthlyBudget: number;
    weeklyHours: number;
    monthlyViewingHours: number;
    alwaysOnCost?: number;
    activeSubsCost?: number;
    totalPlatformsCost: number;
    rotationMonthlyCost: number;
    monthlySavings: number;
    watchlistTotal: number;
    totalViewingHours: number;
    platformsNeeded: number;
    monthsInPlan: number;
    alwaysOnPlatforms?: string[];
    activeSubscriptions?: string[];
  };
  message?: string;
}

export default function CostiPage() {
  const [data, setData] = useState<RotationData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/rotation?months=12&_t=${Date.now()}`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  const paidPlatforms = getPaidPlatforms();
  const freePlatforms = getFreePlatforms();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 size={32} className="animate-spin text-accent" />
      </div>
    );
  }

  if (data?.message || !data?.summary) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
          <DollarSign size={24} />
          Costi & Risparmio
        </h1>
        <div className="text-center py-16 bg-bg-card rounded-xl border border-border">
          <Wallet size={48} className="mx-auto text-text-secondary/30 mb-4" />
          <p className="text-text-secondary text-lg">
            {data?.message || "Aggiungi serie alla watchlist per vedere l'analisi dei costi"}
          </p>
          <Link
            href="/cerca"
            className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-accent text-white rounded-lg text-sm hover:bg-accent-light transition-colors"
          >
            Cerca Serie <ChevronRight size={16} />
          </Link>
        </div>
      </div>
    );
  }

  const { summary, plans, activeSubscriptions } = data;
  const overBudget = summary.monthlyBudget > 0 && summary.rotationMonthlyCost > summary.monthlyBudget;

  // Active subs cost (user already pays this)
  const activeSubsCost = summary.activeSubsCost || 0;

  // Total cost if user subscribed to ALL platforms needed (rotation + active)
  const allNeededCost = summary.totalPlatformsCost + activeSubsCost;

  // With rotation: active subs (fixed) + rotation average
  const withRotationCost = activeSubsCost + summary.rotationMonthlyCost;

  // Savings = difference
  const savings = allNeededCost - withRotationCost;

  // Build platform usage map from plans (deduplicate multi-month)
  const platformUsage = new Map<string, {
    name: string; slug: string; color: string; monthlyPrice: number;
    months: number; totalHours: number; series: string[];
  }>();
  for (const plan of plans) {
    const mp = plan.mainPlatform;
    if (!platformUsage.has(mp.slug)) {
      platformUsage.set(mp.slug, {
        name: mp.name, slug: mp.slug, color: mp.color, monthlyPrice: mp.monthlyPrice,
        months: 0, totalHours: plan.totalHoursOnPlatform,
        series: mp.coveredSeries.map((s) => s.name),
      });
    }
    if (plan.currentMonthOfPlatform === 1 || !platformUsage.get(mp.slug)!.series.length) {
      platformUsage.get(mp.slug)!.series = mp.coveredSeries.map((s) => s.name);
    }
    platformUsage.get(mp.slug)!.months++;
  }

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

      {overBudget && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-danger/10 border border-danger/30">
          <AlertTriangle size={18} className="text-danger flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-danger">
              Il costo rotazione (&euro;{summary.rotationMonthlyCost.toFixed(2)}) supera il budget (&euro;{summary.monthlyBudget.toFixed(2)})
            </p>
            <p className="text-xs text-text-secondary mt-1">
              Riduci le serie o aumenta il budget nelle{" "}
              <Link href="/impostazioni" className="text-accent-light underline">impostazioni</Link>
            </p>
          </div>
        </div>
      )}

      {/* Overview cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-6 rounded-xl bg-danger/10 border border-danger/30">
          <div className="flex items-center gap-2 text-danger text-sm mb-2">
            <Wallet size={16} />
            Tutte le piattaforme necessarie
          </div>
          <p className="text-3xl font-bold text-danger">
            &euro;{allNeededCost.toFixed(2)}/mese
          </p>
          <p className="text-xs text-text-secondary mt-1">
            {summary.platformsNeeded} in rotazione + {activeSubscriptions?.length || 0} abbonamenti attivi
          </p>
        </div>

        <div className="p-6 rounded-xl bg-accent/10 border border-accent/30">
          <div className="flex items-center gap-2 text-accent-light text-sm mb-2">
            <PieChart size={16} />
            Con rotazione
          </div>
          <p className="text-3xl font-bold text-accent-light">
            &euro;{withRotationCost.toFixed(2)}/mese
          </p>
          <p className="text-xs text-text-secondary mt-1">
            &euro;{activeSubsCost.toFixed(2)} abbonamenti + &euro;{summary.rotationMonthlyCost.toFixed(2)} rotazione media
          </p>
        </div>

        <div className="p-6 rounded-xl bg-success/10 border border-success/30">
          <div className="flex items-center gap-2 text-success text-sm mb-2">
            <TrendingDown size={16} />
            Risparmio mensile
          </div>
          <p className="text-3xl font-bold text-success">
            &euro;{savings.toFixed(2)}/mese
          </p>
          <p className="text-xs text-text-secondary mt-1">
            {allNeededCost > 0
              ? `${Math.round((savings / allNeededCost) * 100)}% in meno`
              : "Nessun costo extra"}
          </p>
        </div>
      </div>

      {/* Active subscriptions */}
      {activeSubscriptions && activeSubscriptions.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">
            <CheckCircle size={18} className="text-success" />
            I tuoi abbonamenti
          </h2>
          <div className="space-y-2">
            {activeSubscriptions.map((sub) => (
              <div key={sub.slug} className="flex items-center gap-4 p-4 rounded-xl bg-bg-card border border-success/30">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-sm font-bold"
                  style={{ backgroundColor: sub.color }}
                >
                  {sub.seriesCovered}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-text-primary">{sub.name}</p>
                  <p className="text-xs text-text-secondary">
                    {sub.seriesCovered} serie &middot; {sub.totalHours}h di contenuto
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-text-primary">&euro;{sub.monthlyPrice.toFixed(2)}/mese</p>
                  <p className="text-[10px] text-success font-medium">ATTIVO</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rotation platforms */}
      {platformUsage.size > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-text-primary">
            Piattaforme in rotazione
          </h2>
          <div className="space-y-2">
            {[...platformUsage.values()].map((p) => {
              const totalCost = p.monthlyPrice * p.months;
              const platformConfig = getPlatformBySlug(p.slug);
              const outboundUrl = platformConfig ? getPlatformUrl(platformConfig) : null;
              return (
                <div key={p.slug} className="flex items-center gap-4 p-4 rounded-xl bg-bg-card border border-border">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-sm font-bold"
                    style={{ backgroundColor: p.color }}
                  >
                    {p.months}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-text-primary">{p.name}</p>
                    <p className="text-xs text-text-secondary">
                      {p.series.length > 0 ? p.series.join(", ") : "Serie in rotazione"}
                    </p>
                    <p className="text-xs text-text-secondary flex items-center gap-1 mt-0.5">
                      <Clock size={10} />
                      {p.totalHours}h &middot; {p.months} {p.months === 1 ? "mese" : "mesi"}
                    </p>
                  </div>
                  <div className="text-right flex flex-col items-end gap-1.5">
                    <p className="font-bold text-text-primary">&euro;{p.monthlyPrice.toFixed(2)}/mese</p>
                    <p className="text-xs text-text-secondary">Totale: &euro;{totalCost.toFixed(2)}</p>
                    {outboundUrl && (
                      <a
                        href={outboundUrl}
                        target="_blank"
                        rel="noopener noreferrer sponsored"
                        className="inline-flex items-center gap-1 text-[11px] px-3 py-1 rounded-lg font-medium text-white transition-opacity hover:opacity-90"
                        style={{ backgroundColor: p.color }}
                      >
                        Abbonati <ExternalLink size={10} />
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Free platforms */}
      {freePlatforms.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-text-primary">
            Piattaforme gratuite
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {freePlatforms.map((p) => (
              <a
                key={p.slug}
                href={getPlatformUrl(p)}
                target="_blank"
                rel="noopener noreferrer"
                className="p-4 rounded-xl bg-bg-card border border-border hover:border-accent/50 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{p.icon}</span>
                  <div className="flex-1">
                    <p className="font-medium text-text-primary">{p.name}</p>
                    <p className="text-xs text-success">GRATIS</p>
                  </div>
                  <ExternalLink size={14} className="text-text-secondary/30 group-hover:text-accent-light transition-colors" />
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Annual projection */}
      <div className="p-6 rounded-xl bg-bg-card border border-border">
        <h2 className="text-lg font-semibold text-text-primary mb-4">
          Proiezione Annuale
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-text-secondary">Senza rotazione</p>
            <p className="text-2xl font-bold text-danger">
              &euro;{(allNeededCost * 12).toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-sm text-text-secondary">Con rotazione</p>
            <p className="text-2xl font-bold text-success">
              &euro;{(withRotationCost * 12).toFixed(2)}
            </p>
          </div>
        </div>
        <div className="mt-4 p-4 rounded-lg bg-success/10 border border-success/30">
          <p className="text-success font-bold text-lg">
            Risparmio annuo: &euro;{(savings * 12).toFixed(2)}
          </p>
        </div>
      </div>

      {/* Affiliate disclosure */}
      <p className="text-[10px] text-text-secondary/40">
        Alcuni link potrebbero essere affiliati. StreamPlanner potrebbe ricevere una commissione senza costi aggiuntivi per te.
      </p>
    </div>
  );
}
