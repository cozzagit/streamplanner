"use client";

import { useState, useEffect } from "react";
import { EyeOff, Eye, ChevronDown, ChevronUp } from "lucide-react";

/** Genres that users commonly want to filter out */
const FILTERABLE_GENRES = [
  { id: 16, label: "Animazione", icon: "🎨" },
  { id: 10765, label: "Sci-Fi & Fantasy", icon: "🚀" },
  { id: 10759, label: "Action & Adventure", icon: "💥" },
  { id: 10762, label: "Kids", icon: "🧒" },
  { id: 10764, label: "Reality", icon: "📹" },
  { id: 10767, label: "Talk", icon: "🎙️" },
  { id: 10763, label: "News", icon: "📰" },
  { id: 10766, label: "Soap", icon: "💔" },
  { id: 99, label: "Documentario", icon: "🎥" },
  { id: 37, label: "Western", icon: "🤠" },
  { id: 10768, label: "War & Politics", icon: "⚔️" },
  { id: 10751, label: "Family", icon: "👨‍👩‍👧" },
];

interface GenreFilterProps {
  excludedGenres: Set<number>;
  onChange: (genres: Set<number>) => void;
}

export function GenreFilter({ excludedGenres, onChange }: GenreFilterProps) {
  const [expanded, setExpanded] = useState(false);
  const activeCount = excludedGenres.size;

  const toggleGenre = (id: number) => {
    const next = new Set(excludedGenres);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    onChange(next);
  };

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
      >
        <EyeOff size={14} />
        <span>
          Generi nascosti{activeCount > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-accent/20 text-accent-light text-[10px] font-bold">
              {activeCount}
            </span>
          )}
        </span>
        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {expanded && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {FILTERABLE_GENRES.map((g) => {
            const isExcluded = excludedGenres.has(g.id);
            return (
              <button
                key={g.id}
                onClick={() => toggleGenre(g.id)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                  isExcluded
                    ? "bg-danger/15 text-danger/80 line-through decoration-danger/40"
                    : "bg-bg-card border border-border text-text-secondary hover:border-accent/50"
                }`}
                title={isExcluded ? `Mostra ${g.label}` : `Nascondi ${g.label}`}
              >
                <span>{g.icon}</span>
                <span>{g.label}</span>
                {isExcluded ? <Eye size={10} /> : <EyeOff size={10} className="opacity-40" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
