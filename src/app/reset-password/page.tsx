"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Tv, Loader2, AlertCircle, Lock, CheckCircle, ArrowLeft } from "lucide-react";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!token) {
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-3 p-4 rounded-xl bg-danger/10 border border-danger/30">
          <AlertCircle size={20} className="text-danger flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-danger">Link non valido</p>
            <p className="text-xs text-text-secondary mt-1">
              Questo link non contiene un token valido. Richiedi un nuovo reset.
            </p>
          </div>
        </div>
        <Link
          href="/password-dimenticata"
          className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-accent text-white font-medium hover:bg-accent-light transition-colors"
        >
          Richiedi Nuovo Reset
        </Link>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Le password non corrispondono");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
      } else {
        setSuccess(true);
      }
    } catch {
      setError("Errore di connessione");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-3 p-4 rounded-xl bg-success/10 border border-success/30">
          <CheckCircle size={20} className="text-success flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-success">Password reimpostata!</p>
            <p className="text-xs text-text-secondary mt-1">
              La tua password e stata aggiornata. Ora puoi accedere con la nuova password.
            </p>
          </div>
        </div>
        <Link
          href="/login"
          className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-accent text-white font-medium hover:bg-accent-light transition-colors"
        >
          Vai al Login
        </Link>
      </div>
    );
  }

  return (
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
            Nuova Password
          </label>
          <div className="relative">
            <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-bg-card border border-border text-text-primary placeholder-text-secondary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
              placeholder="Minimo 6 caratteri"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">
            Conferma Password
          </label>
          <div className="relative">
            <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-bg-card border border-border text-text-primary placeholder-text-secondary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
              placeholder="Ripeti la password"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-xl bg-accent text-white font-medium flex items-center justify-center gap-2 hover:bg-accent-light transition-colors disabled:opacity-50"
        >
          {loading && <Loader2 size={18} className="animate-spin" />}
          {loading ? "Aggiornamento..." : "Reimposta Password"}
        </button>
      </form>

      <p className="text-center text-sm text-text-secondary">
        <Link href="/login" className="text-accent-light hover:underline flex items-center justify-center gap-1">
          <ArrowLeft size={14} /> Torna al Login
        </Link>
      </p>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-primary p-4 -ml-0 md:-ml-64">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-accent flex items-center justify-center mx-auto mb-4">
            <Tv size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-text-primary">Nuova Password</h1>
          <p className="text-text-secondary mt-1">Scegli una nuova password per il tuo account</p>
        </div>
        <Suspense fallback={<Loader2 className="animate-spin text-accent mx-auto" />}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
