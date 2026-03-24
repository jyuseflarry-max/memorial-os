"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { Plus, Search, ExternalLink, Video, Pencil, Trash2, Copy, Tag } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import DrillForm from "@/components/drill-vault/DrillForm";
import { useDrills } from "@/hooks/useDrills";
import { useTeam } from "@/context/TeamContext";
import { useSettings } from "@/context/SettingsContext";
import { Drill } from "@/types/drill";
import { useDrillCategories, hexToRgba } from "@/context/DrillCategoryContext";

interface DrillUsage { last_used: string; use_count: number; }

function formatShortDate(iso: string): string {
  return new Date(iso + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" });
}

// ── Intensity pip display ─────────────────────────────────────────────────

function IntensityPips({ level }: { level: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={`w-2 h-2 rounded-full ${n <= level ? "bg-mustang-red" : "bg-gray-600"}`} />
      ))}
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
  const [editing, setEditing]         = useState<Drill | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [duplicating, setDuplicating] = useState<string | null>(null);
  const [usage, setUsage]             = useState<Record<string, DrillUsage>>({});
  const [showCatForm, setShowCatForm] = useState(false);
  const [newCatName, setNewCatName]   = useState("");
  const [catSaving, setCatSaving]     = useState(false);
  const [catError, setCatError]       = useState<string | null>(null);
  const catInputRef                   = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const params = new URLSearchParams();
    if (activeTeam) params.set("team_id", activeTeam.id);
    if (settings.season_start) params.set("season_start", settings.season_start);
    fetch(`/api/drills/usage?${params}`)
      .then((r) => r.json())
      .then((data) => { if (!data.error) setUsage(data); })
      .catch(() => {});
  }, [activeTeam, settings.season_start]);

  // Unique lists for filter dropdowns and datalist suggestions
  const categories = useMemo(
    () => Array.from(new Set(drills.map((d) => d.category))).sort(),
    [drills]
  );
  const subCategories = useMemo(
    () => Array.from(new Set(drills.map((d) => d.sub_category).filter(Boolean))).sort(),
    [drills]
  );

  const displayed = useMemo(() => {
    const q = query.toLowerCase();
    return drills
      .filter((d) => {
        const matchesSearch =
          !q ||
          d.name.toLowerCase().includes(q) ||
          d.sub_category.toLowerCase().includes(q) ||
          d.category.toLowerCase().includes(q);
        const matchesCat = filterCat === "All" || d.category === filterCat;
        return matchesSearch && matchesCat;
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
      setCatError(err instanceof Error ? err.message : "Failed to save category.");
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
        <button
          onClick={() => setShowNewForm(true)}
          className="flex items-center gap-2 bg-mustang-red hover:bg-mustang-red-dark transition-colors text-white text-sm font-semibold px-4 py-2.5 rounded-lg"
        >
          <Plus size={16} />
          New Drill
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-3">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          type="text"
          placeholder="Search drills…"
          className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-9 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-mustang-red transition-colors"
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
                  className="w-full bg-gray-700/60 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-mustang-red transition-colors"
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
                  className="flex-1 py-2.5 rounded-lg bg-mustang-red hover:bg-mustang-red-dark disabled:opacity-50 text-white text-sm font-semibold transition-colors"
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
            <div key={drill.id} className="px-4 py-3">
              {/* Name */}
              <p className="text-white text-sm font-semibold mb-1">{drill.name}</p>
              {/* Attributes */}
              <div className="flex items-center gap-3 mb-2">
                {drill.sub_category && (
                  <span className="text-gray-400 text-xs font-mono">{drill.sub_category}</span>
                )}
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
                    className="p-2 rounded-lg text-mustang-red hover:bg-mustang-red/10 border border-gray-700 hover:border-mustang-red/30 transition-colors" title="Watch video">
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
            );
          })}
        </div>
      </div>


      {showNewForm && (
        <DrillForm
          subCategories={subCategories}
          onSave={(drill: Drill) => addToCache(drill)}
          onClose={() => setShowNewForm(false)}
        />
      )}
      {editing && (
        <DrillForm
          initialDrill={editing}
          subCategories={subCategories}
          onSave={(drill: Drill) => updateInCache(drill)}
          onDelete={(id: string) => removeFromCache(id)}
          onClose={() => setEditing(null)}
        />
      )}
    </DashboardLayout>
  );
}
