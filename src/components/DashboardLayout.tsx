"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Menu } from "lucide-react";
import Sidebar from "./Sidebar";
import PlayerShell from "./PlayerShell";
import { useAuth } from "@/context/AuthContext";

// Routes players are allowed to visit. Everything else redirects to /.
const PLAYER_ALLOWED = ["/", "/view-plans", "/vibe-check", "/reports", "/account", "/schedules"];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isPlayer, loading } = useAuth();
  const pathname   = usePathname();
  const router     = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Redirect players away from staff/admin/coach-only pages.
  useEffect(() => {
    if (!isPlayer) return;
    const allowed = PLAYER_ALLOWED.some(
      (r) => pathname === r || pathname.startsWith(r + "/")
    );
    if (!allowed) router.replace("/");
  }, [isPlayer, pathname, router]);

  // Show nothing while auth is loading to avoid a layout flash.
  if (loading) return null;
  if (isPlayer) return <PlayerShell>{children}</PlayerShell>;

  return (
    <div className="flex min-h-screen bg-gray-900 font-sans print:bg-white overflow-x-hidden">

      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — fixed drawer on mobile, static column on md+ */}
      <div
        className={`fixed inset-y-0 left-0 z-40 transition-transform duration-300 ease-in-out
          md:relative md:translate-x-0 md:transition-none print:hidden
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}
      >
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </div>

      {/* Main area */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Mobile top bar */}
        <div className="md:hidden flex items-center gap-3 px-4 py-3 bg-gray-950 border-b border-gray-800 sticky top-0 z-20 print:hidden">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
            aria-label="Open navigation"
          >
            <Menu size={20} />
          </button>
          <Image src="/thecoachsOS.jpg" alt="The Coach's OS" width={120} height={48} className="h-7 w-auto object-contain rounded" />
        </div>

        <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 md:p-8 print:p-6 min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
}
