"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { RadioTower, ListChecks, Zap, BarChart3, UserCircle } from "lucide-react";
import { useSettings } from "@/context/SettingsContext";
import { useAuth } from "@/context/AuthContext";

// ── Bottom nav definition ─────────────────────────────────────────────────

const TABS = [
  { label: "Schedule",  href: "/",           icon: RadioTower  },
  { label: "Plans",     href: "/view-plans",  icon: ListChecks  },
  { label: "Check In",  href: "/vibe-check",  icon: Zap         },
  { label: "Reports",   href: "/reports",     icon: BarChart3   },
  { label: "Me",        href: "/account",     icon: UserCircle  },
] as const;

// ── Shell ─────────────────────────────────────────────────────────────────

export default function PlayerShell({ children }: { children: React.ReactNode }) {
  const pathname     = usePathname();
  const { settings } = useSettings();
  const { authUser } = useAuth();

  const firstName = authUser?.fullName?.split(" ")[0] ?? "Player";

  return (
    <div className="flex flex-col min-h-screen bg-gray-900 font-sans">
      {/* Top bar */}
      <div className="sticky top-0 z-20 flex items-center justify-between px-4 py-3 bg-gray-950 border-b border-gray-800">
        <div className="flex items-center gap-2.5">
          {settings.logo_url ? (
            <>
              <div className="w-7 h-7 rounded-lg bg-white flex items-center justify-center shrink-0 overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={settings.logo_url} alt={settings.program_name} width={24} height={24} className="object-contain" />
              </div>
              <span className="text-white font-semibold text-sm tracking-wide">
                {settings.program_name.split(" ")[0]}
              </span>
            </>
          ) : (
            <Image src="/thecoachsOS.jpg" alt="The Coach's OS" width={120} height={48} className="h-8 w-auto object-contain rounded" priority />
          )}
        </div>
        {/* Tap avatar → account page */}
        <Link href="/account" className="flex items-center gap-1.5">
          <div className="w-7 h-7 rounded-full bg-coaches-blue/20 border border-coaches-blue/30 flex items-center justify-center">
            <span className="text-coaches-blue text-xs font-bold">{firstName.charAt(0).toUpperCase()}</span>
          </div>
          <span className="text-xs font-mono text-gray-400 hidden sm:block">{firstName}</span>
        </Link>
      </div>

      {/* Page content */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden pb-24 p-4">
        {children}
      </main>

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 inset-x-0 z-20 bg-gray-950 border-t border-gray-800">
        <div className="flex items-center justify-center py-1 border-b border-gray-800/60">
          <p className="text-[8px] font-mono text-gray-700 uppercase tracking-widest mr-1.5">Powered by</p>
          <Image src="/thecoachsOS.jpg" alt="The Coach's OS" width={72} height={28} className="h-4 w-auto object-contain rounded opacity-50" />
        </div>
        <div className="flex">
          {TABS.map(({ label, href, icon: Icon }) => {
            const active = href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                className={`flex-1 flex flex-col items-center justify-center gap-1 py-2.5 transition-colors ${
                  active ? "text-coaches-blue" : "text-gray-500 hover:text-gray-300"
                }`}
              >
                <Icon size={19} strokeWidth={active ? 2.5 : 1.75} />
                <span className="text-[9px] font-mono uppercase tracking-wide leading-none">
                  {label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
