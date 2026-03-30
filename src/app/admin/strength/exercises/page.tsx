"use client";
import { useState, useEffect, useMemo } from "react";
import { Plus, Pencil, Check, X, Loader2, Globe, AlertTriangle, Search } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import type { StrengthExercise, ExerciseCategory } from "@/types/strength";

const CATEGORY_COLORS: Record<ExerciseCategory, string> = {
  compound:    "bg-blue-500/15 text-blue-400 border-blue-500/20",
  olympic:     "bg-yellow-500/15 text-yellow-400 border-yellow-500/20",
  isolation:   "bg-purple-500/15 text-purple-400 border-purple-500/20",
  core:        "bg-orange-500/15 text-orange-400 border-orange-500/20",
  conditioning:"bg-red-500/15 text-red-400 border-red-500/20",
  mobility:    "bg-green-500/15 text-green-400 border-green-500/20",
};

export default function ExercisesPage() {
  const [exercises, setExercises] = useState<StrengthExercise[]>([]);
  const [loading, setLoad]    = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [search, setSearch]   = useState("");
  const [catFilter, setCat]   = useState<string>("all");
  const [editing, setEditing] = useState<string | null>(null);
  const [editDraft, setDraft] = useState<Partial<StrengthExercise>>({});
  const [adding, setAdding]   = useState(false);
  const [newEx, setNew]       = useState<Partial<StrengthExercise>>({ category: "compound", primary_muscles: [], secondary_muscles: [], equipment_keys: [] });

  useEffect(() => {
    fetch("/api/strength/exercises").then(r => r.json())
      .then(d => setExercises(Array.isArray(d) ? d : []))
      .catch(e => setError(e.message)).finally(() => setLoad(false));
  }, []);

  const filtered = useMemo(() => exercises.filter(e => {
    if (catFilter !== "all" && e.category !== catFilter) return false;
    if (search && !e.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [exercises, catFilter, search]);

  async function saveEdit(id: string) {
    const res = await fetch(`/api/strength/exercises/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editDraft),
    });
    if (!res.ok) { const d = await res.json(); setError(d.error); return; }
    const updated = await res.json();
    setExercises(prev => prev.map(e => e.id === id ? updated : e));
    setEditing(null);
  }

  async function deleteExercise(id: string, name: string) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    const res = await fetch(`/api/strength/exercises/${id}`, { method: "DELETE" });
    if (!res.ok) { const d = await res.json(); setError(d.error); return; }
    setExercises(prev => prev.filter(e => e.id !== id));
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newEx.name?.trim()) return;
    setAdding(true);
    try {
      const res = await fetch("/api/strength/exercises", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newEx),
      });
      if (!res.ok) { const d = await res.json(); setError(d.error); return; }
      const created = await res.json();
      setExercises(prev => [...prev, created]);
      setNew({ category: "compound", primary_muscles: [], secondary_muscles: [], equipment_keys: [] });
    } finally { setAdding(false); }
  }

  const categories = [...new Set(exercises.map(e => e.category))] as ExerciseCategory[];

  return (
    <DashboardLayout>
      <div className="max-w-5xl">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-white text-2xl font-bold tracking-tight">Exercise Library</h1>
            <p className="text-gray-400 text-sm font-mono">{exercises.length} EXERCISES ({exercises.filter(e => !e.is_global).length} CUSTOM)</p>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 mb-4 text-xs text-red-400 font-mono bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
            <AlertTriangle size={13} className="shrink-0" />
            <span className="flex-1">{error}</span>
            <button type="button" onClick={() => setError(null)}><X size={13} /></button>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-4">
          <div className="relative flex-1 min-w-48">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search exercises…"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-8 pr-3 py-2 text-sm text-white focus:outline-none focus:border-coaches-red" />
          </div>
          <div className="flex gap-1 flex-wrap">
            {["all", ...categories].map(c => (
              <button key={c} type="button" onClick={() => setCat(c)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${catFilter === c ? "bg-coaches-blue text-white" : "bg-gray-800 border border-gray-700 text-gray-400 hover:text-white"}`}>
                {c === "all" ? "All" : c}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 size={24} className="animate-spin text-coaches-red" /></div>
        ) : (
          <div className="bg-gray-800 border border-gray-700 rounded-2xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700/50">
                  {["Exercise", "Category", "Primary Muscles", "Video", ""].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-mono text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(ex => (
                  <tr key={ex.id} className="border-b border-gray-700/40 last:border-0 hover:bg-gray-700/20">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {ex.is_global && <span title="Global exercise"><Globe size={11} className="text-gray-600 shrink-0" /></span>}
                        {editing === ex.id
                          ? <input value={editDraft.name ?? ex.name} onChange={e => setDraft(d => ({...d, name: e.target.value}))}
                              autoFocus className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-white focus:outline-none w-48" />
                          : <span className="text-white text-sm">{ex.name}</span>
                        }
                        {ex.is_primary_lift && (
                          <span className="text-[9px] font-mono text-amber-400 bg-amber-400/10 border border-amber-400/20 px-1 rounded">PRIMARY</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded border ${CATEGORY_COLORS[ex.category] ?? ""}`}>
                        {ex.category}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {ex.primary_muscles.slice(0, 2).map(m => (
                          <span key={m} className="text-[9px] font-mono bg-gray-700 text-gray-300 px-1.5 py-0.5 rounded">{m}</span>
                        ))}
                        {ex.primary_muscles.length > 2 && (
                          <span className="text-[9px] font-mono text-gray-500">+{ex.primary_muscles.length - 2}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {editing === ex.id
                        ? <input value={editDraft.demo_video_url ?? ex.demo_video_url ?? ""}
                            onChange={e => setDraft(d => ({...d, demo_video_url: e.target.value || null}))}
                            placeholder="https://…"
                            className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-xs text-white focus:outline-none w-40" />
                        : ex.demo_video_url
                          ? <a href={ex.demo_video_url} target="_blank" rel="noreferrer" className="text-coaches-blue text-xs hover:underline">View</a>
                          : <span className="text-gray-600 text-xs">—</span>
                      }
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        {editing === ex.id ? (
                          <>
                            <button type="button" onClick={() => saveEdit(ex.id)} className="p-1.5 rounded-lg text-green-400 hover:bg-green-400/10"><Check size={13} /></button>
                            <button type="button" onClick={() => setEditing(null)} className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-700"><X size={13} /></button>
                          </>
                        ) : (
                          <>
                            <button type="button" onClick={() => { setEditing(ex.id); setDraft({ name: ex.name, demo_video_url: ex.demo_video_url }); }}
                              className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-gray-700">
                              <Pencil size={13} />
                            </button>
                            {!ex.is_global && (
                              <button type="button" onClick={() => deleteExercise(ex.id, ex.name)}
                                className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-400/10">
                                <X size={13} />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={5} className="text-center text-gray-500 font-mono text-xs py-12">No exercises match your filter</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Add custom exercise */}
        <form onSubmit={handleAdd} className="mt-4 bg-gray-800 border border-gray-700 rounded-2xl p-4 flex flex-wrap gap-3 items-end">
          <div className="flex flex-col gap-1 flex-1 min-w-40">
            <label className="text-[10px] font-mono text-gray-500 uppercase">Exercise Name</label>
            <input value={newEx.name ?? ""} onChange={e => setNew(n => ({...n, name: e.target.value}))} placeholder="e.g. Trap Bar Squat"
              className="bg-gray-700/60 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-coaches-red" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-mono text-gray-500 uppercase">Category</label>
            <select value={newEx.category ?? "compound"} onChange={e => setNew(n => ({...n, category: e.target.value as ExerciseCategory}))}
              className="bg-gray-700/60 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none">
              {(["compound","olympic","isolation","core","conditioning","mobility"] as ExerciseCategory[]).map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1 flex-1 min-w-40">
            <label className="text-[10px] font-mono text-gray-500 uppercase">Primary Muscles (comma-separated)</label>
            <input value={Array.isArray(newEx.primary_muscles) ? newEx.primary_muscles.join(", ") : ""}
              onChange={e => setNew(n => ({...n, primary_muscles: e.target.value.split(",").map(s => s.trim()).filter(Boolean)}))}
              placeholder="e.g. Quadriceps, Glutes"
              className="bg-gray-700/60 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-coaches-red" />
          </div>
          <button type="submit" disabled={!newEx.name?.trim() || adding}
            className="flex items-center gap-2 bg-coaches-red hover:bg-coaches-red-dark disabled:opacity-40 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
            <Plus size={14} /> {adding ? "Adding…" : "Add Custom"}
          </button>
        </form>
      </div>
    </DashboardLayout>
  );
}
