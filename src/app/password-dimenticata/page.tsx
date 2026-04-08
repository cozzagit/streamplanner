"use client";

import { useState } from "react";
import Link from "next/link";
import { Tv, Loader2, AlertCircle, Mail, ArrowLeft, CheckCircle } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Errore nell'invio");
      } else {
        setSent(true);
      }
    } catch {
      setError("Errore di connessione");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-primary p-4 -ml-0 md:-ml-64">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-accent flex items-center justify-center mx-auto mb-4">
            <Tv size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-text-primary">Password dimenticata</h1>
          <p className="text-text-secondary mt-1">Ti invieremo un link per reimpostarla</p>
        </div>

        {sent ? (
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 rounded-xl bg-success/10 border border-success/30">
              <CheckCircle size={20} className="text-success flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-success">Email inviata!</p>
                <p className="text-xs text-text-secondary mt-1">
                  Se l&apos;indirizzo <strong className="text-text-primary">{email}</strong> e registrato,
                  riceverai un link per reimpostare la password. Controlla anche la cartella spam.
                </p>
              </div>
            </div>
            <Link
              href="/login"
              className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-bg-card border border-border text-sm text-text-secondary hover:text-text-primary transition-colors"
            >
              <ArrowLeft size={16} />
              Torna al Login
            </Link>
          </div>
        ) : (
          <>
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-danger/10 border border-danger/30 text-sm text-danger">
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  Email
                </label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-bg-card border border-border text-text-primary placeholder-text-secondary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                    placeholder="la-tua@email.com"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-accent text-white font-medium flex items-center justify-center gap-2 hover:bg-accent-light transition-colors disabled:opacity-50"
              >
                {loading && <Loader2 size={18} className="animate-spin" />}
                {loading ? "Invio..." : "Invia Link di Reset"}
              </button>
            </form>

            <p className="text-center text-sm text-text-secondary">
              <Link href="/login" className="text-accent-light hover:underline">
                Torna al Login
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
