"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ClipboardList, Pencil, Copy, Trash2, X,
  CalendarDays, Printer, Mail, ChevronUp, ChevronDown,
  ChevronLeft, ChevronRight,
} from "lucide-react";
import { useTeam } from "@/context/TeamContext";

interface SavedSession {
  id: string;
  date: string;
  start_time: string;
  drills: Array<{ drill: { name: string }; duration: number }>;
  team_id: string | null;
}

function isoToday(): string {
  return new Date().toISOString().split("T")[0];
}

function formatDate(iso: string): string {
  return new Date(iso + "T12:00:00").toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric", year: "numeric",
  });
}

function formatTime12(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

function buildEmailBody(session: SavedSession, teamName: string): string {
  const lines = [
    `Practice Plan — ${formatDate(session.date)}`,
    `Team: ${teamName}`,
    `Start Time: ${formatTime12(session.start_time)}`,
    ``,
    `DRILLS (${session.drills.length}):`,
    ...session.drills.map((sd, i) => `  ${i + 1}. ${sd.drill.name} — ${sd.duration} min`),
  ];
  return encodeURIComponent(lines.join("\n"));
}

// ── Copy-to-date modal ────────────────────────────────────────────────────

function CopyModal({
  source,
  onConfirm,
  onClose,
}: {
  source: SavedSession;
  onConfirm: (targetDate: string) => void;
  onClose: () => void;
}) {
  const [date, setDate] = useState("");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 w-80 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <p className="text-white font-semibold">Copy Plan</p>
          <button type="button" onClick={onClose} className="text-gray-500 hover:text-white transition-colors"><X size={16} /></button>
        </div>
        <p className="text-gray-400 text-xs font-mono mb-1">SOURCE</p>
        <p className="text-gray-300 text-sm mb-4">{formatDate(source.date)} · {source.drills.length} drills</p>
        <p className="text-gray-400 text-xs font-mono mb-2">COPY TO DATE</p>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm font-mono focus:outline-none focus:border-mustang-red transition-colors mb-4"
        />
        <div className="flex gap-2">
          <button type="button" onClick={onClose}
            className="flex-1 px-4 py-2 rounded-lg border border-gray-600 text-gray-400 text-sm hover:text-white transition-colors">
            Cancel
          </button>
          <button type="button" disabled={!date} onClick={() => { if (date) onConfirm(date); }}
            className="flex-1 px-4 py-2 rounded-lg bg-mustang-red hover:bg-mustang-red-dark disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors">
            Copy
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────

export default function PracticeHistoryCard() {
  const router = useRouter();
  const today  = isoToday();
  const { activeTeam } = useTeam();

  const [sessions,  setSessions]  = useState<SavedSession[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [sortAsc,   setSortAsc]   = useState(false); // newest first by default
  const [copying,   setCopying]   = useState<SavedSession | null>(null);
  const [deleting,  setDeleting]  = useState<string | null>(null);
  const [page,      setPage]      = useState(1);
  const [perPage,   setPerPage]   = useState(20);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const teamParam = activeTeam ? `?team_id=${activeTeam.id}` : "";
      const res  = await fetch(`/api/sessions${teamParam}`);
      const data = await res.json();
      if (Array.isArray(data)) setSessions(data);
    } catch {}
    setLoading(false);
  }, [activeTeam]);

  useEffect(() => { load(); }, [load]);

  // Reset to page 1 whenever team, sort, or perPage changes
  useEffect(() => { setPage(1); }, [activeTeam, sortAsc, perPage]);

  const sorted = [...sessions].sort((a, b) =>
    sortAsc ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date)
  );

  const totalPages = perPage === 0 ? 1 : Math.max(1, Math.ceil(sorted.length / perPage));
  const paginated  = perPage === 0 ? sorted : sorted.slice((page - 1) * perPage, page * perPage);

  async function handleDelete(session: SavedSession) {
    if (!confirm(`Delete plan for ${formatDate(session.date)}? This cannot be undone.`)) return;
    setDeleting(session.id);
    try {
      const teamParam = session.team_id ? `?team_id=${session.team_id}` : "";
      await fetch(`/api/sessions/${session.date}${teamParam}`, { method: "DELETE" });
      setSessions((prev) => prev.filter((s) => s.id !== session.id));
    } catch {}
    setDeleting(null);
  }

  async function handleCopy(source: SavedSession, targetDate: string) {
    setCopying(null);
    try {
      await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date:       targetDate,
          start_time: source.start_time,
          drills:     source.drills,
          team_id:    source.team_id,
        }),
      });
      const teamParam = source.team_id ? `&team_id=${source.team_id}` : "";
      router.push(`/planner?date=${targetDate}${teamParam}`);
    } catch {}
  }

  function handlePrint(session: SavedSession) {
    const teamParam = session.team_id ? `&team_id=${session.team_id}` : "";
    window.open(`/planner?date=${session.date}${teamParam}&autoprint=1`, "_blank");
  }

  function handleEmail(session: SavedSession) {
    const teamName = activeTeam?.name ?? "Team";
    const subject  = encodeURIComponent(`Practice Plan — ${formatDate(session.date)} — ${teamName}`);
    const body     = buildEmailBody(session, teamName);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  }

  return (
    <>
      <section className="bg-gray-800 border border-gray-700 rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <ClipboardList size={18} className="text-mustang-red" />
            <h2 className="text-white font-semibold">Practice Plans</h2>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <span className="text-gray-500 text-xs font-mono hidden sm:inline">
              {activeTeam?.name.toUpperCase() ?? "ALL TEAMS"} · {loading ? "…" : sessions.length} PLANS
            </span>

            {/* Per-page selector */}
            <select
              value={perPage}
              onChange={(e) => setPerPage(Number(e.target.value))}
              className="bg-gray-700 border border-gray-600 rounded-lg px-2 py-1.5 text-xs font-mono text-gray-300 focus:outline-none focus:border-mustang-red transition-colors"
            >
              <option value={10}>10 / page</option>
              <option value={20}>20 / page</option>
              <option value={50}>50 / page</option>
              <option value={0}>Show all</option>
            </select>

            {/* Date sort toggle */}
            <button
              type="button"
              onClick={() => setSortAsc((v) => !v)}
              className="flex items-center gap-1 text-xs font-mono text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 rounded-lg px-2.5 py-1.5 transition-colors"
            >
              Date {sortAsc ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
          </div>
        </div>

        {/* Column headers */}
        {!loading && sorted.length > 0 && (
          <div className="grid grid-cols-[1fr_auto] px-6 py-2 border-b border-gray-700/50">
            <span className="text-[10px] font-mono text-gray-600 uppercase tracking-wider">Plan</span>
            <span className="text-[10px] font-mono text-gray-600 uppercase tracking-wider">Actions</span>
          </div>
        )}

        {/* List */}
        <div className="divide-y divide-gray-700/30">
          {loading && (
            <p className="text-gray-500 text-xs font-mono text-center py-8">LOADING…</p>
          )}
          {!loading && sorted.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-10">
              <CalendarDays size={28} className="text-gray-700" />
              <p className="text-gray-500 text-sm">No practice plans saved yet.</p>
              <p className="text-gray-600 text-xs font-mono">Create one in the Practice Planner.</p>
            </div>
          )}

          {paginated.map((s) => {
            const isToday   = s.date === today;
            const isFuture  = s.date > today;
            return (
              <div
                key={s.id}
                className={`flex items-center gap-3 px-6 py-3 transition-colors ${
                  isToday ? "bg-mustang-red/5" : "hover:bg-gray-700/20"
                }`}
              >
                {/* Date badge */}
                <div className="w-1.5 self-stretch rounded-full shrink-0 mt-0.5" style={{
                  backgroundColor: isToday ? "rgb(220 38 38)" : isFuture ? "rgb(96 165 250 / 0.6)" : "rgb(75 85 99)",
                }} />

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-white text-sm font-medium">{formatDate(s.date)}</p>
                    {isToday && (
                      <span className="text-[9px] font-mono text-mustang-red bg-mustang-red/10 border border-mustang-red/20 px-1.5 py-0.5 rounded-full">TODAY</span>
                    )}
                    {isFuture && (
                      <span className="text-[9px] font-mono text-blue-400 bg-blue-400/10 border border-blue-400/20 px-1.5 py-0.5 rounded-full">UPCOMING</span>
                    )}
                  </div>
                  <p className="text-gray-500 text-xs font-mono">
                    {s.drills.length} drill{s.drills.length !== 1 ? "s" : ""} · {formatTime12(s.start_time)}
                  </p>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-0.5 shrink-0">
                  <button type="button" title="Edit in Planner"
                    onClick={() => {
                      const tp = s.team_id ? `&team_id=${s.team_id}` : "";
                      router.push(`/planner?date=${s.date}${tp}`);
                    }}
                    className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors">
                    <Pencil size={14} />
                  </button>

                  <button type="button" title="Copy to another date"
                    onClick={() => setCopying(s)}
                    className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors">
                    <Copy size={14} />
                  </button>

                  <button type="button" title="Print / Save as PDF"
                    onClick={() => handlePrint(s)}
                    className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors">
                    <Printer size={14} />
                  </button>

                  <button type="button" title="Email plan"
                    onClick={() => handleEmail(s)}
                    className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors">
                    <Mail size={14} />
                  </button>

                  <button type="button" title="Delete plan"
                    disabled={deleting === s.id}
                    onClick={() => handleDelete(s)}
                    className="p-2 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-400/10 transition-colors disabled:opacity-40">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Pagination footer */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-3 border-t border-gray-700">
            <span className="text-gray-500 text-xs font-mono">
              {(page - 1) * perPage + 1}–{Math.min(page * perPage, sorted.length)} of {sorted.length}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              {/* Page number pills — show at most 5 */}
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((n) => n === 1 || n === totalPages || Math.abs(n - page) <= 1)
                .reduce<(number | "…")[]>((acc, n, i, arr) => {
                  if (i > 0 && n - (arr[i - 1] as number) > 1) acc.push("…");
                  acc.push(n);
                  return acc;
                }, [])
                .map((item, i) =>
                  item === "…" ? (
                    <span key={`ellipsis-${i}`} className="text-gray-600 text-xs px-1">…</span>
                  ) : (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setPage(item as number)}
                      className={`w-7 h-7 rounded-lg text-xs font-mono transition-colors ${
                        page === item
                          ? "bg-mustang-red text-white"
                          : "text-gray-400 hover:text-white hover:bg-gray-700"
                      }`}
                    >
                      {item}
                    </button>
                  )
                )}
              <button
                type="button"
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </section>

      {copying && (
        <CopyModal
          source={copying}
          onConfirm={(date) => handleCopy(copying, date)}
          onClose={() => setCopying(null)}
        />
      )}
    </>
  );
}
