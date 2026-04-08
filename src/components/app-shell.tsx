"use client";

import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/sidebar";

const PUBLIC_PATHS = ["/", "/login", "/registrati", "/landing"];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const pathname = usePathname();

  const isPublicPage = PUBLIC_PATHS.includes(pathname);
  const isAuthenticated = status === "authenticated";
  const showSidebar = isAuthenticated && !isPublicPage;

  return (
    <>
      {showSidebar && <Sidebar />}
      <main className={showSidebar ? "flex-1 ml-0 md:ml-64 min-h-screen" : "flex-1 min-h-screen"}>
        {showSidebar ? (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pt-16 md:pt-6">
            {children}
          </div>
        ) : (
          children
        )}
      </main>
    </>
  );
}
