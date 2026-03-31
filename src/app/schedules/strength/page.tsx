"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Plus, Edit2, Trash2, Loader2, CalendarDays,
  Clock, X, Save, Upload, Dumbbell, CheckSquare,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import BulkImportModal from "@/components/BulkImportModal";
import { useTeam } from "@/context/TeamContext";
import { useFacilities } from "@/context/FacilitiesContext";
import type { StrengthScheduleEntry } from "@/app/api/strength-schedule/route";

// ── Helpers ────────────────────────────────────────────────────────────────

function fmt12h(time: string): string {
  const [hStr, mStr] = time.split(":");
  const h = parseInt(hStr, 10);
  const suffix = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${mStr} ${suffix}`;
}

function fmtDate(iso: string) {
  const d = new Date(iso + "T12:00:00");
  return {
    short:   d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    weekday: d.toLocaleDateString("en-US", { weekday: "short" }),
    month:   d.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
  };
}

function durationMins(start: string, end: string): number {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  return (eh * 60 + em) - (sh * 60 + sm);
}

type ModalMode = { type: "add" } | { type: "edit"; entry: StrengthScheduleEntry };

interface Program { id: string; name: string; phase: string | null; }

// ── Modal ──────────────────────────────────────────────────────────────────

function StrengthModal({
  mode, teamId, programs, onSave, onClose,
}: {
  mode:     ModalMode;
  teamId:   string | null;
  programs: Program[];
  onSave:   (e: StrengthScheduleEntry) => void;
  onClose:  () => void;
}) {
  const { facilities } = useFacilities();

  const blank = {
    schedule_date: "",
    start_time:    "07:00",
    end_time:      "08:00",
    program_id:    null as string | null,
    facility_id:   null as string | null,
    team_id:       teamId,
    notes:         null as string | null,
  };

  const [draft, setDraft] = useState(() =>
    mode.type === "edit"
      ? {
          schedule_date: mode.entry.schedule_date,
          start_time:    mode.entry.start_time,
          end_time:      mode.entry.end_time,
          program_id:    mode.entry.program_id,
          facility_id:   mode.entry.facility_id,
          team_id:       mode.entry.team_id,
          notes:         mode.entry.notes,
        }
      : blank
  );
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState<string | null>(null);

  function patch<K extends keyof typeof draft>(key: K, val: (typeof draft)[K]) {
    setDraft((d) => ({ ...d, [key]: val }));
  }

  async function handleSave() {
    if (!draft.schedule_date) { setError("Date is required."); return; }
    setSaving(true); setError(null);
    const url    = mode.type === "edit" ? `/api/strength-schedule/${mode.entry.id}` : "/api/strength-schedule";
    const method = mode.type === "edit" ? "PATCH" : "POST";
    const res  = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(draft) });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? "Save failed"); setSaving(false); return; }
    onSave(data);
  }

  const inputCls = "bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-coaches-red transition-colors font-mono w-full";
  const labelCls = "text-[10px] font-mono text-gray-500 uppercase tracking-wider";
  const dur = draft.start_time && draft.end_time ? durationMins(draft.start_time, draft.end_time) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-gray-700">
          <h2 className="text-white font-semibold text-base">
            {mode.type === "add" ? "Schedule Lifting Session" : "Edit Session"}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors"><X size={18} /></button>
        </div>
        <div className="p-5 flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className={labelCls}>Date *</label>
            <input type="date" value={draft.schedule_date} onChange={(e) => patch("schedule_date", e.target.value)} className={inputCls} />
          </div>
          <div className="flex gap-3">
            <div className="flex flex-col gap-1 flex-1">
              <label className={labelCls}>Start Time</label>
              <input type="time" value={draft.start_time} onChange={(e) => patch("start_time", e.target.value)} className={inputCls} />
            </div>
            <div className="flex flex-col gap-1 flex-1">
              <label className={labelCls}>End Time {dur > 0 && <span className="text-gray-600 normal-case">({dur}m)</span>}</label>
              <input type="time" value={draft.end_time} onChange={(e) => patch("end_time", e.target.value)} className={inputCls} />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className={labelCls}>Program / Workout</label>
            <select value={draft.program_id ?? ""} onChange={(e) => patch("program_id", e.target.value || null)} className={inputCls + " appearance-none"}>
              <option value="">— No program assigned —</option>
              {programs.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}{p.phase ? ` (${p.phase})` : ""}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className={labelCls}>Facility</label>
            <select value={draft.facility_id ?? ""} onChange={(e) => patch("facility_id", e.target.value || null)} className={inputCls + " appearance-none"}>
              <option value="">— No facility —</option>
              {facilities.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className={labelCls}>Notes</label>
            <input type="text" value={draft.notes ?? ""} onChange={(e) => patch("notes", e.target.value || null)} placeholder="Optional note…" className={inputCls} />
          </div>
          {error && <p className="text-red-400 text-xs font-mono">{error}</p>}
        </div>
        <div className="flex items-center justify-end gap-3 p-5 border-t border-gray-700">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-xs font-semibold border border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 transition-colors">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-coaches-red hover:bg-coaches-red-dark text-white transition-colors disabled:opacity-50">
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function StrengthSchedulePage() {
  const { activeTeam } = useTeam();
  const [entries,       setEntries]       = useState<StrengthScheduleEntry[]>([]);
  const [programs,      setPrograms]      = useState<Program[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState<string | null>(null);
  const [modal,         setModal]         = useState<ModalMode | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<StrengthScheduleEntry | null>(null);
  const [showImport,    setShowImport]    = useState(false);
  const [selectedIds,   setSelectedIds]   = useState<Set<string>>(new Set());
  const [showBulkDelete, setShowBulkDelete] = useState(false);
  const [bulkDeleting,  setBulkDeleting]  = useState(false);

  useEffect(() => {
    fetch("/api/strength/programs")
      .then((r) => r.ok ? r.json() : [])
      .then(setPrograms)
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (activeTeam) params.set("team_id", activeTeam.id);
    fetch(`/api/strength-schedule?${params}`)
      .then((r) => r.json())
      .then((d) => { if (d.error) setError(d.error); else setEntries(d); })
      .catch(() => setError("Failed to load"))
      .finally(() => setLoading(false));
  }, [activeTeam]);

  const byMonth = useMemo(() => {
    const map = new Map<string, StrengthScheduleEntry[]>();
    for (const e of entries) {
      const month = fmtDate(e.schedule_date).month;
      if (!map.has(month)) map.set(month, []);
      map.get(month)!.push(e);
    }
    return Array.from(map.entries());
  }, [entries]);

  function handleSaved(saved: StrengthScheduleEntry) {
    setEntries((prev) => {
      const idx = prev.findIndex((e) => e.id === saved.id);
      if (idx >= 0) {
        const next = [...prev]; next[idx] = saved; return next.sort((a, b) =>
          a.schedule_date.localeCompare(b.schedule_date) || a.start_time.localeCompare(b.start_time));
      }
      return [...prev, saved].sort((a, b) =>
        a.schedule_date.localeCompare(b.schedule_date) || a.start_time.localeCompare(b.start_time));
    });
    setModal(null);
  }

  async function handleDelete(e: StrengthScheduleEntry) {
    await fetch(`/api/strength-schedule/${e.id}`, { method: "DELETE" });
    setEntries((prev) => prev.filter((x) => x.id !== e.id));
    setConfirmDelete(null);
  }

  async function handleBulkDelete() {
    setBulkDeleting(true);
    await Promise.all([...selectedIds].map((id) => fetch(`/api/strength-schedule/${id}`, { method: "DELETE" })));
    setEntries((prev) => prev.filter((e) => !selectedIds.has(e.id)));
    setSelectedIds(new Set());
    setShowBulkDelete(false);
    setBulkDeleting(false);
  }

  const allSelected  = entries.length > 0 && entries.every((e) => selectedIds.has(e.id));
  const someSelected = !allSelected && entries.some((e) => selectedIds.has(e.id));

  function reloadAfterImport() {
    const params = new URLSearchParams();
    if (activeTeam) params.set("team_id", activeTeam.id);
    fetch(`/api/strength-schedule?${params}`)
      .then((r) => r.json())
      .then((d) => { if (!d.error) setEntries(d); })
      .catch(() => {});
  }

  return (
    <DashboardLayout>
      <div className="flex items-start justify-between mb-5 flex-wrap gap-4">
        <div>
          <h1 className="text-white text-2xl font-bold tracking-tight">Strength Schedule</h1>
          <p className="text-gray-400 text-sm mt-0.5 font-mono">{activeTeam?.name.toUpperCase() ?? "ALL TEAMS"}</p>
        </div>
        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <button
              type="button"
              onClick={() => setShowBulkDelete(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors"
            >
              <Trash2 size={15} /> Delete Selected ({selectedIds.size})
            </button>
          )}
          <button onClick={() => setShowImport(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-700 hover:bg-gray-600 text-white text-sm font-semibold transition-colors">
            <Upload size={15} /> Import CSV
          </button>
          <button onClick={() => setModal({ type: "add" })} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-coaches-red hover:bg-coaches-red-dark text-white text-sm font-semibold transition-colors">
            <Plus size={15} /> Schedule Session
          </button>
        </div>
      </div>

      {/* Select-all bar */}
      {!loading && entries.length > 0 && (
        <div className="flex items-center gap-3 px-4 py-2 mb-1 text-[10px] font-mono text-gray-600 uppercase tracking-wider">
          <input
            type="checkbox"
            checked={allSelected}
            ref={(el) => { if (el) el.indeterminate = someSelected; }}
            onChange={(e) => setSelectedIds(e.target.checked ? new Set(entries.map((x) => x.id)) : new Set())}
            className="w-4 h-4 rounded border-gray-600 bg-gray-700 cursor-pointer accent-red-600"
          />
          <span>{allSelected ? "Deselect All" : "Select All"}</span>
          {selectedIds.size > 0 && <span className="text-coaches-red">{selectedIds.size} selected</span>}
        </div>
      )}

      {loading && <div className="flex justify-center py-20"><Loader2 size={24} className="animate-spin text-coaches-red" /></div>}
      {error   && <p className="text-red-400 text-sm font-mono">{error}</p>}

      {!loading && !error && entries.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Dumbbell size={40} className="text-gray-700" />
          <p className="text-gray-500 font-mono text-sm">No sessions scheduled yet.</p>
          <button onClick={() => setModal({ type: "add" })} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-coaches-red hover:bg-coaches-red-dark text-white text-sm font-semibold transition-colors">
            <Plus size={14} /> Schedule First Session
          </button>
        </div>
      )}

      <div className="flex flex-col gap-6">
        {byMonth.map(([month, items]) => (
          <div key={month}>
            <p className="text-[10px] font-mono text-gray-500 uppercase tracking-widest mb-2 px-1">{month}</p>
            <div className="bg-gray-900 border border-gray-700 rounded-2xl overflow-hidden">
              {items.map((entry, i) => {
                const { short, weekday } = fmtDate(entry.schedule_date);
                const dur = durationMins(entry.start_time, entry.end_time);
                const isSelected = selectedIds.has(entry.id);
                return (
                  <div key={entry.id} className={`flex items-center gap-3 px-4 py-3.5 ${i < items.length - 1 ? "border-b border-gray-700/50" : ""} hover:bg-gray-800/30 transition-colors group ${isSelected ? "bg-red-500/5" : ""}`}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => setSelectedIds((prev) => {
                        const next = new Set(prev);
                        if (e.target.checked) next.add(entry.id); else next.delete(entry.id);
                        return next;
                      })}
                      className="w-4 h-4 rounded border-gray-600 bg-gray-700 cursor-pointer accent-red-600 shrink-0"
                    />
                    <div className="w-24 shrink-0">
                      <p className="text-white font-mono text-sm font-semibold">{short}</p>
                      <p className="text-gray-600 font-mono text-[10px]">{weekday}</p>
                    </div>
                    <div className="flex items-center gap-1 text-gray-400 text-xs font-mono w-32 shrink-0">
                      <Clock size={11} />
                      {fmt12h(entry.start_time)}–{fmt12h(entry.end_time)}
                      <span className="text-gray-600 ml-1">{dur}m</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      {entry.program ? (
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-white text-xs font-semibold truncate">{entry.program.name}</p>
                          {entry.program.phase && (
                            <span className="text-[9px] font-mono text-purple-400 bg-purple-500/10 border border-purple-500/20 px-1.5 py-0.5 rounded-full shrink-0">
                              {entry.program.phase}
                            </span>
                          )}
                        </div>
                      ) : (
                        <p className="text-gray-600 text-xs font-mono">No program assigned</p>
                      )}
                      {entry.facility && (
                        <p className="text-gray-500 text-[11px] font-mono mt-0.5">{entry.facility.name}</p>
                      )}
                      {entry.notes && <p className="text-gray-500 text-[11px] mt-0.5 truncate">{entry.notes}</p>}
                    </div>
                    <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100">
                      <button onClick={() => setModal({ type: "edit", entry })} className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-600 hover:text-white hover:bg-gray-700 transition-colors"><Edit2 size={13} /></button>
                      <button onClick={() => setConfirmDelete(entry)} className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-600 hover:text-coaches-red hover:bg-coaches-red/10 transition-colors"><Trash2 size={13} /></button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {modal && (
        <StrengthModal
          mode={modal}
          teamId={activeTeam?.id ?? null}
          programs={programs}
          onSave={handleSaved}
          onClose={() => setModal(null)}
        />
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-white font-semibold mb-2">Delete Session?</h3>
            <p className="text-gray-400 text-sm mb-6">
              {fmtDate(confirmDelete.schedule_date).short} lifting session will be permanently removed.
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setConfirmDelete(null)} className="px-4 py-2 rounded-lg text-xs font-semibold border border-gray-700 text-gray-400 hover:text-white transition-colors">Cancel</button>
              <button onClick={() => handleDelete(confirmDelete)} className="px-4 py-2 rounded-lg text-xs font-semibold bg-red-600 hover:bg-red-700 text-white transition-colors">Delete</button>
            </div>
          </div>
        </div>
      )}

      {showBulkDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-white font-semibold mb-2">Delete {selectedIds.size} Sessions?</h3>
            <p className="text-gray-400 text-sm mb-6">This cannot be undone.</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowBulkDelete(false)} className="px-4 py-2 rounded-lg text-xs font-semibold border border-gray-700 text-gray-400 hover:text-white transition-colors">Cancel</button>
              <button onClick={handleBulkDelete} disabled={bulkDeleting} className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 transition-colors">
                {bulkDeleting && <Loader2 size={13} className="animate-spin" />}
                {bulkDeleting ? "Deleting…" : "Delete All"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showImport && (
        <BulkImportModal
          teamId={activeTeam?.id ?? null}
          onClose={() => setShowImport(false)}
          onImported={() => { setShowImport(false); reloadAfterImport(); }}
        />
      )}
    </DashboardLayout>
  );
}
