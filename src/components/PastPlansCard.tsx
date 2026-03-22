"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ClipboardList, Pencil, Copy, Trash2, X, CalendarDays } from "lucide-react";
import { useTeam } from "@/context/TeamContext";

interface SavedSession {
  id: string;
  date: string;       // YYYY-MM-DD
  start_time: string;
  drills: unknown[];
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="bg-gray-800 border border-gray-700 rounded-2xl p-6 w-80 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <p className="text-white font-semibold">Copy Plan</p>
          <button type="button" onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X size={16} />
          </button>
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
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 rounded-lg border border-gray-600 text-gray-400 text-sm hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!date}
            onClick={() => { if (date) onConfirm(date); }}
            className="flex-1 px-4 py-2 rounded-lg bg-mustang-red hover:bg-mustang-red-dark disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors"
          >
            Copy
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────

export default function PastPlansCard() {
  const router = useRouter();
  const { activeTeam } = useTeam();
  const today = isoToday();

  const [sessions, setSessions] = useState<SavedSession[]>([]);
  const [loading, setLoading]   = useState(true);
  const [copying, setCopying]   = useState<SavedSession | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null); // session id being deleted

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const teamParam = activeTeam ? `?team_id=${activeTeam.id}` : "";
      const res  = await fetch(`/api/sessions${teamParam}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        // Past sessions only, most recent first
        const past = data
          .filter((s: SavedSession) => s.date < today)
          .sort((a: SavedSession, b: SavedSession) => b.date.localeCompare(a.date));
        setSessions(past);
      }
    } catch {}
    setLoading(false);
  }, [activeTeam, today]);

  useEffect(() => { load(); }, [load]);

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
      // Navigate to the new plan
      const teamParam = source.team_id ? `&team_id=${source.team_id}` : "";
      router.push(`/planner?date=${targetDate}${teamParam}`);
    } catch {}
  }

  return (
    <>
      <section className="bg-gray-800 border border-gray-700 rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <ClipboardList size={18} className="text-mustang-red" />
            <h2 className="text-white font-semibold">Previous Plans</h2>
          </div>
          <span className="text-gray-500 text-xs font-mono">
            {activeTeam?.name.toUpperCase() ?? "ALL TEAMS"} · {loading ? "…" : sessions.length} PLANS
          </span>
        </div>

        {/* List */}
        <div className="divide-y divide-gray-700/50">
          {loading && (
            <p className="text-gray-500 text-xs font-mono text-center py-8">LOADING…</p>
          )}
          {!loading && sessions.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-10">
              <CalendarDays size={28} className="text-gray-700" />
              <p className="text-gray-500 text-sm">No previous plans saved.</p>
              <p className="text-gray-600 text-xs font-mono">Plans you save will appear here.</p>
            </div>
          )}
          {sessions.map((s) => (
            <div
              key={s.id}
              className="flex items-center gap-3 px-6 py-3 hover:bg-gray-700/20 transition-colors"
            >
              {/* Date + meta */}
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium">{formatDate(s.date)}</p>
                <p className="text-gray-500 text-xs font-mono">
                  {s.drills.length} drill{s.drills.length !== 1 ? "s" : ""} · {s.start_time}
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 shrink-0">
                {/* Edit */}
                <button
                  type="button"
                  title="Edit in Planner"
                  onClick={() => {
                    const teamParam = s.team_id ? `&team_id=${s.team_id}` : "";
                    router.push(`/planner?date=${s.date}${teamParam}`);
                  }}
                  className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
                >
                  <Pencil size={14} />
                </button>

                {/* Copy */}
                <button
                  type="button"
                  title="Copy to another date"
                  onClick={() => setCopying(s)}
                  className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
                >
                  <Copy size={14} />
                </button>

                {/* Delete */}
                <button
                  type="button"
                  title="Delete plan"
                  disabled={deleting === s.id}
                  onClick={() => handleDelete(s)}
                  className="p-2 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-400/10 transition-colors disabled:opacity-40"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Copy modal */}
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
