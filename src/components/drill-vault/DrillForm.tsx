"use client";

import { useState, useRef } from "react";
import { X, Trash2, Plus } from "lucide-react";
import { Drill, ShotType, IntensityLevel, SessionPosition, INTENSITY_TIERS, COURT_SPACES, DRILL_LEVELS } from "@/types/drill";
import { useDrillCategories, hexToRgba } from "@/context/DrillCategoryContext";
import { useDrillObjectives } from "@/context/DrillObjectivesContext";
import { useStatImpacts } from "@/context/StatImpactsContext";

interface Props {
  initialDrill?: Drill;
  onSave: (drill: Drill) => void;
  onDelete?: (id: string) => void;
  onClose: () => void;
}

function blankForm(drill?: Drill) {
  return {
    name:             drill?.name             ?? "",
    categories:       drill?.categories       ?? [] as string[],
    shot_density:     drill?.shot_density     ?? 2,
    shot_type:        drill?.shot_type        ?? ShotType.ThreePoint,
    intensity:        (drill?.intensity       ?? 1) as IntensityLevel,
    default_duration: drill?.default_duration ?? 10,
    session_position: (drill?.session_position ?? "") as SessionPosition | "",
    coaching_notes:   drill?.coaching_notes   ?? "",
    video_url:        drill?.video_url        ?? "",
    level:            drill?.level            ?? null as number | null,
    space:            drill?.space            ?? null as number | null,
    objectives:       drill?.objectives       ?? [] as string[],
    primary_stat_id:  drill?.primary_stat_id  ?? null as string | null,
  };
}

// Inline "add new" mini-form reused for both category and objective
function InlineAddField({
  placeholder,
  saving,
  onSave,
  onCancel,
}: {
  placeholder: string;
  saving: boolean;
  onSave: (name: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState("");
  const ref = useRef<HTMLInputElement>(null);
  // Auto-focus
  useState(() => { setTimeout(() => ref.current?.focus(), 50); });
  return (
    <div className="flex items-center gap-2 mt-2">
      <input
        ref={ref}
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); if (value.trim()) onSave(value.trim()); } if (e.key === "Escape") onCancel(); }}
        className="flex-1 bg-gray-700/60 border border-gray-600 rounded-lg px-3 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-coaches-blue transition-colors"
      />
      <button type="button" disabled={!value.trim() || saving} onClick={() => { if (value.trim()) onSave(value.trim()); }}
        className="px-3 py-1.5 rounded-lg bg-coaches-blue hover:bg-coaches-blue-dark disabled:opacity-40 text-white text-xs font-semibold transition-colors">
        {saving ? "…" : "Add"}
      </button>
      <button type="button" onClick={onCancel}
        className="p-1.5 rounded-lg text-gray-500 hover:text-white transition-colors">
        <X size={14} />
      </button>
    </div>
  );
}

export default function DrillForm({ initialDrill, onSave, onDelete, onClose }: Props) {
  const { categories, addCategory, getCatColor } = useDrillCategories();
  const { objectives, addObjective, getObjColor } = useDrillObjectives();
  const { statImpacts } = useStatImpacts();
  const editing = !!initialDrill;

  const [form, setForm]         = useState(blankForm(initialDrill));
  const [saving, setSaving]     = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError]       = useState<string | null>(null);

  // Inline add state
  const [showAddCat,  setShowAddCat]  = useState(false);
  const [addingCat,   setAddingCat]   = useState(false);
  const [catAddErr,   setCatAddErr]   = useState<string | null>(null);
  const [showAddObj,  setShowAddObj]  = useState(false);
  const [addingObj,   setAddingObj]   = useState(false);
  const [objAddErr,   setObjAddErr]   = useState<string | null>(null);

  function set<K extends keyof ReturnType<typeof blankForm>>(key: K, value: ReturnType<typeof blankForm>[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const url    = editing ? `/api/drills/${initialDrill!.id}` : "/api/drills";
      const method = editing ? "PATCH" : "POST";
      const payload = { ...form, session_position: form.session_position || null, coaching_notes: form.coaching_notes || null };
      const res  = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      onSave(data);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!initialDrill || !onDelete) return;
    if (!confirm(`Delete "${initialDrill.name}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/drills/${initialDrill.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      onDelete(initialDrill.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setDeleting(false);
    }
  }

  async function handleAddCategory(name: string) {
    setAddingCat(true);
    setCatAddErr(null);
    try {
      await addCategory(name);
      set("categories", [...form.categories, name]);
      setShowAddCat(false);
    } catch (err) {
      setCatAddErr(err instanceof Error ? err.message : "Failed");
    } finally {
      setAddingCat(false);
    }
  }

  async function handleAddObjective(name: string) {
    setAddingObj(true);
    setObjAddErr(null);
    try {
      await addObjective(name);
      set("objectives", [...form.objectives, name]);
      setShowAddObj(false);
    } catch (err) {
      setObjAddErr(err instanceof Error ? err.message : "Failed");
    } finally {
      setAddingObj(false);
    }
  }

  const labelCls = "block text-xs font-mono text-gray-400 mb-1.5 uppercase tracking-wider";
  const inputCls = "w-full bg-gray-700/60 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-coaches-blue transition-colors";

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto" onClick={onClose}>
      <div className="relative w-full max-w-lg bg-gray-900 border border-gray-700 rounded-2xl p-6 shadow-2xl my-4" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-white font-semibold text-lg">{editing ? "Edit Drill" : "New Drill"}</h2>
          <div className="flex items-center gap-2">
            {editing && onDelete && (
              <button type="button" onClick={handleDelete} disabled={deleting}
                className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 border border-red-400/30 hover:border-red-400/60 px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-50">
                <Trash2 size={13} />{deleting ? "Deleting…" : "Delete"}
              </button>
            )}
            <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors"><X size={20} /></button>
          </div>
        </div>

        {error && (
          <div className="mb-4 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-mono">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">

          {/* Name */}
          <div>
            <label className={labelCls}>Name</label>
            <input required type="text" placeholder="e.g. Closeout Box" className={inputCls}
              value={form.name} onChange={(e) => set("name", e.target.value)} />
          </div>

          {/* Categories */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className={`${labelCls} mb-0`}>Categories <span className="text-gray-600 normal-case tracking-normal">(optional)</span></label>
              <button type="button" onClick={() => setShowAddCat((v) => !v)}
                className="flex items-center gap-1 text-[10px] font-mono text-gray-500 hover:text-coaches-blue transition-colors">
                <Plus size={10} /> New
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => {
                const active = form.categories.includes(c.name);
                const color  = getCatColor(c.name);
                return (
                  <button key={c.id} type="button"
                    onClick={() => set("categories", active ? form.categories.filter((x) => x !== c.name) : [...form.categories, c.name])}
                    className="px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors"
                    style={active
                      ? { color, backgroundColor: hexToRgba(color, 0.2), borderColor: hexToRgba(color, 0.5) }
                      : { color: "rgb(156 163 175)", backgroundColor: "transparent", borderColor: "rgb(75 85 99)" }}>
                    {c.name}
                  </button>
                );
              })}
            </div>
            {showAddCat && (
              <>
                <InlineAddField placeholder="e.g. Transition" saving={addingCat}
                  onSave={handleAddCategory} onCancel={() => setShowAddCat(false)} />
                {catAddErr && <p className="text-red-400 text-xs font-mono mt-1">{catAddErr}</p>}
              </>
            )}
          </div>

          {/* Intensity */}
          <div>
            <label className={labelCls}>Intensity</label>
            <div className="flex gap-2">
              {([1, 2, 3] as IntensityLevel[]).map((n) => (
                <button key={n} type="button" onClick={() => set("intensity", n)}
                  className={`flex-1 py-2.5 rounded-lg text-xs font-semibold border transition-colors flex flex-col items-center gap-1 ${
                    form.intensity === n
                      ? "bg-coaches-blue border-coaches-blue text-white"
                      : "bg-gray-700/60 border-gray-600 text-gray-400 hover:border-gray-400"
                  }`}>
                  <div className="flex gap-1">
                    {[1, 2, 3].map((pip) => (
                      <span key={pip} className={`w-2 h-2 rounded-full ${pip <= n ? "bg-current" : "bg-gray-600"}`} />
                    ))}
                  </div>
                  <span>{INTENSITY_TIERS[n]}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Default Duration + Session Position */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Default Min</label>
              <input required type="number" min={1} max={120} step={1} className={inputCls}
                value={form.default_duration} onChange={(e) => set("default_duration", parseInt(e.target.value, 10) || 1)} />
            </div>
            <div>
              <label className={labelCls}>Position <span className="text-gray-600 normal-case tracking-normal">(opt)</span></label>
              <select className={inputCls} value={form.session_position}
                onChange={(e) => set("session_position", e.target.value as SessionPosition | "")}>
                <option value="">— Any —</option>
                <option value="warmup">Warmup</option>
                <option value="main">Main Block</option>
                <option value="finishing">Finishing</option>
              </select>
            </div>
          </div>

          {/* Shot Density + Shot Type */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Shot Density (shots/min)</label>
              <input required type="number" min={0} max={20} step={0.1} className={inputCls}
                value={form.shot_density} onChange={(e) => set("shot_density", parseFloat(e.target.value) || 0)} />
            </div>
            <div>
              <label className={labelCls}>Shot Type</label>
              <select className={inputCls} value={form.shot_type}
                onChange={(e) => set("shot_type", e.target.value as ShotType)}>
                {Object.values(ShotType).map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {/* Objectives */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className={`${labelCls} mb-0`}>Objectives <span className="text-gray-600 normal-case tracking-normal">(optional)</span></label>
              <button type="button" onClick={() => setShowAddObj((v) => !v)}
                className="flex items-center gap-1 text-[10px] font-mono text-gray-500 hover:text-coaches-blue transition-colors">
                <Plus size={10} /> New
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {objectives.map((o) => {
                const active = form.objectives.includes(o.name);
                const color  = getObjColor(o.name);
                return (
                  <button key={o.id} type="button"
                    onClick={() => set("objectives", active ? form.objectives.filter((x) => x !== o.name) : [...form.objectives, o.name])}
                    className="px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors"
                    style={active
                      ? { color, backgroundColor: hexToRgba(color, 0.2), borderColor: hexToRgba(color, 0.5) }
                      : { color: "rgb(156 163 175)", backgroundColor: "transparent", borderColor: "rgb(75 85 99)" }}>
                    {o.name}
                  </button>
                );
              })}
            </div>
            {showAddObj && (
              <>
                <InlineAddField placeholder="e.g. Communication" saving={addingObj}
                  onSave={handleAddObjective} onCancel={() => setShowAddObj(false)} />
                {objAddErr && <p className="text-red-400 text-xs font-mono mt-1">{objAddErr}</p>}
              </>
            )}
          </div>

          {/* Drill Level */}
          <div>
            <label className={labelCls}>Drill Level <span className="text-gray-600 normal-case tracking-normal">(optional)</span></label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" onClick={() => set("level", form.level === n ? null : n)}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-colors ${
                    form.level === n ? "bg-coaches-blue border-coaches-blue text-white" : "bg-gray-700/60 border-gray-600 text-gray-400 hover:border-gray-400"
                  }`} title={DRILL_LEVELS[n]}>
                  L{n}
                </button>
              ))}
            </div>
            <p className="text-gray-600 text-[10px] font-mono mt-1">
              {form.level ? `L${form.level} · ${DRILL_LEVELS[form.level]}` : "Click to assign · click again to clear"}
            </p>
          </div>

          {/* Space */}
          <div>
            <label className={labelCls}>Space <span className="text-gray-600 normal-case tracking-normal">(optional)</span></label>
            <div className="flex gap-2 flex-wrap">
              {COURT_SPACES.map(({ label, units }) => (
                <button key={label} type="button" onClick={() => set("space", form.space === units ? null : units)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                    form.space === units ? "bg-coaches-blue border-coaches-blue text-white" : "bg-gray-700/60 border-gray-600 text-gray-400 hover:border-gray-400"
                  }`}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Coaching Notes */}
          <div>
            <label className={labelCls}>Coaching Notes</label>
            <textarea rows={3} placeholder="What does this drill develop? When should it be used?" className={`${inputCls} resize-none leading-relaxed`}
              value={form.coaching_notes} onChange={(e) => set("coaching_notes", e.target.value)} />
          </div>

          {/* Video URL */}
          <div>
            <label className={labelCls}>Video URL (optional)</label>
            <input type="url" placeholder="https://..." className={inputCls}
              value={form.video_url} onChange={(e) => set("video_url", e.target.value)} />
          </div>

          {/* Stat Impact */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-mono text-gray-500 uppercase tracking-wider">Primary Stat Impact</p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, primary_stat_id: null }))}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors ${
                  !form.primary_stat_id ? "bg-gray-600 border-gray-500 text-white" : "border-gray-700 text-gray-500 hover:text-gray-300"
                }`}
              >
                None
              </button>
              {statImpacts.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, primary_stat_id: s.id }))}
                  style={form.primary_stat_id === s.id ? { backgroundColor: s.color + "33", borderColor: s.color + "66", color: s.color } : undefined}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors ${
                    form.primary_stat_id === s.id ? "" : "border-gray-700 text-gray-500 hover:text-gray-300"
                  }`}
                >
                  {s.name}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-lg border border-gray-600 text-gray-400 text-sm hover:bg-gray-800 transition-colors">Cancel</button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 rounded-lg bg-coaches-blue hover:bg-coaches-blue-dark disabled:opacity-50 text-white text-sm font-semibold transition-colors">
              {saving ? "Saving…" : editing ? "Save Changes" : "Save Drill"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
