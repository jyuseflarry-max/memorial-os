"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { X, Save, Loader2 } from "lucide-react";
import { Session, SessionSummary } from "@/types/session";
import { postSession } from "@/lib/session-api";

interface SaveToPlannerModalProps {
  session: Session;
  teamId: string | null;
  onClose: () => void;
}

/** Returns a safe default label for a new session given what already exists. */
function suggestLabel(existing: SessionSummary[]): string {
  if (existing.length === 0) return "";
  return `Session ${existing.length + 1}`;
}

export default function SaveToPlannerModal({ session, teamId, onClose }: SaveToPlannerModalProps) {
  const router = useRouter();

  const [date,        setDate]        = useState(session.date);
  const [label,       setLabel]       = useState("");
  const [existing,    setExisting]    = useState<SessionSummary[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState("");

  useEffect(() => {
    setLoadingList(true);
    const qp = teamId ? `?team_id=${teamId}` : "";
    fetch(`/api/sessions/${date}/list${qp}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setExisting(data);
          setLabel(suggestLabel(data));
        }
      })
      .catch(() => {})
      .finally(() => setLoadingList(false));
  }, [date, teamId]);

  const labelConflict = existing.some((s) => s.label === label);

  async function handleSave() {
    if (labelConflict || saving) return;
    setSaving(true);
    setError("");
    try {
      const res = await postSession({ ...session, date }, teamId, label);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Save failed");
      }
      const qp = new URLSearchParams({ date });
      if (teamId) qp.set("team_id", teamId);
      if (label)  qp.set("label", label);
      router.push(`/planner?${qp}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="bg-gray-800 border border-gray-700 rounded-2xl p-6 w-[360px] shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <p className="text-white font-semibold">Save to Planner</p>
          <button type="button" onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="flex flex-col gap-4">
          {/* Date */}
          <div>
            <p className="text-gray-400 text-xs font-mono mb-1.5">DATE</p>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm font-mono focus:outline-none focus:border-coaches-red transition-colors"
            />
          </div>

          {/* Existing sessions on this date */}
          {loadingList && (
            <p className="text-gray-500 text-xs font-mono flex items-center gap-1.5">
              <Loader2 size={11} className="animate-spin" /> Checking date…
            </p>
          )}
          {!loadingList && existing.length > 0 && (
            <div>
              <p className="text-gray-400 text-xs font-mono mb-1.5">ALREADY SAVED ON THIS DATE</p>
              <div className="flex flex-col gap-1">
                {existing.map((s) => (
                  <div key={s.id} className="flex items-center gap-2 px-3 py-2 bg-gray-700/50 rounded-lg text-xs">
                    <span className="text-gray-300 font-medium flex-1">{s.label || "Main Practice"}</span>
                    <span className="text-gray-500 font-mono">{s.drill_count} drills</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Label */}
          <div>
            <p className="text-gray-400 text-xs font-mono mb-1.5">
              {existing.length === 0 ? "LABEL (optional — blank = main practice)" : "LABEL FOR THIS SESSION"}
            </p>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder={existing.length === 0 ? "Leave blank for main practice" : "e.g. Morning, Afternoon"}
              className={`w-full bg-gray-700 border rounded-lg px-3 py-2 text-white text-sm focus:outline-none transition-colors ${
                labelConflict
                  ? "border-red-500 focus:border-red-500"
                  : "border-gray-600 focus:border-coaches-red"
              }`}
            />
            {labelConflict && (
              <p className="text-red-400 text-[10px] font-mono mt-1">
                A session with this label already exists for this date.
              </p>
            )}
          </div>

          {error && <p className="text-red-400 text-xs font-mono">{error}</p>}

          {/* Actions */}
          <div className="flex gap-2 mt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl border border-gray-600 text-gray-400 text-sm hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || labelConflict}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-coaches-red hover:bg-coaches-red-dark disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
