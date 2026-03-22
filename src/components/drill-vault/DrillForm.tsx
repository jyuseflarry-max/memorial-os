"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Drill, DrillCategory, ShotType, IntensityLevel } from "@/types/drill";

interface Props {
  onSave: (drill: Drill) => void;
  onClose: () => void;
}

const EMPTY_FORM = {
  name: "",
  category: DrillCategory.Offense,
  sub_category: "",
  shot_density: 2,
  shot_type: ShotType.ThreePoint,
  intensity: 3 as IntensityLevel,
  video_url: "",
};

export default function DrillForm({ onSave, onClose }: Props) {
  const [form, setForm]     = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  function set<K extends keyof typeof EMPTY_FORM>(key: K, value: (typeof EMPTY_FORM)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/drills", {
        method: "POST",
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

  const labelCls = "block text-xs font-mono text-gray-400 mb-1 uppercase tracking-wider";
  const inputCls =
    "w-full bg-gray-700/60 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-mustang-red transition-colors";

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
          <h2 className="text-white font-semibold text-lg">New Drill</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X size={20} />
          </button>
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
              <select
                className={inputCls}
                value={form.category}
                onChange={(e) => set("category", e.target.value as DrillCategory)}
              >
                {Object.values(DrillCategory).map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Sub-Category</label>
              <input
                required
                type="text"
                placeholder="e.g. Closeouts"
                className={inputCls}
                value={form.sub_category}
                onChange={(e) => set("sub_category", e.target.value)}
              />
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
              {saving ? "Saving…" : "Save Drill"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
