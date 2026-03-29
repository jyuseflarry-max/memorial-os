"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MessageSquare, Plus, Search, X } from "lucide-react";
import FamilyShell from "@/components/FamilyShell";

interface OtherUser {
  id: string;
  full_name: string;
  role: string;
}

interface Conversation {
  id: string;
  participants: OtherUser[];
  lastMessage: { body: string; created_at: string; sender_id: string } | null;
  hasUnread: boolean;
}

interface MessageableUser {
  id: string;
  full_name: string;
  role: string;
}

function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return d.toLocaleDateString([], { weekday: "short" });
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function participantLabel(users: OtherUser[]) {
  if (users.length === 0) return "Unknown";
  return users.map((u) => u.full_name || "Unknown").join(", ");
}

export default function FamilyMessagesPage() {
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewModal, setShowNewModal] = useState(false);
  const [messageable, setMessageable] = useState<MessageableUser[]>([]);
  const [search, setSearch] = useState("");
  const [starting, setStarting] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/conversations")
      .then((r) => r.json())
      .then((data) => { setConversations(Array.isArray(data) ? data : []); setLoading(false); });
  }, []);

  async function openNewModal() {
    setShowNewModal(true);
    if (messageable.length === 0) {
      const res = await fetch("/api/users/messageable");
      const data = await res.json();
      setMessageable(Array.isArray(data) ? data : []);
    }
  }

  async function startConversation(userId: string) {
    setStarting(userId);
    const res = await fetch("/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipientId: userId }),
    });
    const data = await res.json();
    if (data.id) router.push(`/family/messages/${data.id}`);
    else setStarting(null);
  }

  const filtered = messageable.filter((u) =>
    u.full_name.toLowerCase().includes(search.toLowerCase()) ||
    u.role.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <FamilyShell>
      <div className="max-w-lg mx-auto flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare size={18} className="text-purple-400" />
            <h1 className="text-white text-xl font-bold">Messages</h1>
          </div>
          <button
            type="button"
            onClick={openNewModal}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold transition-colors"
          >
            <Plus size={15} /> New
          </button>
        </div>

        {/* Conversation list */}
        {loading ? (
          <div className="text-gray-500 text-sm font-mono text-center py-12">Loading…</div>
        ) : conversations.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <MessageSquare size={32} className="text-gray-700" />
            <p className="text-gray-500 text-sm">No conversations yet.</p>
            <button
              type="button"
              onClick={openNewModal}
              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold transition-colors"
            >
              Start a conversation
            </button>
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-gray-800 bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
            {conversations.map((conv) => (
              <button
                key={conv.id}
                type="button"
                onClick={() => router.push(`/family/messages/${conv.id}`)}
                className="flex items-start gap-3 px-4 py-3.5 hover:bg-gray-800/50 transition-colors text-left"
              >
                <div className="w-9 h-9 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-purple-400 text-sm font-bold">
                    {(conv.participants[0]?.full_name ?? "?").charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-sm font-semibold truncate ${conv.hasUnread ? "text-white" : "text-gray-300"}`}>
                      {participantLabel(conv.participants)}
                    </span>
                    {conv.lastMessage && (
                      <span className="text-[10px] font-mono text-gray-500 shrink-0">
                        {formatTime(conv.lastMessage.created_at)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className={`text-xs truncate flex-1 ${conv.hasUnread ? "text-gray-300" : "text-gray-500"}`}>
                      {conv.lastMessage?.body ?? "No messages yet"}
                    </p>
                    {conv.hasUnread && (
                      <span className="w-2 h-2 rounded-full bg-purple-500 shrink-0" />
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* New conversation modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60">
          <div className="bg-gray-900 border border-gray-700 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[70vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
              <h2 className="text-white font-semibold text-sm">New Message</h2>
              <button type="button" onClick={() => setShowNewModal(false)} className="text-gray-500 hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="px-4 py-3 border-b border-gray-800">
              <div className="flex items-center gap-2 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2">
                <Search size={14} className="text-gray-500 shrink-0" />
                <input
                  autoFocus
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name or role…"
                  className="flex-1 bg-transparent text-white text-sm placeholder-gray-500 outline-none"
                />
              </div>
            </div>
            <div className="overflow-y-auto flex-1">
              {filtered.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-8">No staff found</p>
              ) : (
                filtered.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => startConversation(u.id)}
                    disabled={starting === u.id}
                    className="w-full flex items-center gap-3 px-5 py-3 hover:bg-gray-800/60 transition-colors text-left disabled:opacity-50"
                  >
                    <div className="w-8 h-8 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center shrink-0">
                      <span className="text-purple-400 text-xs font-bold">{(u.full_name ?? "?").charAt(0).toUpperCase()}</span>
                    </div>
                    <div>
                      <p className="text-white text-sm font-medium">{u.full_name}</p>
                      <p className="text-gray-500 text-xs font-mono">{u.role}</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </FamilyShell>
  );
}
