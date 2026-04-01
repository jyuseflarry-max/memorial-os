"use client";
import { useState, useEffect, useMemo } from "react";
import { Plus, Pencil, Check, X, Loader2, Globe, AlertTriangle, Search, Trash2 } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import type { StrengthExercise, ExerciseCategory } from "@/types/strength";

const CATEGORIES: ExerciseCategory[] = ["compound","olympic","isolation","core","conditioning","mobility"];

const CATEGORY_COLORS: Record<ExerciseCategory, string> = {
  compound:     "bg-blue-500/15 text-blue-400 border-blue-500/20",
  olympic:      "bg-yellow-500/15 text-yellow-400 border-yellow-500/20",
  isolation:    "bg-purple-500/15 text-purple-400 border-purple-500/20",
  core:         "bg-orange-500/15 text-orange-400 border-orange-500/20",
  conditioning: "bg-red-500/15 text-red-400 border-red-500/20",
  mobility:     "bg-green-500/15 text-green-400 border-green-500/20",
};

type EditDraft = {
  name: string;
  category: ExerciseCategory;
  primary_muscles: string;
  demo_video_url: string;
  is_primary_lift: boolean;
};

function draftFrom(ex: StrengthExercise): EditDraft {
  return {
    name:            ex.name,
    category:        ex.category,
    primary_muscles: ex.primary_muscles.join(", "),
    demo_video_url:  ex.demo_video_url ?? "",
    is_primary_lift: ex.is_primary_lift,
  };
}

export default function ExercisesAdminPage() {
  const [exercises, setExercises] = useState<StrengthExercise[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);
  const [search,    setSearch]    = useState("");
  const [catFilter, setCat]       = useState<string>("all");

  // Inline edit
  const [editing,   setEditing]   = useState<string | null>(null);
  const [draft,     setDraft]     = useState<EditDraft | null>(null);
  const [saving,    setSaving]    = useState(false);

  // Bulk select
  const [selected,  setSelected]  = useState<Set<string>>(new Set());
  const [deleting,  setDeleting]  = useState(false);

  // Add form
  const [newEx,     setNewEx]     = useState<Partial<StrengthExercise>>({ category: "compound", primary_muscles: [], secondary_muscles: [], equipment_keys: [] });
  const [adding,    setAdding]    = useState(false);

  useEffect(() => {
    fetch("/api/strength/exercises").then(r => r.json())
      .then(d => setExercises(Array.isArray(d) ? d : []))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    return exercises
      .filter(e => {
        if (catFilter !== "all" && e.category !== catFilter) return false;
        if (search && !e.name.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [exercises, catFilter, search]);

  // Only non-global exercises can be deleted
  const deletableSelected = [...selected].filter(id => {
    const ex = exercises.find(e => e.id === id);
    return ex && !ex.is_global;
  });

  // ── Inline edit ──────────────────────────────────────────────────────────

  function startEdit(ex: StrengthExercise) {
    setEditing(ex.id);
    setDraft(draftFrom(ex));
  }

  async function saveEdit(ex: StrengthExercise) {
    if (!draft) return;
    setSaving(true);
    try {
      const payload = {
        name:            draft.name.trim(),
        category:        draft.category,
        primary_muscles: draft.primary_muscles.split(",").map(s => s.trim()).filter(Boolean),
        demo_video_url:  draft.demo_video_url.trim() || null,
        is_primary_lift: draft.is_primary_lift,
      };
      const res = await fetch(`/api/strength/exercises/${ex.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) { const d = await res.json(); setError(d.error ?? "Save failed"); return; }
      const updated = await res.json() as StrengthExercise;
      setExercises(prev => {
        // If editing a global exercise, the API creates a copy — replace global with copy
        if (ex.is_global) return prev.map(e => e.id === ex.id ? updated : e);
        return prev.map(e => e.id === updated.id ? updated : e);
      });
      setEditing(null);
      setDraft(null);
    } finally { setSaving(false); }
  }

  function cancelEdit() { setEditing(null); setDraft(null); }

  // ── Single delete ─────────────────────────────────────────────────────────

  async function deleteSingle(id: string, name: string) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    const res = await fetch(`/api/strength/exercises/${id}`, { method: "DELETE" });
    if (!res.ok) { const d = await res.json(); setError(d.error ?? "Delete failed"); return; }
    setExercises(prev => prev.filter(e => e.id !== id));
    setSelected(prev => { const n = new Set(prev); n.delete(id); return n; });
  }

  // ── Bulk delete ───────────────────────────────────────────────────────────

  async function bulkDelete() {
    if (deletableSelected.length === 0) return;
    if (!confirm(`Delete ${deletableSelected.length} exercise${deletableSelected.length > 1 ? "s" : ""}? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      const results = await Promise.all(
        deletableSelected.map(id => fetch(`/api/strength/exercises/${id}`, { method: "DELETE" }))
      );
      const deletedIds = new Set(
        deletableSelected.filter((_, i) => results[i].ok || results[i].status === 204)
      );
      setExercises(prev => prev.filter(e => !deletedIds.has(e.id)));
      setSelected(new Set());
    } finally { setDeleting(false); }
  }

  // ── Select helpers ────────────────────────────────────────────────────────

  function toggleOne(id: string) {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  function toggleAll() {
    const deletableIds = filtered.filter(e => !e.is_global).map(e => e.id);
    const allSelected  = deletableIds.every(id => selected.has(id));
    if (allSelected) setSelected(prev => { const n = new Set(prev); deletableIds.forEach(id => n.delete(id)); return n; });
    else             setSelected(prev => { const n = new Set(prev); deletableIds.forEach(id => n.add(id)); return n; });
  }

  // ── Add exercise ──────────────────────────────────────────────────────────

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newEx.name?.trim()) return;
    setAdding(true);
    try {
      const res = await fetch("/api/strength/exercises", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newEx),
      });
      if (!res.ok) { const d = await res.json(); setError(d.error ?? "Add failed"); return; }
      const created = await res.json() as StrengthExercise;
      setExercises(prev => [created, ...prev]);
      setNewEx({ category: "compound", primary_muscles: [], secondary_muscles: [], equipment_keys: [] });
    } finally { setAdding(false); }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const inCls  = "bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-coaches-red w-full";
  const thCls  = "px-3 py-3 text-left text-[10px] font-mono text-gray-500 uppercase tracking-wider";
  const tdCls  = "px-3 py-2.5 align-middle";

  const allDeletableInView   = filtered.filter(e => !e.is_global).map(e => e.id);
  const allViewSelected      = allDeletableInView.length > 0 && allDeletableInView.every(id => selected.has(id));
  const someViewSelected     = allDeletableInView.some(id => selected.has(id));

  return (
    <DashboardLayout>
      <div className="max-w-6xl">

        {/* Header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-white text-2xl font-bold tracking-tight">Exercise Library</h1>
            <p className="text-gray-400 text-xs font-mono mt-0.5">
              {exercises.length} TOTAL · {exercises.filter(e => !e.is_global).length} CUSTOM · {exercises.filter(e => e.is_global).length} GLOBAL
            </p>
          </div>
          {deletableSelected.length > 0 && (
            <button
              onClick={bulkDelete} disabled={deleting}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-sm font-semibold transition-colors">
              {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
              Delete {deletableSelected.length} selected
            </button>
          )}
        </div>

        {/* Error banner */}
        {error && (
          <div className="flex items-center gap-2 mb-4 text-xs text-red-400 font-mono bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
            <AlertTriangle size={13} className="shrink-0" />
            <span className="flex-1">{error}</span>
            <button onClick={() => setError(null)}><X size={13} /></button>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-4">
          <div className="relative flex-1 min-w-48">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search exercises…"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-8 pr-3 py-2 text-sm text-white focus:outline-none focus:border-coaches-red"
            />
          </div>
          <div className="flex gap-1 flex-wrap">
            {["all", ...CATEGORIES].map(c => (
              <button key={c} onClick={() => setCat(c)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${catFilter === c ? "bg-coaches-red text-white" : "bg-gray-800 border border-gray-700 text-gray-400 hover:text-white"}`}>
                {c === "all" ? "All" : c.charAt(0).toUpperCase() + c.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 size={24} className="animate-spin text-coaches-red" /></div>
        ) : (
          <div className="bg-gray-900 border border-gray-700 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-800/60 border-b border-gray-700">
                  <tr>
                    <th className="px-3 py-3 w-8">
                      <input
                        type="checkbox"
                        checked={allViewSelected}
                        ref={el => { if (el) el.indeterminate = someViewSelected && !allViewSelected; }}
                        onChange={toggleAll}
                        className="accent-coaches-red cursor-pointer"
                      />
                    </th>
                    <th className={thCls}>Exercise</th>
                    <th className={thCls}>Category</th>
                    <th className={thCls}>Primary Muscles</th>
                    <th className={thCls}>Video URL</th>
                    <th className={thCls}>Primary Lift</th>
                    <th className={thCls + " text-right"}>Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {filtered.map(ex => {
                    const isEditing = editing === ex.id;
                    return (
                      <tr key={ex.id} className={`transition-colors ${selected.has(ex.id) ? "bg-coaches-red/5" : "hover:bg-gray-800/40"}`}>

                        {/* Checkbox */}
                        <td className={tdCls + " w-8"}>
                          {!ex.is_global && (
                            <input
                              type="checkbox"
                              checked={selected.has(ex.id)}
                              onChange={() => toggleOne(ex.id)}
                              className="accent-coaches-red cursor-pointer"
                            />
                          )}
                        </td>

                        {/* Name */}
                        <td className={tdCls}>
                          <div className="flex items-center gap-2 min-w-[160px]">
                            {ex.is_global && <Globe size={11} className="text-gray-600 shrink-0" aria-label="Global" />}
                            {isEditing
                              ? <input autoFocus value={draft!.name} onChange={e => setDraft(d => d ? {...d, name: e.target.value} : d)} className={inCls + " w-44"} />
                              : <span className="text-white text-sm">{ex.name}</span>
                            }
                          </div>
                        </td>

                        {/* Category */}
                        <td className={tdCls}>
                          {isEditing
                            ? <select value={draft!.category} onChange={e => setDraft(d => d ? {...d, category: e.target.value as ExerciseCategory} : d)}
                                className={inCls + " w-36"}>
                                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                              </select>
                            : <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded border ${CATEGORY_COLORS[ex.category] ?? ""}`}>{ex.category}</span>
                          }
                        </td>

                        {/* Primary Muscles */}
                        <td className={tdCls}>
                          {isEditing
                            ? <input value={draft!.primary_muscles}
                                onChange={e => setDraft(d => d ? {...d, primary_muscles: e.target.value} : d)}
                                placeholder="Quads, Glutes…"
                                className={inCls + " w-44"} />
                            : <div className="flex flex-wrap gap-1">
                                {ex.primary_muscles.slice(0, 2).map(m => (
                                  <span key={m} className="text-[9px] font-mono bg-gray-800 border border-gray-700 text-gray-400 px-1.5 py-0.5 rounded">{m}</span>
                                ))}
                                {ex.primary_muscles.length > 2 && <span className="text-[9px] text-gray-600">+{ex.primary_muscles.length - 2}</span>}
                                {ex.primary_muscles.length === 0 && <span className="text-gray-700 text-xs">—</span>}
                              </div>
                          }
                        </td>

                        {/* Video URL */}
                        <td className={tdCls}>
                          {isEditing
                            ? <input value={draft!.demo_video_url}
                                onChange={e => setDraft(d => d ? {...d, demo_video_url: e.target.value} : d)}
                                placeholder="https://youtube.com/…"
                                className={inCls + " w-52"} />
                            : ex.demo_video_url
                              ? <a href={ex.demo_video_url} target="_blank" rel="noreferrer" className="text-blue-400 text-xs hover:underline truncate max-w-[180px] block">Link</a>
                              : <span className="text-gray-700 text-xs">—</span>
                          }
                        </td>

                        {/* Primary Lift toggle */}
                        <td className={tdCls}>
                          {isEditing
                            ? <button type="button" onClick={() => setDraft(d => d ? {...d, is_primary_lift: !d.is_primary_lift} : d)}
                                className={`w-9 h-5 rounded-full transition-colors relative shrink-0 ${draft!.is_primary_lift ? "bg-coaches-red" : "bg-gray-700"}`}>
                                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${draft!.is_primary_lift ? "translate-x-4" : "translate-x-0.5"}`} />
                              </button>
                            : ex.is_primary_lift
                              ? <span className="text-[9px] font-mono text-amber-400 bg-amber-400/10 border border-amber-400/20 px-1.5 py-0.5 rounded">YES</span>
                              : <span className="text-gray-700 text-xs">—</span>
                          }
                        </td>

                        {/* Actions */}
                        <td className={tdCls}>
                          <div className="flex items-center gap-1 justify-end">
                            {isEditing ? (
                              <>
                                <button onClick={() => saveEdit(ex)} disabled={saving}
                                  className="p-1.5 rounded-lg text-green-400 hover:bg-green-400/10 disabled:opacity-40">
                                  {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                                </button>
                                <button onClick={cancelEdit} className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-700"><X size={13} /></button>
                              </>
                            ) : (
                              <>
                                <button onClick={() => startEdit(ex)} className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-gray-700"><Pencil size={13} /></button>
                                {!ex.is_global && (
                                  <button onClick={() => deleteSingle(ex.id, ex.name)} className="p-1.5 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-400/10"><Trash2 size={13} /></button>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filtered.length === 0 && (
                    <tr><td colSpan={7} className="text-center text-gray-600 font-mono text-sm py-12">No exercises match your filter.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Add exercise */}
        <form onSubmit={handleAdd} className="mt-4 bg-gray-900 border border-gray-700 rounded-2xl p-4 flex flex-wrap gap-3 items-end">
          <div className="flex flex-col gap-1 flex-1 min-w-40">
            <label className="text-[10px] font-mono text-gray-500 uppercase">Exercise Name *</label>
            <input
              value={newEx.name ?? ""} onChange={e => setNewEx(n => ({...n, name: e.target.value}))}
              placeholder="e.g. Trap Bar Squat"
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-coaches-red"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-mono text-gray-500 uppercase">Category</label>
            <select value={newEx.category ?? "compound"} onChange={e => setNewEx(n => ({...n, category: e.target.value as ExerciseCategory}))}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none">
              {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1 flex-1 min-w-36">
            <label className="text-[10px] font-mono text-gray-500 uppercase">Primary Muscles</label>
            <input
              value={Array.isArray(newEx.primary_muscles) ? newEx.primary_muscles.join(", ") : ""}
              onChange={e => setNewEx(n => ({...n, primary_muscles: e.target.value.split(",").map(s => s.trim()).filter(Boolean)}))}
              placeholder="Quadriceps, Glutes…"
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-coaches-red"
            />
          </div>
          <button type="submit" disabled={!newEx.name?.trim() || adding}
            className="flex items-center gap-2 bg-coaches-red hover:bg-coaches-red-dark disabled:opacity-40 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
            <Plus size={14} /> {adding ? "Adding…" : "Add Exercise"}
          </button>
        </form>

      </div>
    </DashboardLayout>
  );
}
