"use client";

import { useState, useEffect, useMemo } from "react";
import { Plus, Edit2, Trash2, Loader2, MapPin, CalendarDays, Clock, X, Save, ExternalLink, Upload } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { useTeam } from "@/context/TeamContext";
import { useLocations } from "@/context/LocationsContext";
import BulkImportModal from "@/components/BulkImportModal";
import type { PracticeSchedule, PracticeScheduleDraft } from "@/types/practice-schedule";
import { EMPTY_PRACTICE_DRAFT } from "@/types/practice-schedule";

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

type ModalMode = { type: "add" } | { type: "edit"; practice: PracticeSchedule };

function PracticeModal({
  mode, teamId, onSave, onClose,
}: {
  mode: ModalMode;
  teamId: string | null;
  onSave: (p: PracticeSchedule) => void;
  onClose: () => void;
}) {
  const { locations } = useLocations();
  const initial: PracticeScheduleDraft =
    mode.type === "edit"
      ? { ...mode.practice, location: undefined } as PracticeScheduleDraft
      : { ...EMPTY_PRACTICE_DRAFT, team_id: teamId };
  const [draft, setDraft] = useState<PracticeScheduleDraft>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  function patch<K extends keyof PracticeScheduleDraft>(key: K, val: PracticeScheduleDraft[K]) {
    setDraft((d) => ({ ...d, [key]: val }));
  }

  async function handleSave() {
    if (!draft.practice_date) { setError("Date is required."); return; }
    setSaving(true);
    setError(null);
    const url    = mode.type === "edit" ? `/api/practice-schedule/${mode.practice.id}` : "/api/practice-schedule";
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
          <h2 className="text-white font-semibold text-base">{mode.type === "add" ? "Schedule Practice" : "Edit Practice"}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors"><X size={18} /></button>
        </div>
        <div className="p-5 flex flex-col gap-4">
          <div className="flex gap-3">
            <div className="flex flex-col gap-1 flex-1">
              <label className={labelCls}>Date *</label>
              <input type="date" value={draft.practice_date} onChange={(e) => patch("practice_date", e.target.value)} className={inputCls} />
            </div>
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
            <label className={labelCls}>Location</label>
            <select value={draft.location_id ?? ""} onChange={(e) => patch("location_id", e.target.value || null)} className={inputCls + " appearance-none"}>
              <option value="">— No location —</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>{l.name}{l.is_home_venue ? " (Home)" : ""}</option>
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

export default function PracticeSchedulePage() {
  const { activeTeam } = useTeam();
  const [practices, setPractices] = useState<PracticeSchedule[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [modal, setModal]         = useState<ModalMode | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<PracticeSchedule | null>(null);
  const [showImport, setShowImport] = useState(false);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (activeTeam) params.set("team_id", activeTeam.id);
    fetch(`/api/practice-schedule?${params}`)
      .then((r) => r.json())
      .then((d) => { if (d.error) setError(d.error); else setPractices(d); })
      .catch(() => setError("Failed to load"))
      .finally(() => setLoading(false));
  }, [activeTeam]);

  const byMonth = useMemo(() => {
    const map = new Map<string, PracticeSchedule[]>();
    for (const p of practices) {
      const month = fmtDate(p.practice_date).month;
      if (!map.has(month)) map.set(month, []);
      map.get(month)!.push(p);
    }
    return Array.from(map.entries());
  }, [practices]);

  function handleSaved(saved: PracticeSchedule) {
    setPractices((prev) => {
      const idx = prev.findIndex((p) => p.id === saved.id);
      if (idx >= 0) { const next = [...prev]; next[idx] = saved; return next.sort((a, b) => a.practice_date.localeCompare(b.practice_date) || a.start_time.localeCompare(b.start_time)); }
      return [...prev, saved].sort((a, b) => a.practice_date.localeCompare(b.practice_date) || a.start_time.localeCompare(b.start_time));
    });
    setModal(null);
  }

  async function handleDelete(p: PracticeSchedule) {
    await fetch(`/api/practice-schedule/${p.id}`, { method: "DELETE" });
    setPractices((prev) => prev.filter((x) => x.id !== p.id));
    setConfirmDelete(null);
  }

  const planLink = (p: PracticeSchedule) => {
    const qp = new URLSearchParams({ date: p.practice_date });
    if (p.team_id) qp.set("team_id", p.team_id);
    return `/planner?${qp}`;
  };

  return (
    <DashboardLayout>
      <div className="flex items-start justify-between mb-5 flex-wrap gap-4">
        <div>
          <h1 className="text-white text-2xl font-bold tracking-tight">Practice Schedule</h1>
          <p className="text-gray-400 text-sm mt-0.5 font-mono">{activeTeam?.name.toUpperCase() ?? "ALL TEAMS"}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowImport(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-700 hover:bg-gray-600 text-white text-sm font-semibold transition-colors">
            <Upload size={15} /> Import CSV
          </button>
          <button onClick={() => setModal({ type: "add" })} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-coaches-red hover:bg-coaches-red-dark text-white text-sm font-semibold transition-colors">
            <Plus size={15} /> Schedule Practice
          </button>
        </div>
      </div>

      {loading && <div className="flex justify-center py-20"><Loader2 size={24} className="animate-spin text-coaches-red" /></div>}
      {error   && <p className="text-red-400 text-sm font-mono">{error}</p>}

      {!loading && !error && practices.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <CalendarDays size={40} className="text-gray-700" />
          <p className="text-gray-500 font-mono text-sm">No practices scheduled yet.</p>
          <button onClick={() => setModal({ type: "add" })} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-coaches-red hover:bg-coaches-red-dark text-white text-sm font-semibold transition-colors">
            <Plus size={14} /> Schedule First Practice
          </button>
        </div>
      )}

      <div className="flex flex-col gap-6">
        {byMonth.map(([month, items]) => (
          <div key={month}>
            <p className="text-[10px] font-mono text-gray-500 uppercase tracking-widest mb-2 px-1">{month}</p>
            <div className="bg-gray-900 border border-gray-700 rounded-2xl overflow-hidden">
              {items.map((p, i) => {
                const { short, weekday } = fmtDate(p.practice_date);
                const dur = durationMins(p.start_time, p.end_time);
                const loc = p.location;
                const mapsUrl = loc?.address && loc?.city
                  ? `https://maps.google.com/maps?q=${encodeURIComponent(loc.address + ", " + loc.city)}`
                  : null;
                return (
                  <div key={p.id} className={`flex items-center gap-3 px-4 py-3.5 ${i < items.length - 1 ? "border-b border-gray-700/50" : ""} hover:bg-gray-800/30 transition-colors group`}>
                    <div className="w-24 shrink-0">
                      <p className="text-white font-mono text-sm font-semibold">{short}</p>
                      <p className="text-gray-600 font-mono text-[10px]">{weekday}</p>
                    </div>
                    <div className="flex items-center gap-1 text-gray-400 text-xs font-mono w-32 shrink-0">
                      <Clock size={11} />
                      {fmt12h(p.start_time)}–{fmt12h(p.end_time)}
                      <span className="text-gray-600 ml-1">{dur}m</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      {loc ? (
                        mapsUrl ? (
                          <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-coaches-blue hover:text-blue-300 text-xs font-medium transition-colors truncate">
                            <MapPin size={11} />{loc.name}
                            {loc.is_home_venue && <span className="text-[9px] font-mono text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-1.5 rounded-full ml-1">HOME</span>}
                          </a>
                        ) : (
                          <div className="flex items-center gap-1 text-gray-400 text-xs font-medium truncate">
                            <MapPin size={11} />{loc.name}
                            {loc.is_home_venue && <span className="text-[9px] font-mono text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-1.5 rounded-full ml-1">HOME</span>}
                          </div>
                        )
                      ) : (
                        <p className="text-gray-600 text-xs font-mono">No location</p>
                      )}
                      {p.notes && <p className="text-gray-500 text-[11px] mt-0.5 truncate">{p.notes}</p>}
                    </div>
                    <a
                      href={planLink(p)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-coaches-red/10 border border-coaches-red/30 text-coaches-red hover:bg-coaches-red/20 text-xs font-semibold transition-colors shrink-0"
                    >
                      Plan <ExternalLink size={10} />
                    </a>
                    <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100">
                      <button onClick={() => setModal({ type: "edit", practice: p })} className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-600 hover:text-white hover:bg-gray-700 transition-colors"><Edit2 size={13} /></button>
                      <button onClick={() => setConfirmDelete(p)} className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-600 hover:text-coaches-red hover:bg-coaches-red/10 transition-colors"><Trash2 size={13} /></button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {showImport && (
        <BulkImportModal
          teamId={activeTeam?.id ?? null}
          onClose={() => setShowImport(false)}
          onImported={() => {
            const params = new URLSearchParams();
            if (activeTeam) params.set("team_id", activeTeam.id);
            fetch(`/api/practice-schedule?${params}`)
              .then((r) => r.json())
              .then((d) => { if (!d.error) setPractices(d); });
          }}
        />
      )}

      {modal && <PracticeModal mode={modal} teamId={activeTeam?.id ?? null} onSave={handleSaved} onClose={() => setModal(null)} />}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-white font-semibold text-base mb-2">Delete Practice?</h3>
            <p className="text-gray-400 text-sm mb-6">Remove the {fmtDate(confirmDelete.practice_date).short} practice from the schedule?</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setConfirmDelete(null)} className="px-4 py-2 rounded-lg text-xs font-semibold border border-gray-700 text-gray-400 hover:text-white transition-colors">Cancel</button>
              <button onClick={() => handleDelete(confirmDelete)} className="px-4 py-2 rounded-lg text-xs font-semibold bg-red-600 hover:bg-red-700 text-white transition-colors">Delete</button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
