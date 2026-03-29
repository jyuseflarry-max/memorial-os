"use client";

import { useEffect, useRef, useState, use } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Send } from "lucide-react";
import FamilyShell from "@/components/FamilyShell";
import { getSupabaseBrowser } from "@/lib/supabase/browser-client";
import { useAuth } from "@/context/AuthContext";

interface Message {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
  sender: { id: string; full_name: string; role: string } | null;
}

function formatMsgTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function formatMsgDate(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return d.toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" });
}

export default function FamilyMessageThreadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { authUser } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetch(`/api/conversations/${id}/messages`)
      .then((r) => r.json())
      .then((data) => {
        setMessages(Array.isArray(data) ? data : []);
        setLoading(false);
      });
  }, [id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const supabase = getSupabaseBrowser();
    const channel = supabase
      .channel(`family-messages:${id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${id}` },
        () => {
          fetch(`/api/conversations/${id}/messages`).then((r) => r.json()).then((data) => {
            if (Array.isArray(data)) setMessages(data);
          });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [id]);

  async function handleSend() {
    if (!body.trim() || sending) return;
    setSending(true);
    const res = await fetch(`/api/conversations/${id}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    });
    if (res.ok) {
      const msg = await res.json();
      setMessages((prev) => [...prev, { ...msg, sender: { id: authUser?.id ?? "", full_name: authUser?.fullName ?? "", role: authUser?.role ?? "" } }]);
      setBody("");
      inputRef.current?.focus();
    }
    setSending(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const grouped: { date: string; msgs: Message[] }[] = [];
  for (const msg of messages) {
    const date = formatMsgDate(msg.created_at);
    const last = grouped[grouped.length - 1];
    if (last && last.date === date) last.msgs.push(msg);
    else grouped.push({ date, msgs: [msg] });
  }

  const currentUserId = authUser?.id;

  return (
    <FamilyShell>
      <div className="max-w-lg mx-auto flex flex-col h-[calc(100vh-10rem)]">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <button
            type="button"
            onClick={() => router.push("/family/messages")}
            className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-white font-bold text-lg">Conversation</h1>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto flex flex-col gap-1 px-1">
          {loading ? (
            <div className="text-gray-500 text-sm font-mono text-center py-12">Loading…</div>
          ) : messages.length === 0 ? (
            <div className="text-gray-600 text-sm text-center py-12">No messages yet. Say hello!</div>
          ) : (
            grouped.map(({ date, msgs }) => (
              <div key={date}>
                <div className="flex items-center gap-2 my-3">
                  <div className="flex-1 h-px bg-gray-800" />
                  <span className="text-[10px] font-mono text-gray-600 uppercase tracking-wider">{date}</span>
                  <div className="flex-1 h-px bg-gray-800" />
                </div>
                {msgs.map((msg, i) => {
                  const isMe = msg.sender_id === currentUserId;
                  const showSender = !isMe && (i === 0 || msgs[i - 1]?.sender_id !== msg.sender_id);
                  return (
                    <div key={msg.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"} mb-1`}>
                      {showSender && (
                        <span className="text-[10px] font-mono text-gray-500 mb-1 ml-1">
                          {msg.sender?.full_name ?? "Unknown"}
                        </span>
                      )}
                      <div className={`max-w-[80%] px-3.5 py-2 rounded-2xl text-sm leading-snug ${
                        isMe
                          ? "bg-purple-600 text-white rounded-br-sm"
                          : "bg-gray-800 text-gray-100 rounded-bl-sm"
                      }`}>
                        {msg.body}
                      </div>
                      <span className="text-[9px] font-mono text-gray-600 mt-0.5 px-1">
                        {formatMsgTime(msg.created_at)}
                      </span>
                    </div>
                  );
                })}
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="mt-3 flex items-end gap-2 bg-gray-900 border border-gray-800 rounded-2xl p-2">
          <textarea
            ref={inputRef}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message…"
            rows={1}
            className="flex-1 bg-transparent text-white text-sm placeholder-gray-500 outline-none resize-none px-2 py-1.5 max-h-32 overflow-y-auto"
            style={{ minHeight: "36px" }}
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!body.trim() || sending}
            className="p-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white transition-colors shrink-0"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </FamilyShell>
  );
}
