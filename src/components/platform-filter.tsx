"use client";

import { useState, useEffect } from "react";
import { TRACKED_PLATFORMS } from "@/lib/platforms";

interface PlatformFilterProps {
  selected: number | null;
  onChange: (tmdbId: number | null) => void;
}

export function PlatformFilter({ selected, onChange }: PlatformFilterProps) {
  const [activeSubs, setActiveSubs] = useState<string[]>([]);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        if (data.active_subscriptions) {
          try { setActiveSubs(JSON.parse(data.active_subscriptions)); } catch { /* ignore */ }
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div className="flex gap-2 overflow-x-auto pb-2 carousel-scroll">
      <button
        onClick={() => onChange(null)}
        className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors border ${
          selected === null
            ? "bg-accent text-white border-accent"
            : "bg-bg-card text-text-secondary border-border hover:border-accent/50"
        }`}
      >
        Tutte
      </button>
      {TRACKED_PLATFORMS.map((p) => {
        const isActive = activeSubs.includes(p.slug);
        return (
          <button
            key={p.tmdbId}
            onClick={() => onChange(p.tmdbId === selected ? null : p.tmdbId)}
            className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors border flex items-center gap-2 ${
              selected === p.tmdbId
                ? "text-white border-transparent"
                : "bg-bg-card text-text-secondary border-border hover:border-accent/50"
            }`}
            style={
              selected === p.tmdbId
                ? { backgroundColor: p.color, borderColor: p.color }
                : undefined
            }
          >
            <span>{p.icon}</span>
            <span>{p.name}</span>
            {isActive && (
              <span className="text-[10px] bg-success/20 text-success px-1.5 rounded-full font-bold">
                ATTIVO
              </span>
            )}
            {p.isFree && !isActive && (
              <span className="text-[10px] bg-success/20 text-success px-1.5 rounded-full">
                FREE
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
