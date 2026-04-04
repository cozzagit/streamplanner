"use client";

import { useState, useEffect } from "react";
import { Settings, Save, Loader2, Check, Ban } from "lucide-react";
import { TRACKED_PLATFORMS } from "@/lib/platforms";

export default function ImpostazioniPage() {
  const [budget, setBudget] = useState(15);
  const [alwaysOn, setAlwaysOn] = useState<string[]>([]);
  const [excluded, setExcluded] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        if (data.monthly_budget) setBudget(Number(data.monthly_budget));
        if (data.always_on_platforms) {
          try {
            setAlwaysOn(JSON.parse(data.always_on_platforms));
          } catch {
            // ignore
          }
        }
        if (data.excluded_platforms) {
          try {
            setExcluded(JSON.parse(data.excluded_platforms));
          } catch {
            // ignore
          }
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
        }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  const toggleAlwaysOn = (slug: string) => {
    setAlwaysOn((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    );
    // Remove from excluded if adding to always-on
    setExcluded((prev) => prev.filter((s) => s !== slug));
  };

  const toggleExcluded = (slug: string) => {
    setExcluded((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    );
    // Remove from always-on if excluding
    setAlwaysOn((prev) => prev.filter((s) => s !== slug));
  };

  const paidPlatforms = TRACKED_PLATFORMS.filter((p) => !p.isFree);
  const alwaysOnCost = paidPlatforms
    .filter((p) => alwaysOn.includes(p.slug))
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

      {/* Budget */}
      <div className="p-6 rounded-xl bg-bg-card border border-border space-y-4">
        <h2 className="font-semibold text-text-primary">Budget Mensile</h2>
        <p className="text-sm text-text-secondary">
          Quanto vuoi spendere al massimo al mese per le piattaforme (esclusi
          Netflix e Prime che hai gia)
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
            &middot; Budget disponibile per rotazione: &euro;{remainingBudget.toFixed(2)}/mese
          </div>
        )}
      </div>

      {/* Always-on platforms */}
      <div className="p-6 rounded-xl bg-bg-card border border-border space-y-4">
        <h2 className="font-semibold text-text-primary">
          Piattaforme &quot;Sempre Attive&quot;
        </h2>
        <p className="text-sm text-text-secondary">
          Piattaforme che vuoi mantenere sempre, indipendentemente dalla
          rotazione. Il planner ottimizzera le rimanenti.
        </p>
        <div className="grid grid-cols-2 gap-2">
          {paidPlatforms
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

      {/* Excluded platforms */}
      <div className="p-6 rounded-xl bg-bg-card border border-border space-y-4">
        <h2 className="font-semibold text-text-primary flex items-center gap-2">
          <Ban size={16} />
          Piattaforme Escluse
        </h2>
        <p className="text-sm text-text-secondary">
          Piattaforme che non vuoi mai nel piano di rotazione.
        </p>
        <div className="grid grid-cols-2 gap-2">
          {paidPlatforms
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

      {/* Info */}
      <div className="p-6 rounded-xl bg-bg-card border border-border space-y-2">
        <h2 className="font-semibold text-text-primary">Info</h2>
        <p className="text-sm text-text-secondary">
          StreamPlanner usa i dati di TMDB (The Movie Database) per le
          informazioni sulle serie TV e JustWatch per la disponibilita sulle
          piattaforme in Italia.
        </p>
        <p className="text-sm text-text-secondary">
          Netflix e Amazon Prime Video sono esclusi dal planner perche li hai
          gia.
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
