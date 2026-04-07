"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import {
  Tv,
  Search,
  List,
  RotateCcw,
  CalendarDays,
  DollarSign,
  TrendingDown,
  ArrowRight,
  Check,
  Users,
  Zap,
  ChevronRight,
  Loader2,
  Clock,
  PlayCircle,
  SlidersHorizontal,
} from "lucide-react";

const FEATURES = [
  {
    icon: Search,
    title: "Esplora e Cerca",
    description:
      "Sfoglia le serie trending, nuove e top rated. Cerca qualsiasi serie e scopri su quali piattaforme e disponibile in Italia.",
    color: "#6366f1",
  },
  {
    icon: List,
    title: "Watchlist Smart",
    description:
      "Aggiungi serie, imposta priorita e traccia il progresso con lo slider stagioni. Segna le stagioni gia viste con un tap.",
    color: "#22c55e",
  },
  {
    icon: RotateCcw,
    title: "Rotation Planner",
    description:
      "L'algoritmo calcola quanto tempo serve per ogni piattaforma in base alle tue ore di visione, e crea il piano di rotazione ottimale.",
    color: "#f59e0b",
  },
  {
    icon: PlayCircle,
    title: "Calendario Programmazione",
    description:
      "Il calendario distribuisce le puntate giorno per giorno in base alle ore che dedichi alle serie. Segna gli episodi visti e il piano si ricalcola.",
    color: "#818cf8",
  },
  {
    icon: Clock,
    title: "Programmazione Settimanale",
    description:
      "Imposta quante ore guardi ogni giorno della settimana. Il calendario e il planner si adattano al tuo ritmo reale.",
    color: "#a855f7",
  },
  {
    icon: DollarSign,
    title: "Costi & Risparmio",
    description:
      "Confronta il costo di tutti gli abbonamenti necessari vs la rotazione intelligente. Proiezione annuale del risparmio.",
    color: "#ef4444",
  },
  {
    icon: CalendarDays,
    title: "Calendario Uscite",
    description:
      "Non perderti nessun episodio. Vedi tutte le date di uscita delle serie nella tua watchlist, mese per mese.",
    color: "#06b6d4",
  },
  {
    icon: Users,
    title: "Multi-Utente",
    description:
      "Ogni utente ha la propria watchlist, impostazioni e piano di rotazione personalizzato.",
    color: "#00E054",
  },
];

const PLATFORMS = [
  { name: "Netflix", color: "#E50914", icon: "N" },
  { name: "Prime Video", color: "#00A8E1", icon: "P" },
  { name: "Disney+", color: "#0063E5", icon: "D" },
  { name: "Apple TV+", color: "#555", icon: "A" },
  { name: "Paramount+", color: "#0064FF", icon: "P" },
  { name: "NOW", color: "#00E054", icon: "N" },
  { name: "Crunchyroll", color: "#F47521", icon: "C" },
  { name: "Discovery+", color: "#003BE5", icon: "D" },
];

const STEPS = [
  {
    step: "01",
    title: "Costruisci la tua watchlist",
    description: "Cerca le serie, aggiungile, imposta le priorita e segna le stagioni gia viste con lo slider.",
  },
  {
    step: "02",
    title: "Configura le tue abitudini",
    description: "Indica i tuoi abbonamenti attivi, il budget e quante ore guardi ogni giorno della settimana.",
  },
  {
    step: "03",
    title: "Ottieni il piano di rotazione",
    description: "L'algoritmo calcola quanti mesi serve ogni piattaforma e crea il piano ottimale per priorita.",
  },
  {
    step: "04",
    title: "Segui il calendario smart",
    description: "Ogni giorno il calendario ti dice cosa guardare, su quale piattaforma, e segni il progresso.",
  },
];

export default function HomePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Redirect authenticated users to the app
  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/esplora");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-accent" />
      </div>
    );
  }

  if (status === "authenticated") {
    return null;
  }

  return (
    <div className="relative overflow-hidden">
      {/* ─── HERO ─── */}
      <section className="relative min-h-[90vh] flex flex-col items-center justify-center px-4 py-20">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -left-40 w-96 h-96 bg-accent/10 rounded-full blur-[120px]" />
          <div className="absolute top-20 right-0 w-80 h-80 bg-purple-600/8 rounded-full blur-[100px]" />
          <div className="absolute bottom-0 left-1/3 w-72 h-72 bg-success/5 rounded-full blur-[100px]" />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto text-center space-y-8">
          <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-bg-card/80 border border-border backdrop-blur-sm">
            <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
              <Tv size={16} className="text-white" />
            </div>
            <span className="text-sm font-medium text-text-secondary">StreamPlanner</span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold tracking-tight">
            <span className="text-text-primary">Smetti di pagare</span>
            <br />
            <span className="bg-gradient-to-r from-accent via-accent-light to-purple-400 bg-clip-text text-transparent">
              abbonamenti che non usi
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-text-secondary max-w-2xl mx-auto leading-relaxed">
            Traccia le serie, segna il progresso per stagione, e ottieni il piano perfetto:
            quale piattaforma attivare ogni mese, cosa guardare ogni giorno,{" "}
            <span className="text-success font-semibold">risparmiando fino al 60%</span>.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link
              href="/registrati"
              className="group flex items-center gap-2 px-8 py-4 rounded-2xl bg-accent text-white font-semibold text-lg hover:bg-accent-light transition-all hover:shadow-lg hover:shadow-accent/25"
            >
              Inizia Gratis
              <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/login"
              className="flex items-center gap-2 px-8 py-4 rounded-2xl bg-bg-card border border-border text-text-primary font-medium text-lg hover:border-accent/50 transition-colors"
            >
              Accedi
            </Link>
          </div>

          <p className="text-sm text-text-secondary/60 pt-2">
            Gratuito. Nessuna carta richiesta. Dati da TMDB e JustWatch.
          </p>
        </div>

        <div className="relative z-10 mt-16 w-full max-w-3xl mx-auto">
          <p className="text-center text-xs text-text-secondary/50 mb-4 uppercase tracking-wider">
            12 piattaforme monitorate
          </p>
          <div className="flex justify-center gap-3 flex-wrap">
            {PLATFORMS.map((p) => (
              <div
                key={p.name}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-bg-card/80 border border-border backdrop-blur-sm"
              >
                <div
                  className="w-6 h-6 rounded-md flex items-center justify-center text-white text-xs font-bold"
                  style={{ backgroundColor: p.color }}
                >
                  {p.icon}
                </div>
                <span className="text-sm text-text-secondary">{p.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section className="relative px-4 py-24">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-accent text-sm font-semibold uppercase tracking-wider">Come funziona</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-text-primary mt-3">
              4 passi verso il risparmio
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {STEPS.map((s, i) => (
              <div
                key={s.step}
                className="group relative p-8 rounded-2xl bg-bg-card border border-border hover:border-accent/30 transition-all"
              >
                <div className="flex items-start gap-5">
                  <span className="text-5xl font-black text-accent/15 group-hover:text-accent/30 transition-colors leading-none">
                    {s.step}
                  </span>
                  <div>
                    <h3 className="text-lg font-semibold text-text-primary mb-2">{s.title}</h3>
                    <p className="text-sm text-text-secondary leading-relaxed">{s.description}</p>
                  </div>
                </div>
                {i < STEPS.length - 1 && (
                  <ChevronRight
                    size={16}
                    className="absolute -right-3 top-1/2 -translate-y-1/2 text-border hidden md:block"
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── SAVINGS SHOWCASE ─── */}
      <section className="relative px-4 py-24">
        <div className="max-w-4xl mx-auto">
          <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-br from-bg-card to-bg-secondary border border-border relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-success/5 rounded-full blur-[80px]" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-accent/5 rounded-full blur-[60px]" />

            <div className="relative z-10">
              <div className="text-center mb-10">
                <TrendingDown size={32} className="text-success mx-auto mb-3" />
                <h2 className="text-3xl sm:text-4xl font-bold text-text-primary">
                  Il confronto parla chiaro
                </h2>
                <p className="text-text-secondary mt-2">Esempio con 8 serie su 5 piattaforme diverse</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="p-6 rounded-2xl bg-danger/5 border border-danger/20 text-center">
                  <p className="text-sm text-danger mb-2">Tutto attivo</p>
                  <p className="text-4xl font-black text-danger">&euro;47.94</p>
                  <p className="text-xs text-text-secondary mt-1">/mese &middot; &euro;575 /anno</p>
                </div>
                <div className="p-6 rounded-2xl bg-success/5 border border-success/20 text-center relative">
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-success text-white text-xs font-bold">
                    CON STREAMPLANNER
                  </div>
                  <p className="text-sm text-success mb-2 mt-1">Con rotazione</p>
                  <p className="text-4xl font-black text-success">&euro;15.98</p>
                  <p className="text-xs text-text-secondary mt-1">/mese &middot; &euro;192 /anno</p>
                </div>
                <div className="p-6 rounded-2xl bg-accent/5 border border-accent/20 text-center">
                  <p className="text-sm text-accent-light mb-2">Risparmi</p>
                  <p className="text-4xl font-black text-accent-light">&euro;383</p>
                  <p className="text-xs text-text-secondary mt-1">/anno &middot; 66% in meno</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FEATURES GRID ─── */}
      <section className="relative px-4 py-24">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-accent text-sm font-semibold uppercase tracking-wider">Funzionalita</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-text-primary mt-3">
              Tutto quello che ti serve
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  className="group p-6 rounded-2xl bg-bg-card border border-border hover:border-accent/20 transition-all hover:-translate-y-1"
                >
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110"
                    style={{ backgroundColor: f.color + "15" }}
                  >
                    <Icon size={22} style={{ color: f.color }} />
                  </div>
                  <h3 className="text-lg font-semibold text-text-primary mb-2">{f.title}</h3>
                  <p className="text-sm text-text-secondary leading-relaxed">{f.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── WHAT'S INCLUDED ─── */}
      <section className="relative px-4 py-24">
        <div className="max-w-3xl mx-auto">
          <div className="p-8 sm:p-10 rounded-3xl bg-bg-card border border-border">
            <h2 className="text-2xl font-bold text-text-primary mb-8 text-center">
              Cosa include StreamPlanner
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                "12 piattaforme streaming italiane",
                "Dati aggiornati da TMDB e JustWatch",
                "Rotazione basata su tempo di visione",
                "Calendario smart con programmazione giornaliera",
                "Programmazione settimanale personalizzabile",
                "Slider progresso con step per stagione",
                "Segna episodi visti dal calendario",
                "Calendario uscite nuovi episodi",
                "Analisi costi con proiezione annuale",
                "Watchlist con priorita e stati automatici",
                "Budget e abbonamenti personalizzabili",
                "Multi-utente con account separati",
              ].map((item) => (
                <div key={item} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-success/10 flex items-center justify-center flex-shrink-0">
                    <Check size={12} className="text-success" />
                  </div>
                  <span className="text-sm text-text-secondary">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── FINAL CTA ─── */}
      <section className="relative px-4 py-24">
        <div className="max-w-3xl mx-auto text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-success/10 border border-success/20">
            <Zap size={14} className="text-success" />
            <span className="text-sm text-success font-medium">100% gratuito</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-bold text-text-primary">
            Pronto a risparmiare sui tuoi abbonamenti?
          </h2>
          <p className="text-lg text-text-secondary max-w-xl mx-auto">
            Crea il tuo account in 10 secondi, aggiungi le serie, segna le stagioni gia viste
            e lascia che StreamPlanner pianifichi tutto per te.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/registrati"
              className="group inline-flex items-center gap-2 px-10 py-4 rounded-2xl bg-accent text-white font-semibold text-lg hover:bg-accent-light transition-all hover:shadow-lg hover:shadow-accent/25"
            >
              Crea Account Gratis
              <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl text-text-secondary hover:text-text-primary transition-colors"
            >
              Ho gia un account
            </Link>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="border-t border-border px-4 py-8">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-accent flex items-center justify-center">
              <Tv size={12} className="text-white" />
            </div>
            <span className="text-sm font-medium text-text-secondary">StreamPlanner</span>
          </div>
          <div className="flex gap-6 text-xs text-text-secondary/50">
            <span>Dati da TMDB</span>
            <span>Streaming: JustWatch</span>
            <span>Made in Italy</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
