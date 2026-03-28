"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Swords, LogOut } from "lucide-react";
import { useSettings } from "@/context/SettingsContext";
import { useAuth } from "@/context/AuthContext";
import { logout } from "@/actions/auth";

const TABS = [
  { label: "Schedule", href: "/family",       icon: CalendarDays },
  { label: "Games",    href: "/family/games",  icon: Swords },
] as const;

export default function FamilyShell({ children }: { children: React.ReactNode }) {
  const pathname     = usePathname();
  const { settings } = useSettings();
  const { authUser } = useAuth();

  const firstName = authUser?.fullName?.split(" ")[0] ?? "Family";

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
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <div className="w-7 h-7 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
              <span className="text-purple-400 text-xs font-bold">{firstName.charAt(0).toUpperCase()}</span>
            </div>
            <span className="text-xs font-mono text-gray-400 hidden sm:block">{firstName}</span>
          </div>
          <form action={logout}>
            <button
              type="submit"
              className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-500 hover:text-red-400 hover:bg-gray-800 transition-colors"
              title="Sign out"
            >
              <LogOut size={15} />
            </button>
          </form>
        </div>
      </div>

      {/* Page content */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden pb-20 p-4">
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
            const active = pathname === href || (href !== "/family" && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 transition-colors ${
                  active ? "text-purple-400" : "text-gray-500 hover:text-gray-300"
                }`}
              >
                <Icon size={20} strokeWidth={active ? 2.5 : 1.75} />
                <span className="text-[10px] font-mono uppercase tracking-wide">{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
