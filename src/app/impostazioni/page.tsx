"use client";

import { useState, useEffect } from "react";
import { Settings, Save, Loader2, Check, Ban, CreditCard, Clock, Plus, Minus } from "lucide-react";
import { TRACKED_PLATFORMS, DEFAULT_ACTIVE_SUBSCRIPTIONS } from "@/lib/platforms";

const DAY_LABELS = [
  { key: "lun", label: "Lun" },
  { key: "mar", label: "Mar" },
  { key: "mer", label: "Mer" },
  { key: "gio", label: "Gio" },
  { key: "ven", label: "Ven" },
  { key: "sab", label: "Sab" },
  { key: "dom", label: "Dom" },
];

const DEFAULT_WEEKLY: Record<string, number> = {
  lun: 2, mar: 2, mer: 2, gio: 2, ven: 2, sab: 3, dom: 3,
};

export default function ImpostazioniPage() {
  const [budget, setBudget] = useState(15);
  const [alwaysOn, setAlwaysOn] = useState<string[]>([]);
  const [excluded, setExcluded] = useState<string[]>([]);
  const [activeSubs, setActiveSubs] = useState<string[]>(DEFAULT_ACTIVE_SUBSCRIPTIONS);
  const [weeklySchedule, setWeeklySchedule] = useState<Record<string, number>>({ ...DEFAULT_WEEKLY });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        if (data.monthly_budget) setBudget(Number(data.monthly_budget));
        if (data.always_on_platforms) {
          try { setAlwaysOn(JSON.parse(data.always_on_platforms)); } catch { /* ignore */ }
        }
        if (data.excluded_platforms) {
          try { setExcluded(JSON.parse(data.excluded_platforms)); } catch { /* ignore */ }
        }
        if (data.active_subscriptions) {
          try { setActiveSubs(JSON.parse(data.active_subscriptions)); } catch { /* ignore */ }
        }
        if (data.weekly_schedule) {
          try { setWeeklySchedule(JSON.parse(data.weekly_schedule)); } catch { /* ignore */ }
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          monthly_budget: String(budget),
          always_on_platforms: JSON.stringify(alwaysOn),
          excluded_platforms: JSON.stringify(excluded),
          active_subscriptions: JSON.stringify(activeSubs),
          weekly_schedule: JSON.stringify(weeklySchedule),
        }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  const toggleActiveSub = (slug: string) => {
    setActiveSubs((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    );
  };

  const toggleAlwaysOn = (slug: string) => {
    setAlwaysOn((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    );
    setExcluded((prev) => prev.filter((s) => s !== slug));
  };

  const toggleExcluded = (slug: string) => {
    setExcluded((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    );
    setAlwaysOn((prev) => prev.filter((s) => s !== slug));
  };

  const paidPlatforms = TRACKED_PLATFORMS.filter((p) => !p.isFree);
  // Platforms available for rotation = paid, not already active subscriptions
  const rotatablePlatforms = paidPlatforms.filter((p) => !activeSubs.includes(p.slug));

  const alwaysOnCost = rotatablePlatforms
    .filter((p) => alwaysOn.includes(p.slug))
    .reduce((sum, p) => sum + p.monthlyPrice, 0);
  const activeSubsCost = paidPlatforms
    .filter((p) => activeSubs.includes(p.slug))
    .reduce((sum, p) => sum + p.monthlyPrice, 0);
  const remainingBudget = Math.max(0, budget - alwaysOnCost);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 size={32} className="animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
        <Settings size={24} />
        Impostazioni
      </h1>

      {/* Active Subscriptions */}
      <div className="p-6 rounded-xl bg-bg-card border border-border space-y-4">
        <h2 className="font-semibold text-text-primary flex items-center gap-2">
          <CreditCard size={16} />
          I Miei Abbonamenti
        </h2>
        <p className="text-sm text-text-secondary">
          Seleziona le piattaforme a cui sei gia abbonato. Queste saranno escluse
          dalla rotazione e mostrate con il badge &quot;Attivo&quot;.
        </p>
        <div className="grid grid-cols-2 gap-2">
          {paidPlatforms.map((p) => (
            <button
              key={p.slug}
              onClick={() => toggleActiveSub(p.slug)}
              className={`flex items-center gap-2 p-3 rounded-lg border text-sm font-medium transition-colors ${
                activeSubs.includes(p.slug)
                  ? "border-success bg-success/10 text-success"
                  : "border-border bg-bg-secondary text-text-secondary hover:border-success/50"
              }`}
            >
              <span>{p.icon}</span>
              <span>{p.name}</span>
              <span className="ml-auto text-xs">
                &euro;{p.monthlyPrice.toFixed(2)}/m
              </span>
              {activeSubs.includes(p.slug) && (
                <Check size={14} className="text-success" />
              )}
            </button>
          ))}
        </div>
        {activeSubsCost > 0 && (
          <div className="text-xs text-text-secondary bg-bg-secondary p-3 rounded-lg">
            Spesa abbonamenti attivi: &euro;{activeSubsCost.toFixed(2)}/mese
          </div>
        )}
      </div>

      {/* Budget */}
      <div className="p-6 rounded-xl bg-bg-card border border-border space-y-4">
        <h2 className="font-semibold text-text-primary">Budget Rotazione</h2>
        <p className="text-sm text-text-secondary">
          Budget mensile aggiuntivo per le piattaforme in rotazione
          (esclusi i tuoi abbonamenti attivi).
        </p>
        <div className="flex items-center gap-4">
          <input
            type="range"
            min={0}
            max={50}
            step={1}
            value={budget}
            onChange={(e) => setBudget(Number(e.target.value))}
            className="flex-1 accent-accent"
          />
          <span className="text-2xl font-bold text-accent-light min-w-[80px] text-right">
            &euro;{budget.toFixed(2)}
          </span>
        </div>
        <div className="flex justify-between text-xs text-text-secondary">
          <span>&euro;0 (solo gratis)</span>
          <span>&euro;50/mese</span>
        </div>
        {alwaysOnCost > 0 && (
          <div className="text-xs text-text-secondary bg-bg-secondary p-3 rounded-lg">
            Piattaforme sempre attive: &euro;{alwaysOnCost.toFixed(2)}/mese
            &middot; Disponibile per rotazione: &euro;{remainingBudget.toFixed(2)}/mese
          </div>
        )}
      </div>

      {/* Weekly Schedule */}
      <div className="p-6 rounded-xl bg-bg-card border border-border space-y-4">
        <h2 className="font-semibold text-text-primary flex items-center gap-2">
          <Clock size={16} />
          Programmazione Settimanale
        </h2>
        <p className="text-sm text-text-secondary">
          Quante ore dedichi alle serie TV ogni giorno? Il calendario
          distribuira le puntate in base alla tua disponibilita.
        </p>
        <div className="space-y-2">
          {DAY_LABELS.map(({ key, label }) => {
            const hours = weeklySchedule[key] || 0;
            const updateHours = (delta: number) => {
              setWeeklySchedule((prev) => ({
                ...prev,
                [key]: Math.max(0, Math.min(12, (prev[key] || 0) + delta)),
              }));
            };
            return (
              <div
                key={key}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-bg-secondary/50 transition-colors"
              >
                <span className="w-10 text-sm font-medium text-text-primary">
                  {label}
                </span>
                <div className="flex-1 h-2 bg-bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent rounded-full transition-all"
                    style={{ width: `${(hours / 8) * 100}%` }}
                  />
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => updateHours(-0.5)}
                    disabled={hours <= 0}
                    className="p-1 rounded-md bg-bg-secondary text-text-secondary hover:text-text-primary hover:bg-bg-secondary/80 transition-colors disabled:opacity-30"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="w-12 text-center text-sm font-semibold text-accent-light tabular-nums">
                    {hours}h
                  </span>
                  <button
                    type="button"
                    onClick={() => updateHours(0.5)}
                    disabled={hours >= 12}
                    className="p-1 rounded-md bg-bg-secondary text-text-secondary hover:text-text-primary hover:bg-bg-secondary/80 transition-colors disabled:opacity-30"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        <div className="text-xs text-text-secondary bg-bg-secondary p-3 rounded-lg">
          Totale settimanale: {Object.values(weeklySchedule).reduce((a, b) => a + b, 0)}h
          &middot; ~{Math.round(Object.values(weeklySchedule).reduce((a, b) => a + b, 0) / 0.75)} episodi/settimana (da ~45 min)
        </div>
      </div>

      {/* Always-on platforms (only non-active-subscription platforms) */}
      {rotatablePlatforms.length > 0 && (
        <div className="p-6 rounded-xl bg-bg-card border border-border space-y-4">
          <h2 className="font-semibold text-text-primary">
            Piattaforme &quot;Sempre Attive&quot;
          </h2>
          <p className="text-sm text-text-secondary">
            Piattaforme (non gia abbonate) che vuoi mantenere sempre attive
            nella rotazione.
          </p>
          <div className="grid grid-cols-2 gap-2">
            {rotatablePlatforms
              .filter((p) => !excluded.includes(p.slug))
              .map((p) => (
                <button
                  key={p.slug}
                  onClick={() => toggleAlwaysOn(p.slug)}
                  className={`flex items-center gap-2 p-3 rounded-lg border text-sm font-medium transition-colors ${
                    alwaysOn.includes(p.slug)
                      ? "border-accent bg-accent/10 text-accent-light"
                      : "border-border bg-bg-secondary text-text-secondary hover:border-accent/50"
                  }`}
                >
                  <span>{p.icon}</span>
                  <span>{p.name}</span>
                  <span className="ml-auto text-xs">
                    &euro;{p.monthlyPrice.toFixed(2)}/m
                  </span>
                  {alwaysOn.includes(p.slug) && (
                    <Check size={14} className="text-accent" />
                  )}
                </button>
              ))}
          </div>
        </div>
      )}

      {/* Excluded platforms */}
      {rotatablePlatforms.length > 0 && (
        <div className="p-6 rounded-xl bg-bg-card border border-border space-y-4">
          <h2 className="font-semibold text-text-primary flex items-center gap-2">
            <Ban size={16} />
            Piattaforme Escluse
          </h2>
          <p className="text-sm text-text-secondary">
            Piattaforme che non vuoi mai nel piano di rotazione.
          </p>
          <div className="grid grid-cols-2 gap-2">
            {rotatablePlatforms
              .filter((p) => !alwaysOn.includes(p.slug))
              .map((p) => (
                <button
                  key={p.slug}
                  onClick={() => toggleExcluded(p.slug)}
                  className={`flex items-center gap-2 p-3 rounded-lg border text-sm font-medium transition-colors ${
                    excluded.includes(p.slug)
                      ? "border-danger bg-danger/10 text-danger"
                      : "border-border bg-bg-secondary text-text-secondary hover:border-danger/50"
                  }`}
                >
                  <span>{p.icon}</span>
                  <span>{p.name}</span>
                  {excluded.includes(p.slug) && (
                    <Ban size={14} className="text-danger" />
                  )}
                </button>
              ))}
          </div>
        </div>
      )}

      {/* Info */}
      <div className="p-6 rounded-xl bg-bg-card border border-border space-y-2">
        <h2 className="font-semibold text-text-primary">Info</h2>
        <p className="text-sm text-text-secondary">
          StreamPlanner usa i dati di TMDB (The Movie Database) per le
          informazioni sulle serie TV e JustWatch per la disponibilita sulle
          piattaforme in Italia.
        </p>
        <div className="flex gap-4 mt-4">
          <span className="text-xs text-text-secondary/50">
            Powered by TMDB
          </span>
          <span className="text-xs text-text-secondary/50">
            Dati streaming: JustWatch
          </span>
        </div>
      </div>

      {/* Save button */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full py-3 rounded-xl bg-accent text-white font-medium flex items-center justify-center gap-2 hover:bg-accent-light transition-colors disabled:opacity-50"
      >
        {saving ? (
          <Loader2 size={18} className="animate-spin" />
        ) : saved ? (
          <Check size={18} />
        ) : (
          <Save size={18} />
        )}
        {saved ? "Salvato!" : "Salva Impostazioni"}
      </button>
    </div>
  );
}
