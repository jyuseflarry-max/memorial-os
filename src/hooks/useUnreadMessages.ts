"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { usePathname } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabase/browser-client";
import type { RealtimeChannel } from "@supabase/supabase-js";

/**
 * Returns the number of conversations with unread messages.
 * Refreshes via Supabase Realtime when a new message arrives
 * and clears automatically when the user is on any /messages route.
 */
export function useUnreadMessages() {
  const pathname = usePathname();
  const [unread, setUnread] = useState(0);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const onMessagesPage =
    pathname === "/messages" ||
    pathname.startsWith("/messages/") ||
    pathname === "/family/messages" ||
    pathname.startsWith("/family/messages/");

  const refresh = useCallback(async () => {
    if (onMessagesPage) { setUnread(0); return; }
    try {
      const res = await fetch("/api/conversations");
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data)) {
        setUnread(data.filter((c: { hasUnread: boolean }) => c.hasUnread).length);
      }
    } catch {
      // silently ignore
    }
  }, [onMessagesPage]);

  // Clear badge when navigating to messages
  useEffect(() => {
    if (onMessagesPage) setUnread(0);
    else refresh();
  }, [onMessagesPage, refresh]);

  // Realtime subscription — set up once on mount
  useEffect(() => {
    const supabase = getSupabaseBrowser();

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;

      const channel = supabase
        .channel("unread-badge")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "messages" },
          (payload) => {
            if ((payload.new as { sender_id: string }).sender_id !== user.id) {
              refresh();
            }
          }
        )
        .subscribe();

      channelRef.current = channel;
    });

    return () => {
      if (channelRef.current) {
        getSupabaseBrowser().removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return unread;
}
