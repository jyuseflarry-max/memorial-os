"use client";

import { useState, useEffect } from "react";
import { Save, CheckCircle2, Loader2 } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import type { AttendanceConsequence } from "@/app/api/attendance/consequences/route";

const LABELS: Record<string, { title: string; desc: string; color: string }> = {
  "practice:unexcused": { title: "Practice — Unexcused",  desc: "Player missed practice with no approved reason",  color: "border-red-500/30 bg-red-500/5" },
  "practice:excused":   { title: "Practice — Excused",    desc: "Player missed practice with an approved reason",  color: "border-emerald-500/30 bg-emerald-500/5" },
  "game:unexcused":     { title: "Game — Unexcused",      desc: "Player missed a game with no approved reason",    color: "border-red-500/40 bg-red-500/10" },
  "game:excused":       { title: "Game — Excused",        desc: "Player missed a game with an approved reason",    color: "border-emerald-500/40 bg-emerald-500/10" },
};

const ORDER = ["practice:unexcused", "practice:excused", "game:unexcused", "game:excused"];

type SaveState = "idle" | "saving" | "saved";

export default function AttendanceConsequencesPage() {
  const [rows,     setRows]     = useState<AttendanceConsequence[]>([]);
  const [drafts,   setDrafts]   = useState<Record<string, string>>({});
  const [loading,  setLoading]  = useState(true);
  const [saveState, setSaveState] = useState<Record<string, SaveState>>({});

  useEffect(() => {
    fetch("/api/attendance/consequences")
      .then((r) => r.json())
      .then((data: AttendanceConsequence[]) => {
        setRows(data);
        const d: Record<string, string> = {};
        for (const r of data) d[`${r.event_type}:${r.status}`] = r.makeup_work;
        setDrafts(d);
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSave(key: string) {
    const row = rows.find((r) => `${r.event_type}:${r.status}` === key);
    if (!row) return;
    setSaveState((s) => ({ ...s, [key]: "saving" }));
    const res = await fetch("/api/attendance/consequences", {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ id: row.id, makeup_work: drafts[key] ?? "" }),
    });
    if (res.ok) {
      const updated: AttendanceConsequence = await res.json();
      setRows((prev) => prev.map((r) => r.id === updated.id ? updated : r));
      setSaveState((s) => ({ ...s, [key]: "saved" }));
      setTimeout(() => setSaveState((s) => ({ ...s, [key]: "idle" })), 2000);
    } else {
      setSaveState((s) => ({ ...s, [key]: "idle" }));
    }
  }

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-white text-2xl font-bold tracking-tight">Attendance Consequences</h1>
        <p className="text-gray-400 text-sm mt-0.5 font-mono">
          MAKEUP WORK ASSIGNED FOR EACH ABSENCE TYPE
        </p>
      </div>

      {loading && (
        <div className="flex justify-center py-16">
          <Loader2 size={20} className="animate-spin text-gray-500" />
        </div>
      )}

      {!loading && (
        <div className="grid gap-4 sm:grid-cols-2">
          {ORDER.map((key) => {
            const meta  = LABELS[key];
            const state = saveState[key] ?? "idle";
            return (
              <div key={key} className={`border rounded-2xl p-5 flex flex-col gap-3 ${meta.color}`}>
                <div>
                  <p className="text-white font-semibold text-sm">{meta.title}</p>
                  <p className="text-gray-500 text-xs mt-0.5">{meta.desc}</p>
                </div>
                <div>
                  <p className="text-[10px] font-mono text-gray-500 uppercase tracking-wider mb-1.5">
                    Makeup Work
                  </p>
                  <textarea
                    value={drafts[key] ?? ""}
                    onChange={(e) => setDrafts((d) => ({ ...d, [key]: e.target.value }))}
                    rows={3}
                    placeholder="e.g. 10 extra sprints at next practice"
                    className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm resize-none focus:outline-none focus:border-gray-500 placeholder:text-gray-600"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleSave(key)}
                  disabled={state === "saving"}
                  className="self-end flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-coaches-red hover:bg-coaches-red/80 disabled:opacity-50 text-white text-xs font-semibold transition-colors"
                >
                  {state === "saving" && <Loader2 size={12} className="animate-spin" />}
                  {state === "saved"  && <CheckCircle2 size={12} />}
                  {state === "idle"   && <Save size={12} />}
                  {state === "saving" ? "Saving…" : state === "saved" ? "Saved" : "Save"}
                </button>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-[10px] font-mono text-gray-600 mt-6">
        These descriptions appear in coach review panels and are sent to players when absences are approved.
      </p>
    </DashboardLayout>
  );
}
