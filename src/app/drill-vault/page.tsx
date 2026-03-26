"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { Plus, Search, ExternalLink, Video, Pencil, Trash2, Copy, Tag, AlertTriangle } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import DrillForm from "@/components/drill-vault/DrillForm";
import { useDrills } from "@/hooks/useDrills";
import { useTeam } from "@/context/TeamContext";
import { useSettings } from "@/context/SettingsContext";
import { Drill, INTENSITY_TIERS, IntensityLevel, DRILL_LEVELS } from "@/types/drill";
import { useDrillCategories, hexToRgba } from "@/context/DrillCategoryContext";

interface DrillUsage { last_used: string; use_count: number; }

function formatShortDate(iso: string): string {
  return new Date(iso + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" });
}

// ── Intensity pip display ─────────────────────────────────────────────────


function IntensityPips({ level }: { level: number }) {
  const tier = Math.min(Math.max(level, 1), 3) as IntensityLevel;
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex gap-0.5">
        {[1, 2, 3].map((n) => (
          <span key={n} className={`w-2 h-2 rounded-full ${n <= tier ? "bg-coaches-blue" : "bg-gray-600"}`} />
        ))}
      </div>
      <span className="text-[10px] font-mono text-gray-500">{INTENSITY_TIERS[tier]}</span>
    </div>
  );
}


// ── Main page ─────────────────────────────────────────────────────────────

export default function DrillVaultPage() {
  const { drills, loading, addToCache, updateInCache, removeFromCache } = useDrills();
  const { activeTeam } = useTeam();
  const { settings } = useSettings();
  const { getCatColor, addCategory } = useDrillCategories();
  const [query, setQuery]             = useState("");
  const [filterCat, setFilterCat]     = useState("All");
  const [filterLevel, setFilterLevel] = useState<number | null>(null);
  const [editing, setEditing]         = useState<Drill | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [duplicating, setDuplicating] = useState<string | null>(null);
  const [usage, setUsage]             = useState<Record<string, DrillUsage>>({});
  const [showCatForm, setShowCatForm] = useState(false);
  const [newCatName, setNewCatName]   = useState("");
  const [catSaving, setCatSaving]     = useState(false);
  const [catError, setCatError]       = useState<string | null>(null);
  const catInputRef                   = useRef<HTMLInputElement>(null);
  const [selectedIds,    setSelectedIds]    = useState<Set<string>>(new Set());
  const [showBulkDelete, setShowBulkDelete] = useState(false);
  const [bulkDeleting,   setBulkDeleting]   = useState(false);

  useEffect(() => {
    const params = new URLSearchParams();
    if (activeTeam) params.set("team_id", activeTeam.id);
    if (settings.season_start) params.set("season_start", settings.season_start);
    fetch(`/api/drills/usage?${params}`)
      .then((r) => r.json())
      .then((data) => { if (!data.error) setUsage(data); })
      .catch(() => {});
  }, [activeTeam, settings.season_start]);

  const categories = useMemo(
    () => Array.from(new Set(drills.flatMap((d) => d.categories ?? []))).sort(),
    [drills]
  );

  const displayed = useMemo(() => {
    const q = query.toLowerCase();
    return drills
      .filter((d) => {
        const matchesSearch =
          !q ||
          d.name.toLowerCase().includes(q) ||
          (d.categories ?? []).some((c) => c.toLowerCase().includes(q));
        const matchesCat   = filterCat === "All" || (d.categories ?? []).includes(filterCat);
        const matchesLevel = filterLevel === null || d.level === filterLevel;
        return matchesSearch && matchesCat && matchesLevel;
      })
      .sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
  }, [drills, query, filterCat]);

  async function duplicateDrill(drill: Drill) {
    setDuplicating(drill.id);
    try {
      const { id: _id, ...rest } = drill;
      const res = await fetch("/api/drills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...rest, name: `${drill.name} (Copy)` }),
      });
      const data = await res.json();
      if (data.drill) addToCache(data.drill);
    } finally {
      setDuplicating(null);
    }
  }

  const allDisplayedSelected = displayed.length > 0 && displayed.every((d) => selectedIds.has(d.id));
  const someDisplayedSelected = !allDisplayedSelected && displayed.some((d) => selectedIds.has(d.id));

  async function handleBulkDelete() {
    setBulkDeleting(true);
    await Promise.all([...selectedIds].map((id) =>
      fetch(`/api/drills/${id}`, { method: "DELETE" }).catch(() => {})
    ));
    [...selectedIds].forEach((id) => removeFromCache(id));
    setSelectedIds(new Set());
    setShowBulkDelete(false);
    setBulkDeleting(false);
  }

  async function handleAddCategory(e: React.FormEvent) {
    e.preventDefault();
    const name = newCatName.trim();
    if (!name) return;
    setCatSaving(true);
    setCatError(null);
    try {
      await addCategory(name);
      setNewCatName("");
      setShowCatForm(false);
      setFilterCat(name);
    } catch (err) {
      console.error("addCategory error:", err);
      setCatError(err instanceof Error ? err.message : String(err));
    } finally {
      setCatSaving(false);
    }
  }

  return (
    <DashboardLayout>
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-white text-2xl font-bold tracking-tight">Drill Vault</h1>
          <p className="text-gray-400 text-sm mt-0.5 font-mono">
            {loading ? "LOADING…" : `${displayed.length} OF ${drills.length} DRILLS`}
            {activeTeam && <span className="text-gray-600"> · {activeTeam.name.toUpperCase()}</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <button
              type="button"
              onClick={() => setShowBulkDelete(true)}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 transition-colors text-white text-sm font-semibold px-4 py-2.5 rounded-lg"
            >
              <Trash2 size={15} /> Delete Selected ({selectedIds.size})
            </button>
          )}
          <button
            onClick={() => setShowNewForm(true)}
            className="flex items-center gap-2 bg-coaches-blue hover:bg-coaches-blue-dark transition-colors text-white text-sm font-semibold px-4 py-2.5 rounded-lg"
          >
            <Plus size={16} />
            New Drill
          </button>
        </div>
      </div>

      {/* Level filter chips */}
      <div className="flex gap-2 mb-3 overflow-x-auto pb-1 scrollbar-none">
        <button
          type="button"
          onClick={() => setFilterLevel(null)}
          className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
            filterLevel === null
              ? "bg-coaches-blue/15 text-coaches-blue border-coaches-blue/40"
              : "text-gray-400 border-gray-700 hover:border-gray-500"
          }`}
        >
          All Levels
        </button>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setFilterLevel(filterLevel === n ? null : n)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
              filterLevel === n
                ? "bg-coaches-blue/15 text-coaches-blue border-coaches-blue/40"
                : "text-gray-400 border-gray-700 hover:border-gray-500"
            }`}
          >
            L{n} · {DRILL_LEVELS[n]}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-3">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          type="text"
          placeholder="Search drills…"
          className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-9 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-coaches-blue transition-colors"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {/* Category filter chips */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1 scrollbar-none">
        {["All", ...categories].map((cat) => {
          const active = filterCat === cat;
          const color  = cat !== "All" ? getCatColor(cat) : null;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setFilterCat(cat)}
              className="shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors"
              style={active && color ? {
                color,
                backgroundColor: hexToRgba(color, 0.15),
                borderColor: hexToRgba(color, 0.4),
              } : active ? {
                color: "#fff",
                backgroundColor: "rgb(237 28 36 / 0.15)",
                borderColor: "rgb(237 28 36 / 0.4)",
              } : {
                color: "rgb(156 163 175)",
                backgroundColor: "transparent",
                borderColor: "rgb(55 65 81)",
              }}
            >
              {cat === "All" ? "All Categories" : cat}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => { setShowCatForm(true); setCatError(null); setTimeout(() => catInputRef.current?.focus(), 50); }}
          className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold border border-dashed border-gray-600 text-gray-500 hover:text-white hover:border-gray-400 transition-colors"
        >
          <Tag size={11} /> New Category
        </button>
      </div>

      {/* Add Category modal */}
      {showCatForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => setShowCatForm(false)}
        >
          <div
            className="w-full max-w-sm bg-gray-900 border border-gray-700 rounded-2xl p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-white font-semibold text-base mb-4">New Category</h2>
            {catError && (
              <p className="mb-3 text-red-400 text-xs font-mono">{catError}</p>
            )}
            <form onSubmit={handleAddCategory} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-mono text-gray-400 mb-1 uppercase tracking-wider">Name</label>
                <input
                  ref={catInputRef}
                  required
                  type="text"
                  placeholder="e.g. Transition"
                  className="w-full bg-gray-700/60 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-coaches-blue transition-colors"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                />
                <p className="text-gray-600 text-[10px] font-mono mt-1">A color will be assigned automatically.</p>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowCatForm(false)}
                  className="flex-1 py-2.5 rounded-lg border border-gray-600 text-gray-400 text-sm hover:bg-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={catSaving}
                  className="flex-1 py-2.5 rounded-lg bg-coaches-blue hover:bg-coaches-blue-dark disabled:opacity-50 text-white text-sm font-semibold transition-colors"
                >
                  {catSaving ? "Saving…" : "Save Category"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Drill card list */}
      <div className="bg-gray-800 border border-gray-700 rounded-2xl overflow-hidden">
        {!loading && displayed.length > 0 && (
          <div className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-700/50">
            <input
              type="checkbox"
              checked={allDisplayedSelected}
              ref={(el) => { if (el) el.indeterminate = someDisplayedSelected; }}
              onChange={(e) => setSelectedIds(e.target.checked ? new Set(displayed.map((d) => d.id)) : new Set())}
              className="w-4 h-4 rounded border-gray-600 bg-gray-700 cursor-pointer accent-red-600"
            />
            <span className="text-[10px] font-mono text-gray-500 uppercase tracking-wider">Select All</span>
          </div>
        )}
        {loading && (
          <p className="text-gray-500 text-xs font-mono text-center py-10">LOADING…</p>
        )}
        {!loading && displayed.length === 0 && (
          <p className="text-gray-500 text-xs font-mono text-center py-10">
            {drills.length === 0 ? "NO DRILLS YET — ADD ONE ABOVE" : "NO DRILLS MATCH FILTERS"}
          </p>
        )}
        <div className="divide-y divide-gray-700/30">
          {displayed.map((drill) => {
            const u = usage[drill.id];
            return (
            <div key={drill.id} className={`px-4 py-3 ${selectedIds.has(drill.id) ? "bg-red-500/5" : ""}`}>
              <div className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={selectedIds.has(drill.id)}
                onChange={(e) => setSelectedIds((prev) => {
                  const next = new Set(prev);
                  if (e.target.checked) next.add(drill.id); else next.delete(drill.id);
                  return next;
                })}
                className="w-4 h-4 rounded border-gray-600 bg-gray-700 cursor-pointer accent-red-600 mt-1 shrink-0"
              />
              <div className="flex-1 min-w-0">
              {/* Name */}
              <p className="text-white text-sm font-semibold mb-1">{drill.name}</p>
              {/* Attributes */}
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                {drill.level && (
                  <span className="text-coaches-blue text-[10px] font-mono font-bold bg-coaches-blue/10 border border-coaches-blue/25 px-2 py-0.5 rounded-full">
                    L{drill.level} · {DRILL_LEVELS[drill.level]}
                  </span>
                )}
                {drill.objectives?.map((o) => (
                  <span key={o} className="text-purple-400 text-[10px] font-mono bg-purple-400/10 border border-purple-400/25 px-2 py-0.5 rounded-full">
                    {o}
                  </span>
                ))}
                {(drill.categories ?? []).map((c) => (
                  <span key={c} className="text-coaches-blue text-[10px] font-mono bg-coaches-blue/10 border border-coaches-blue/25 px-2 py-0.5 rounded-full">{c}</span>
                ))}
                <IntensityPips level={drill.intensity} />
                <span className="text-gray-400 text-xs font-mono">
                  {drill.default_duration ?? 10}m
                </span>
              </div>
              {/* Usage */}
              <p className="text-xs font-mono text-gray-400 mb-2.5">
                {u
                  ? <>Last used {formatShortDate(u.last_used)} <span className="text-gray-400">({u.use_count})</span></>
                  : "Never used"}
              </p>
              {/* Actions */}
              <div className="flex items-center gap-1">
                {drill.video_url ? (
                  <a href={drill.video_url} target="_blank" rel="noopener noreferrer"
                    className="p-2 rounded-lg text-coaches-blue hover:bg-coaches-blue/10 border border-gray-700 hover:border-coaches-blue/30 transition-colors" title="Watch video">
                    <ExternalLink size={14} />
                  </a>
                ) : (
                  <span className="p-2 rounded-lg text-gray-600 border border-gray-700/50 cursor-default" title="No video">
                    <Video size={14} />
                  </span>
                )}
                <button onClick={() => setEditing(drill)}
                  className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 border border-gray-700 hover:border-gray-500 transition-colors" title="Edit drill">
                  <Pencil size={14} />
                </button>
                <button onClick={() => duplicateDrill(drill)} disabled={duplicating === drill.id}
                  className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 border border-gray-700 hover:border-gray-500 transition-colors disabled:opacity-40" title="Duplicate drill">
                  <Copy size={14} />
                </button>
                <button
                  onClick={() => {
                    if (!confirm(`Delete "${drill.name}"? This cannot be undone.`)) return;
                    removeFromCache(drill.id);
                    fetch(`/api/drills/${drill.id}`, { method: "DELETE" }).catch(() => {});
                  }}
                  className="p-2 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-400/10 border border-gray-700 hover:border-red-400/30 transition-colors" title="Delete drill">
                  <Trash2 size={14} />
                </button>
              </div>
              </div>
              </div>
            </div>
            );
          })}
        </div>
      </div>


      {showBulkDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-gray-900 border border-red-800/50 rounded-2xl p-6 w-full max-w-sm shadow-2xl"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
                <AlertTriangle size={18} className="text-red-400" />
              </div>
              <div>
                <p className="text-white font-semibold">Delete {selectedIds.size} drill{selectedIds.size !== 1 ? "s" : ""}?</p>
                <p className="text-gray-400 text-sm">This cannot be undone.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowBulkDelete(false)}
                className="flex-1 py-2.5 rounded-lg border border-gray-600 text-gray-400 text-sm hover:bg-gray-800 transition-colors">
                Cancel
              </button>
              <button type="button" onClick={handleBulkDelete} disabled={bulkDeleting}
                className="flex-1 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-semibold transition-colors">
                {bulkDeleting ? "Deleting…" : "Delete All"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showNewForm && (
        <DrillForm
          onSave={(drill: Drill) => addToCache(drill)}
          onClose={() => setShowNewForm(false)}
        />
      )}
      {editing && (
        <DrillForm
          initialDrill={editing}
          onSave={(drill: Drill) => updateInCache(drill)}
          onDelete={(id: string) => removeFromCache(id)}
          onClose={() => setEditing(null)}
        />
      )}
    </DashboardLayout>
  );
}
