"use client";

import { useState } from "react";
import { X, Trash2 } from "lucide-react";
import { Drill, ShotType, IntensityLevel } from "@/types/drill";

interface Props {
  initialDrill?: Drill;    // present → edit mode
  categories: string[];    // all known categories for datalist suggestions
  subCategories: string[]; // all known sub-categories for datalist suggestions
  onSave: (drill: Drill) => void;
  onDelete?: (id: string) => void;
  onClose: () => void;
}

function blankForm(drill?: Drill) {
  return {
    name:         drill?.name         ?? "",
    category:     drill?.category     ?? "Offense",
    sub_category: drill?.sub_category ?? "",
    shot_density: drill?.shot_density ?? 2,
    shot_type:    drill?.shot_type    ?? ShotType.ThreePoint,
    intensity:    (drill?.intensity   ?? 3) as IntensityLevel,
    video_url:    drill?.video_url    ?? "",
  };
}

export default function DrillForm({ initialDrill, categories, subCategories, onSave, onDelete, onClose }: Props) {
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
      const res    = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
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
  const inputCls = "w-full bg-gray-700/60 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-mustang-red transition-colors";

  // Deduplicated suggestions: known categories + anything not already in the list
  const suggestions = Array.from(new Set([
    "Offense", "Defense", "Transition", "Special Teams", "Rest/Transition",
    ...categories,
  ])).sort();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg bg-gray-900 border border-gray-700 rounded-2xl p-6 shadow-2xl"
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

          {/* Category + Sub-Category */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Category</label>
              {/* Free-text input with datalist so coaches can add new categories */}
              <input
                required
                type="text"
                list="drill-categories"
                placeholder="e.g. Offense"
                className={inputCls}
                value={form.category}
                onChange={(e) => set("category", e.target.value)}
              />
              <datalist id="drill-categories">
                {suggestions.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
            <div>
              <label className={labelCls}>Sub-Category</label>
              <input
                required
                type="text"
                list="drill-sub-categories"
                placeholder="e.g. Closeouts"
                className={inputCls}
                value={form.sub_category}
                onChange={(e) => set("sub_category", e.target.value)}
              />
              <datalist id="drill-sub-categories">
                {subCategories.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
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
                onChange={(e) => set("shot_density", parseFloat(e.target.value))}
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
              {([1, 2, 3, 4, 5] as IntensityLevel[]).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => set("intensity", n)}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-colors ${
                    form.intensity === n
                      ? "bg-mustang-red border-mustang-red text-white"
                      : "bg-gray-700/60 border-gray-600 text-gray-400 hover:border-gray-400"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
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
              className="flex-1 py-2.5 rounded-lg bg-mustang-red hover:bg-mustang-red-dark disabled:opacity-50 text-white text-sm font-semibold transition-colors"
            >
              {saving ? "Saving…" : editing ? "Save Changes" : "Save Drill"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
