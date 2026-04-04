"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  Compass,
  Search,
  List,
  CalendarDays,
  RotateCcw,
  DollarSign,
  Settings,
  Menu,
  X,
  Tv,
  LogOut,
  User,
} from "lucide-react";
import { useState } from "react";

const NAV_ITEMS = [
  { href: "/", label: "Esplora", icon: Compass },
  { href: "/cerca", label: "Cerca", icon: Search },
  { href: "/watchlist", label: "Watchlist", icon: List },
  { href: "/planner", label: "Rotation Planner", icon: RotateCcw },
  { href: "/calendario", label: "Calendario", icon: CalendarDays },
  { href: "/costi", label: "Costi & Risparmio", icon: DollarSign },
  { href: "/impostazioni", label: "Impostazioni", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Don't show sidebar on login/register pages
  if (pathname === "/login" || pathname === "/registrati") {
    return null;
  }

  // Don't show sidebar while loading auth
  if (status === "loading") {
    return null;
  }

  // Redirect to login if not authenticated
  if (status === "unauthenticated") {
    return null;
  }

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-bg-card border border-border"
      >
        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Overlay */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/60 z-30"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-bg-secondary border-r border-border z-40 flex flex-col transition-transform duration-300 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        {/* Logo */}
        <div className="p-6 border-b border-border">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center">
              <Tv size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-text-primary">
                StreamPlanner
              </h1>
              <p className="text-xs text-text-secondary">Palinsesto Smart</p>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(item.href));
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-accent/15 text-accent-light"
                    : "text-text-secondary hover:text-text-primary hover:bg-bg-card"
                }`}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User footer */}
        <div className="p-4 border-t border-border space-y-3">
          {session?.user && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center">
                <User size={14} className="text-accent-light" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary truncate">
                  {session.user.name}
                </p>
                <p className="text-xs text-text-secondary truncate">
                  {session.user.email}
                </p>
              </div>
            </div>
          )}
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-text-secondary hover:text-danger hover:bg-danger/10 transition-colors"
          >
            <LogOut size={16} />
            Esci
          </button>
        </div>
      </aside>
    </>
  );
}
