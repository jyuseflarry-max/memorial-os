"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Swords, UserCircle, MessageSquare } from "lucide-react";
import { useSettings } from "@/context/SettingsContext";
import { useAuth } from "@/context/AuthContext";
import { usePermissions } from "@/context/PermissionsContext";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";

const TABS = [
  { label: "Schedule",   href: "/family/schedule",  icon: CalendarDays  },
  { label: "Games",      href: "/family/games",      icon: Swords        },
  { label: "Messages",   href: "/family/messages",   icon: MessageSquare },
  { label: "Me",         href: "/family/account",    icon: UserCircle    },
] as const;

// Map tab hrefs to page keys — empty string means always show
const TAB_PAGE_KEYS: Record<string, string> = {
  "/family/schedule": "family_schedule",
  "/family/games":    "family_games",
  "/family/messages": "family_messages",
  "/family/account":  "", // always show account tab
};

export default function FamilyShell({ children }: { children: React.ReactNode }) {
  const pathname     = usePathname();
  const { settings } = useSettings();
  const { authUser } = useAuth();
  const { canView }  = usePermissions();
  const unread       = useUnreadMessages();

  const visibleTabs = TABS.filter(t => !TAB_PAGE_KEYS[t.href] || canView(TAB_PAGE_KEYS[t.href]));

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
        {/* Coach's OS logo + avatar */}
        <div className="flex items-center gap-3">
          {settings.logo_url && (
            <Image src="/thecoachsOS.jpg" alt="The Coach's OS" width={120} height={48} className="h-7 w-auto object-contain rounded opacity-80" />
          )}
          <Link href="/family/account" className="flex items-center gap-1.5">
            <div className="w-7 h-7 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
              <span className="text-purple-400 text-xs font-bold">{firstName.charAt(0).toUpperCase()}</span>
            </div>
            <span className="text-xs font-mono text-gray-400 hidden sm:block">{firstName}</span>
          </Link>
        </div>
      </div>

      {/* Page content */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden pb-24 p-4">
        {children}
      </main>

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 inset-x-0 z-20 bg-gray-950 border-t border-gray-800">
        <div className="flex">
          {visibleTabs.map(({ label, href, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            const showBadge = href === "/family/messages" && unread > 0;
            return (
              <Link
                key={href}
                href={href}
                className={`flex-1 flex flex-col items-center justify-center gap-1 py-2.5 transition-colors ${
                  active ? "text-purple-400" : "text-gray-500 hover:text-gray-300"
                }`}
              >
                <div className="relative">
                  <Icon size={19} strokeWidth={active ? 2.5 : 1.75} />
                  {showBadge && (
                    <span className="absolute -top-1 -right-1.5 min-w-[14px] h-3.5 px-0.5 rounded-full bg-red-500 text-white text-[8px] font-bold flex items-center justify-center leading-none">
                      {unread > 9 ? "9+" : unread}
                    </span>
                  )}
                </div>
                <span className="text-[9px] font-mono uppercase tracking-wide leading-none">{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
