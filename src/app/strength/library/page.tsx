"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Plus, Trash2, Lock, Pencil, X, Video, Check, Loader2 } from "lucide-react";
import type { StrengthExercise, MuscleGroup, StrengthEquipment } from "@/types/strength";

type Tab = "exercises" | "muscles" | "equipment";

const CATEGORY_LABELS: Record<string, string> = {
  compound: "Compound", olympic: "Olympic", isolation: "Isolation",
  core: "Core", conditioning: "Conditioning", mobility: "Mobility",
};

const REGION_COLORS: Record<string, string> = {
  upper:     "text-blue-400 bg-blue-400/10 border-blue-400/20",
  lower:     "text-red-400 bg-red-400/10 border-red-400/20",
  core:      "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
  full_body: "text-green-400 bg-green-400/10 border-green-400/20",
};

const CATEGORY_COLORS: Record<string, string> = {
  compound:     "text-blue-400 bg-blue-400/10 border-blue-400/20",
  olympic:      "text-purple-400 bg-purple-400/10 border-purple-400/20",
  isolation:    "text-orange-400 bg-orange-400/10 border-orange-400/20",
  core:         "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
  conditioning: "text-red-400 bg-red-400/10 border-red-400/20",
  mobility:     "text-green-400 bg-green-400/10 border-green-400/20",
};

// ── ExercisePanel (slide-in form for add/edit) ─────────────────────────────

function ExercisePanel({
  editing,
  muscles,
  equipment,
  onClose,
  onSaved,
}: {
  editing: StrengthExercise | null; // null = new
  muscles: MuscleGroup[];
  equipment: StrengthEquipment[];
  onClose: () => void;
  onSaved: (ex: StrengthExercise) => void;
}) {
  const [name,         setName]         = useState(editing?.name ?? "");
  const [category,     setCategory]     = useState<string>(editing?.category ?? "compound");
  const [primaryId,    setPrimaryId]    = useState(editing?.primary_muscle_group_id ?? "");
  const [secondaryIds, setSecondaryIds] = useState<string[]>(editing?.secondary_muscle_group_ids ?? []);
  const [equipIds,     setEquipIds]     = useState<string[]>(editing?.equipment_ids ?? []);
  const [videoUrl,     setVideoUrl]     = useState(editing?.demo_video_url ?? "");
  const [cues,         setCues]         = useState(editing?.coaching_cues ?? "");
  const [isPrimary,    setIsPrimary]    = useState(editing?.is_primary_lift ?? false);
  const [saving,       setSaving]       = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: name.trim(), category,
        primary_muscle_group_id:    primaryId    || null,
        secondary_muscle_group_ids: secondaryIds,
        equipment_ids:              equipIds,
        demo_video_url:  videoUrl.trim() || null,
        coaching_cues:   cues.trim()     || null,
        is_primary_lift: isPrimary,
        // Keep legacy arrays in sync for backwards compat with program editor dropdown
        primary_muscles:   primaryId   ? [muscles.find(m => m.id === primaryId)?.name ?? ""] : [],
        secondary_muscles: secondaryIds.map(sid => muscles.find(m => m.id === sid)?.name ?? "").filter(Boolean),
        equipment_keys:    equipIds.map(eid => equipment.find(eq => eq.id === eid)?.name ?? "").filter(Boolean),
      };
      const url    = editing ? `/api/strength/exercises/${editing.id}` : "/api/strength/exercises";
      const method = editing ? "PATCH" : "POST";
      const res    = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (res.ok) { const saved = await res.json(); onSaved(saved); }
    } finally { setSaving(false); }
  }

  const inputCls = "bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-coaches-red transition-colors w-full";
  const labelCls = "text-[10px] font-mono text-gray-500 uppercase tracking-wider";

  function toggleSecondary(id: string) {
    setSecondaryIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }
  function toggleEquip(id: string) {
    setEquipIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md bg-gray-900 border-l border-gray-700 h-full overflow-y-auto flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700 shrink-0">
          <h2 className="text-white font-bold text-sm">{editing ? "Edit Exercise" : "Add Exercise"}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white"><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-5 flex-1">
          <div className="flex flex-col gap-1">
            <label className={labelCls}>Name *</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Back Squat" className={inputCls} required />
          </div>
          <div className="flex flex-col gap-1">
            <label className={labelCls}>Category</label>
            <select value={category} onChange={e => setCategory(e.target.value)} className={inputCls}>
              {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className={labelCls}>Primary Muscle Group</label>
            <select value={primaryId} onChange={e => setPrimaryId(e.target.value)} className={inputCls}>
              <option value="">— None —</option>
              {muscles.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          {muscles.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>Secondary Muscle Groups</label>
              <div className="flex flex-wrap gap-2">
                {muscles.map(m => (
                  <button type="button" key={m.id}
                    onClick={() => toggleSecondary(m.id)}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${secondaryIds.includes(m.id) ? "bg-coaches-red border-coaches-red text-white" : "bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500"}`}>
                    {m.name}
                  </button>
                ))}
              </div>
            </div>
          )}
          {equipment.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <label className={labelCls}>Equipment</label>
              <div className="flex flex-wrap gap-2">
                {equipment.map(eq => (
                  <button type="button" key={eq.id}
                    onClick={() => toggleEquip(eq.id)}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${equipIds.includes(eq.id) ? "bg-coaches-red border-coaches-red text-white" : "bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500"}`}>
                    {eq.name}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="flex flex-col gap-1">
            <label className={labelCls}>Demo Video URL</label>
            <input value={videoUrl} onChange={e => setVideoUrl(e.target.value)} placeholder="https://youtube.com/watch?v=..." className={inputCls} />
          </div>
          <div className="flex flex-col gap-1">
            <label className={labelCls}>Coaching Cues</label>
            <textarea value={cues} onChange={e => setCues(e.target.value)} rows={3} placeholder="Key technique points..." className={`${inputCls} resize-none`} />
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <div
              onClick={() => setIsPrimary(p => !p)}
              className={`w-10 h-5 rounded-full transition-colors relative ${isPrimary ? "bg-coaches-red" : "bg-gray-700"}`}>
              <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${isPrimary ? "translate-x-5" : "translate-x-0.5"}`} />
            </div>
            <span className="text-sm text-gray-300">Primary Lift</span>
          </label>
          <button type="submit" disabled={saving || !name.trim()}
            className="mt-auto flex items-center justify-center gap-2 bg-coaches-red hover:bg-coaches-red-dark disabled:opacity-40 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            {saving ? "Saving…" : editing ? "Save Changes" : "Add Exercise"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function LibraryPage() {
  const [tab,       setTab]       = useState<Tab>("exercises");
  const [exercises, setExercises] = useState<StrengthExercise[]>([]);
  const [muscles,   setMuscles]   = useState<MuscleGroup[]>([]);
  const [equipment, setEquipment] = useState<StrengthEquipment[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [panel,     setPanel]     = useState<StrengthExercise | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);

  // ── Add-row state for inline tables ─────────────────────────────────────
  const [newMuscle,    setNewMuscle]    = useState({ name: "", body_region: "" });
  const [newEquipment, setNewEquipment] = useState({ name: "" });
  const [addingMuscle, setAddingMuscle] = useState(false);
  const [addingEquip,  setAddingEquip]  = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/strength/exercises").then(r => r.json()),
      fetch("/api/strength/muscle-groups").then(r => r.json()),
      fetch("/api/strength/equipment").then(r => r.json()),
    ]).then(([ex, mg, eq]) => {
      if (Array.isArray(ex)) setExercises(ex);
      if (Array.isArray(mg)) setMuscles(mg);
      if (Array.isArray(eq)) setEquipment(eq);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  // ── Muscle CRUD ──────────────────────────────────────────────────────────
  async function addMuscle(e: React.FormEvent) {
    e.preventDefault();
    if (!newMuscle.name.trim()) return;
    setAddingMuscle(true);
    try {
      const res = await fetch("/api/strength/muscle-groups", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(newMuscle) });
      if (res.ok) { const m = await res.json(); setMuscles(prev => [...prev, m]); setNewMuscle({ name: "", body_region: "" }); }
    } finally { setAddingMuscle(false); }
  }
  async function deleteMuscle(id: string) {
    const res = await fetch(`/api/strength/muscle-groups/${id}`, { method: "DELETE" });
    if (res.ok || res.status === 204) setMuscles(prev => prev.filter(m => m.id !== id));
  }

  // ── Equipment CRUD ───────────────────────────────────────────────────────
  async function addEquipment(e: React.FormEvent) {
    e.preventDefault();
    if (!newEquipment.name.trim()) return;
    setAddingEquip(true);
    try {
      const res = await fetch("/api/strength/equipment", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(newEquipment) });
      if (res.ok) { const eq = await res.json(); setEquipment(prev => [...prev, eq]); setNewEquipment({ name: "" }); }
    } finally { setAddingEquip(false); }
  }
  async function deleteEquipment(id: string) {
    const res = await fetch(`/api/strength/equipment/${id}`, { method: "DELETE" });
    if (res.ok || res.status === 204) setEquipment(prev => prev.filter(e => e.id !== id));
  }

  // ── Exercise CRUD ────────────────────────────────────────────────────────
  function onExerciseSaved(ex: StrengthExercise) {
    setExercises(prev => {
      const idx = prev.findIndex(e => e.id === ex.id);
      if (idx >= 0) { const next = [...prev]; next[idx] = ex; return next; }
      return [ex, ...prev];
    });
    setPanelOpen(false);
  }
  async function deleteExercise(id: string) {
    const res = await fetch(`/api/strength/exercises/${id}`, { method: "DELETE" });
    if (res.ok || res.status === 204) setExercises(prev => prev.filter(e => e.id !== id));
  }

  const thCls = "text-left text-[10px] font-mono text-gray-500 uppercase tracking-wider px-3 py-2.5 font-medium";
  const tdCls = "px-3 py-2.5 text-sm text-gray-300 align-middle";

  if (loading) return (
    <DashboardLayout>
      <div className="flex justify-center py-20"><Loader2 size={24} className="animate-spin text-coaches-red" /></div>
    </DashboardLayout>
  );

  return (
    <DashboardLayout>
      <div className="max-w-5xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
          <div>
            <h1 className="text-white text-2xl font-bold tracking-tight">Exercise Library</h1>
            <p className="text-gray-400 text-xs font-mono mt-0.5">MANAGE EXERCISES, MUSCLE GROUPS & EQUIPMENT</p>
          </div>
          {tab === "exercises" && (
            <button onClick={() => { setPanel(null); setPanelOpen(true); }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-coaches-red hover:bg-coaches-red-dark text-white text-sm font-semibold transition-colors">
              <Plus size={14} /> Add Exercise
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-5 bg-gray-800/60 border border-gray-700 rounded-xl p-1 w-fit">
          {([["exercises", "Exercises"], ["muscles", "Muscle Groups"], ["equipment", "Equipment"]] as [Tab, string][]).map(([t, label]) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === t ? "bg-gray-700 text-white" : "text-gray-500 hover:text-gray-300"}`}>
              {label}
            </button>
          ))}
        </div>

        {/* ── Exercises Tab ──────────────────────────────────────────────── */}
        {tab === "exercises" && (
          <div className="bg-gray-900 border border-gray-700 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-800/60 border-b border-gray-700">
                  <tr>
                    <th className={thCls}>Name</th>
                    <th className={thCls}>Category</th>
                    <th className={thCls}>Primary Muscle</th>
                    <th className={thCls}>Secondary</th>
                    <th className={thCls}>Equipment</th>
                    <th className={thCls}>Video</th>
                    <th className={thCls}>Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {exercises.map(ex => {
                    const primaryMuscle = muscles.find(m => m.id === ex.primary_muscle_group_id);
                    const secondaryMuscleNames = (ex.secondary_muscle_group_ids ?? []).map(sid => muscles.find(m => m.id === sid)?.name).filter((n): n is string => Boolean(n));
                    const equipNames = (ex.equipment_ids ?? []).map(eid => equipment.find(e => e.id === eid)?.name).filter((n): n is string => Boolean(n));
                    // fallback to legacy string arrays
                    const displayPrimary = primaryMuscle?.name ?? ex.primary_muscles?.[0] ?? "—";
                    const displaySecondary = secondaryMuscleNames.length > 0 ? secondaryMuscleNames : (ex.secondary_muscles ?? []);
                    const displayEquip = equipNames.length > 0 ? equipNames : (ex.equipment_keys ?? []);

                    return (
                      <tr key={ex.id} className="hover:bg-gray-800/40 transition-colors">
                        <td className={tdCls}>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-white">{ex.name}</span>
                            {ex.is_global && <Lock size={11} className="text-gray-600 shrink-0" />}
                            {ex.is_primary_lift && <span className="text-[9px] font-mono bg-yellow-400/10 text-yellow-400 border border-yellow-400/20 px-1.5 py-0.5 rounded">PRIMARY</span>}
                          </div>
                        </td>
                        <td className={tdCls}>
                          <span className={`text-[10px] font-mono font-bold uppercase px-1.5 py-0.5 rounded border ${CATEGORY_COLORS[ex.category] ?? ""}`}>{CATEGORY_LABELS[ex.category] ?? ex.category}</span>
                        </td>
                        <td className={tdCls}><span className="text-gray-300">{displayPrimary}</span></td>
                        <td className={tdCls}>
                          <div className="flex flex-wrap gap-1">
                            {displaySecondary.slice(0, 2).map((s, i) => (
                              <span key={i} className="text-[10px] bg-gray-800 border border-gray-700 text-gray-400 px-1.5 py-0.5 rounded">{s}</span>
                            ))}
                            {displaySecondary.length > 2 && <span className="text-[10px] text-gray-600">+{displaySecondary.length - 2}</span>}
                          </div>
                        </td>
                        <td className={tdCls}>
                          <div className="flex flex-wrap gap-1">
                            {displayEquip.slice(0, 2).map((e, i) => (
                              <span key={i} className="text-[10px] bg-gray-800 border border-gray-700 text-gray-400 px-1.5 py-0.5 rounded">{e}</span>
                            ))}
                            {displayEquip.length > 2 && <span className="text-[10px] text-gray-600">+{displayEquip.length - 2}</span>}
                          </div>
                        </td>
                        <td className={tdCls}>
                          {ex.demo_video_url ? (
                            <a href={ex.demo_video_url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 transition-colors">
                              <Video size={14} />
                            </a>
                          ) : <span className="text-gray-700">—</span>}
                        </td>
                        <td className={tdCls}>
                          <div className="flex items-center gap-2">
                            {!ex.is_global && (
                              <>
                                <button onClick={() => { setPanel(ex); setPanelOpen(true); }} className="text-gray-500 hover:text-white transition-colors"><Pencil size={13} /></button>
                                <button onClick={() => deleteExercise(ex.id)} className="text-gray-600 hover:text-red-400 transition-colors"><Trash2 size={13} /></button>
                              </>
                            )}
                            {ex.is_global && <Lock size={13} className="text-gray-700" />}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {exercises.length === 0 && (
                    <tr><td colSpan={7} className="text-center text-gray-600 font-mono text-sm py-12">No exercises yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Muscle Groups Tab ──────────────────────────────────────────── */}
        {tab === "muscles" && (
          <div className="bg-gray-900 border border-gray-700 rounded-2xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-800/60 border-b border-gray-700">
                <tr>
                  <th className={thCls}>Name</th>
                  <th className={thCls}>Body Region</th>
                  <th className={thCls}>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {muscles.map(m => (
                  <tr key={m.id} className="hover:bg-gray-800/40 transition-colors">
                    <td className={`${tdCls} font-medium text-white`}>{m.name}</td>
                    <td className={tdCls}>
                      {m.body_region ? (
                        <span className={`text-[10px] font-mono font-bold uppercase px-1.5 py-0.5 rounded border ${REGION_COLORS[m.body_region] ?? ""}`}>{m.body_region.replace("_", " ")}</span>
                      ) : <span className="text-gray-600">—</span>}
                    </td>
                    <td className={tdCls}>
                      <button onClick={() => deleteMuscle(m.id)} className="text-gray-600 hover:text-red-400 transition-colors"><Trash2 size={13} /></button>
                    </td>
                  </tr>
                ))}
                {/* Add row */}
                <tr className="bg-gray-800/30">
                  <td className="px-3 py-2">
                    <form id="add-muscle-form" onSubmit={addMuscle} />
                    <input form="add-muscle-form" value={newMuscle.name} onChange={e => setNewMuscle(p => ({ ...p, name: e.target.value }))}
                      placeholder="Muscle group name…"
                      className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-coaches-red w-full" />
                  </td>
                  <td className="px-3 py-2">
                    <select form="add-muscle-form" value={newMuscle.body_region} onChange={e => setNewMuscle(p => ({ ...p, body_region: e.target.value }))}
                      className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none w-full">
                      <option value="">— Region —</option>
                      <option value="upper">Upper</option>
                      <option value="lower">Lower</option>
                      <option value="core">Core</option>
                      <option value="full_body">Full Body</option>
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <button form="add-muscle-form" type="submit" disabled={addingMuscle || !newMuscle.name.trim()}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-coaches-red hover:bg-coaches-red-dark disabled:opacity-40 text-white text-xs font-semibold rounded-lg transition-colors">
                      {addingMuscle ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />} Add
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* ── Equipment Tab ──────────────────────────────────────────────── */}
        {tab === "equipment" && (
          <div className="bg-gray-900 border border-gray-700 rounded-2xl overflow-hidden max-w-md">
            <table className="w-full">
              <thead className="bg-gray-800/60 border-b border-gray-700">
                <tr>
                  <th className={thCls}>Name</th>
                  <th className={thCls}>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {equipment.map(eq => (
                  <tr key={eq.id} className="hover:bg-gray-800/40 transition-colors">
                    <td className={`${tdCls} font-medium text-white`}>{eq.name}</td>
                    <td className={tdCls}>
                      <button onClick={() => deleteEquipment(eq.id)} className="text-gray-600 hover:text-red-400 transition-colors"><Trash2 size={13} /></button>
                    </td>
                  </tr>
                ))}
                {/* Add row */}
                <tr className="bg-gray-800/30">
                  <td className="px-3 py-2">
                    <form id="add-equip-form" onSubmit={addEquipment} />
                    <input form="add-equip-form" value={newEquipment.name} onChange={e => setNewEquipment({ name: e.target.value })}
                      placeholder="Equipment name…"
                      className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-coaches-red w-full" />
                  </td>
                  <td className="px-3 py-2">
                    <button form="add-equip-form" type="submit" disabled={addingEquip || !newEquipment.name.trim()}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-coaches-red hover:bg-coaches-red-dark disabled:opacity-40 text-white text-xs font-semibold rounded-lg transition-colors">
                      {addingEquip ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />} Add
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Slide-in exercise panel */}
      {panelOpen && (
        <ExercisePanel
          editing={panel}
          muscles={muscles}
          equipment={equipment}
          onClose={() => setPanelOpen(false)}
          onSaved={onExerciseSaved}
        />
      )}
    </DashboardLayout>
  );
}
