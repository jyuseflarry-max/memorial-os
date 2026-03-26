"use client";

import { useState } from "react";
import { X, Trash2 } from "lucide-react";
import { Drill, ShotType, IntensityLevel, SessionPosition, INTENSITY_TIERS, DRILL_OBJECTIVES, COURT_SPACES, DRILL_LEVELS } from "@/types/drill";
import { useDrillCategories } from "@/context/DrillCategoryContext";

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
    objectives:       drill?.objectives        ?? [] as string[],
  };
}

export default function DrillForm({ initialDrill, onSave, onDelete, onClose }: Props) {
  const { categories } = useDrillCategories();
  const editing = !!initialDrill;
  const [form, setForm]         = useState(blankForm(initialDrill));
  const [saving, setSaving]     = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError]       = useState<string | null>(null);

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
      const payload = {
        ...form,
        session_position: form.session_position || null,
        coaching_notes:   form.coaching_notes   || null,
        objectives:       form.objectives,
      };
      const res  = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
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

  const labelCls = "block text-xs font-mono text-gray-400 mb-1 uppercase tracking-wider";
  const inputCls = "w-full bg-gray-700/60 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-coaches-blue transition-colors";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg bg-gray-900 border border-gray-700 rounded-2xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-white font-semibold text-lg">{editing ? "Edit Drill" : "New Drill"}</h2>
          <div className="flex items-center gap-2">
            {editing && onDelete && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 border border-red-400/30 hover:border-red-400/60 px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-50"
              >
                <Trash2 size={13} />
                {deleting ? "Deleting…" : "Delete"}
              </button>
            )}
            <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
              <X size={20} />
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-mono">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Name */}
          <div>
            <label className={labelCls}>Name</label>
            <input
              required
              type="text"
              placeholder="e.g. Closeout Box"
              className={inputCls}
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
            />
          </div>

          {/* Categories */}
          <div>
            <label className={labelCls}>
              Categories{" "}
              <span className="text-gray-600 normal-case tracking-normal">(optional)</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => {
                const active = form.categories.includes(c.name);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => set("categories", active ? form.categories.filter((x) => x !== c.name) : [...form.categories, c.name])}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                      active
                        ? "bg-coaches-blue/20 border-coaches-blue/50 text-coaches-blue"
                        : "bg-gray-700/60 border-gray-600 text-gray-400 hover:border-gray-400"
                    }`}
                  >
                    {c.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Default Duration + Session Position */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Default Min</label>
              <input
                required
                type="number"
                min={1}
                max={120}
                step={1}
                className={inputCls}
                value={form.default_duration}
                onChange={(e) => set("default_duration", parseInt(e.target.value, 10) || 1)}
              />
            </div>
            <div>
              <label className={labelCls}>
                Practice Position{" "}
                <span className="text-gray-600 normal-case tracking-normal">(optional)</span>
              </label>
              <select
                className={inputCls}
                value={form.session_position}
                onChange={(e) => set("session_position", e.target.value as SessionPosition | "")}
              >
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
              <input
                required
                type="number"
                min={0}
                max={20}
                step={0.1}
                className={inputCls}
                value={form.shot_density}
                onChange={(e) => set("shot_density", parseFloat(e.target.value) || 0)}
              />
            </div>
            <div>
              <label className={labelCls}>Shot Type</label>
              <select
                className={inputCls}
                value={form.shot_type}
                onChange={(e) => set("shot_type", e.target.value as ShotType)}
              >
                {Object.values(ShotType).map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Intensity */}
          <div>
            <label className={labelCls}>Intensity</label>
            <div className="flex gap-2">
              {([1, 2, 3] as IntensityLevel[]).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => set("intensity", n)}
                  className={`flex-1 py-2.5 rounded-lg text-xs font-semibold border transition-colors flex flex-col items-center gap-0.5 ${
                    form.intensity === n
                      ? "bg-coaches-blue border-coaches-blue text-white"
                      : "bg-gray-700/60 border-gray-600 text-gray-400 hover:border-gray-400"
                  }`}
                >
                  <div className="flex gap-1">
                    {[1, 2, 3].map((pip) => (
                      <span key={pip} className={`w-2 h-2 rounded-full ${pip <= n ? "bg-current" : "bg-gray-600"}`} />
                    ))}
                  </div>
                  <span>{n} · {INTENSITY_TIERS[n]}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Objectives */}
          <div>
            <label className={labelCls}>
              Objectives{" "}
              <span className="text-gray-600 normal-case tracking-normal">(optional)</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {DRILL_OBJECTIVES.map((o) => {
                const active = form.objectives.includes(o);
                return (
                  <button
                    key={o}
                    type="button"
                    onClick={() => set("objectives", active ? form.objectives.filter((x) => x !== o) : [...form.objectives, o])}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                      active
                        ? "bg-purple-500/20 border-purple-400/50 text-purple-300"
                        : "bg-gray-700/60 border-gray-600 text-gray-400 hover:border-gray-400"
                    }`}
                  >
                    {o}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Drill Level */}
          <div>
            <label className={labelCls}>
              Drill Level{" "}
              <span className="text-gray-600 normal-case tracking-normal">(optional)</span>
            </label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => set("level", form.level === n ? null : n)}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-colors ${
                    form.level === n
                      ? "bg-coaches-blue border-coaches-blue text-white"
                      : "bg-gray-700/60 border-gray-600 text-gray-400 hover:border-gray-400"
                  }`}
                  title={DRILL_LEVELS[n]}
                >
                  L{n}
                </button>
              ))}
            </div>
            <p className="text-gray-600 text-[10px] font-mono mt-1">
              {form.level ? `L${form.level} · ${DRILL_LEVELS[form.level]}` : "Click a level to assign · click again to clear"}
            </p>
          </div>

          {/* Space */}
          <div>
            <label className={labelCls}>
              Space{" "}
              <span className="text-gray-600 normal-case tracking-normal">(optional)</span>
            </label>
            <div className="flex gap-2 flex-wrap">
              {COURT_SPACES.map(({ label, units }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => set("space", form.space === units ? null : units)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                    form.space === units
                      ? "bg-coaches-blue border-coaches-blue text-white"
                      : "bg-gray-700/60 border-gray-600 text-gray-400 hover:border-gray-400"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Coaching Notes */}
          <div>
            <label className={labelCls}>
              Coaching Notes
            </label>
            <textarea
              rows={3}
              placeholder="What does this drill develop? When should it be used? e.g. 'Teaches controlled closeouts with hands up. Best used early in a defensive block to establish footwork before adding live ball.'"
              className={`${inputCls} resize-none leading-relaxed`}
              value={form.coaching_notes}
              onChange={(e) => set("coaching_notes", e.target.value)}
            />
          </div>

          {/* Video URL */}
          <div>
            <label className={labelCls}>Video URL (optional)</label>
            <input
              type="url"
              placeholder="https://..."
              className={inputCls}
              value={form.video_url}
              onChange={(e) => set("video_url", e.target.value)}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-lg border border-gray-600 text-gray-400 text-sm hover:bg-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 rounded-lg bg-coaches-blue hover:bg-coaches-blue-dark disabled:opacity-50 text-white text-sm font-semibold transition-colors"
            >
              {saving ? "Saving…" : editing ? "Save Changes" : "Save Drill"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
