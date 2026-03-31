"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { Plus, Search, ExternalLink, Video, Pencil, Trash2, Copy, AlertTriangle, Eye, EyeOff } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import DrillForm from "@/components/drill-vault/DrillForm";
import { useDrills } from "@/hooks/useDrills";
import { useTeam } from "@/context/TeamContext";
import { useSettings } from "@/context/SettingsContext";
import { Drill, INTENSITY_TIERS, IntensityLevel, DRILL_LEVELS } from "@/types/drill";
import { useDrillCategories, hexToRgba } from "@/context/DrillCategoryContext";
import { useDrillObjectives } from "@/context/DrillObjectivesContext";

interface DrillUsage { last_used: string; use_count: number; }

function formatShortDate(iso: string): string {
  return new Date(iso + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" });
}

// Intensity dot display
function IntensityDots({ level, size = "sm" }: { level: IntensityLevel; size?: "sm" | "xs" }) {
  const dotSize = size === "xs" ? "w-1.5 h-1.5" : "w-2 h-2";
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3].map((n) => (
        <span key={n} className={`${dotSize} rounded-full ${n <= level ? "bg-coaches-blue" : "bg-gray-600"}`} />
      ))}
    </div>
  );
}

// Small color-coded chip
function Chip({ label, color, size = "sm" }: { label: string; color: string; size?: "sm" | "xs" }) {
  const cls = size === "xs" ? "text-[9px] px-1.5 py-0" : "text-[10px] px-2 py-0.5";
  return (
    <span
      className={`${cls} font-semibold rounded-full border font-mono shrink-0`}
      style={{
        color,
        backgroundColor: hexToRgba(color, 0.12),
        borderColor:     hexToRgba(color, 0.3),
      }}
    >
      {label}
    </span>
  );
}

// Filter chip button
function FilterChip({
  active, label, color, onClick,
}: { active: boolean; label: string; color?: string | null; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors"
      style={
        active && color
          ? { color, backgroundColor: hexToRgba(color, 0.15), borderColor: hexToRgba(color, 0.4) }
          : active
          ? { color: "#60a5fa", backgroundColor: "rgba(96,165,250,0.15)", borderColor: "rgba(96,165,250,0.4)" }
          : { color: "rgb(156 163 175)", backgroundColor: "transparent", borderColor: "rgb(55 65 81)" }
      }
    >
      {label}
    </button>
  );
}

export default function DrillVaultPage() {
  const { drills, loading, addToCache, updateInCache, removeFromCache } = useDrills();
  const { activeTeam } = useTeam();
  const { settings } = useSettings();
  const { getCatColor } = useDrillCategories();
  const { objectives, getObjColor } = useDrillObjectives();

  const [query,          setQuery]          = useState("");
  const [filterCats,     setFilterCats]     = useState<Set<string>>(new Set());
  const [filterIntensity,setFilterIntensity]= useState<Set<IntensityLevel>>(new Set());
  const [filterObjectives,setFilterObjectives] = useState<Set<string>>(new Set());
  const [filterLevel,    setFilterLevel]    = useState<number | null>(null);
  const [showNeverUsed,  setShowNeverUsed]  = useState(false);
  const [editing,        setEditing]        = useState<Drill | null>(null);
  const [showNewForm,    setShowNewForm]    = useState(false);
  const [duplicating,    setDuplicating]    = useState<string | null>(null);
  const [usage,          setUsage]          = useState<Record<string, DrillUsage>>({});
  const [selectedIds,    setSelectedIds]    = useState<Set<string>>(new Set());
  const [showBulkDelete, setShowBulkDelete] = useState(false);
  const [bulkDeleting,   setBulkDeleting]   = useState(false);

  // ref used for indeterminate checkbox state — kept to avoid unused-var warning
  const _selectAllRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const params = new URLSearchParams();
    if (activeTeam) params.set("team_id", activeTeam.id);
    if (settings.season_start) params.set("season_start", settings.season_start);
    fetch(`/api/drills/usage?${params}`)
      .then((r) => r.json())
      .then((data) => { if (!data.error) setUsage(data); })
      .catch(() => {});
  }, [activeTeam, settings.season_start]);

  // Unique categories from drills (now always in sync with DB via junction tables)
  const allCategories = useMemo(
    () => Array.from(new Set(drills.flatMap((d) => d.categories ?? []))).sort(),
    [drills]
  );

  // Cascading: which objectives to show in filters
  const availableObjectives = useMemo(() => {
    const allObjNames = objectives.map((o) => o.name);
    if (filterCats.size === 0) return allObjNames;
    const relevant = new Set<string>();
    drills.forEach((d) => {
      if ([...filterCats].some((c) => (d.categories ?? []).includes(c))) {
        (d.objectives ?? []).forEach((o) => relevant.add(o));
      }
    });
    return allObjNames.filter((o) => relevant.has(o));
  }, [filterCats, drills, objectives]);

  const displayed = useMemo(() => {
    const q = query.toLowerCase();
    return drills
      .filter((d) => {
        const matchesSearch = !q || d.name.toLowerCase().includes(q) ||
          (d.categories ?? []).some((c) => c.toLowerCase().includes(q));
        const matchesCat = filterCats.size === 0 ||
          [...filterCats].some((c) => (d.categories ?? []).includes(c));
        const matchesIntensity = filterIntensity.size === 0 || filterIntensity.has(d.intensity);
        const matchesObjective = filterObjectives.size === 0 ||
          [...filterObjectives].some((o) => (d.objectives ?? []).includes(o));
        const matchesLevel = filterLevel === null || d.level === filterLevel;
        const matchesNeverUsed = !showNeverUsed || !usage[d.id];
        return matchesSearch && matchesCat && matchesIntensity && matchesObjective && matchesLevel && matchesNeverUsed;
      })
      .sort((a, b) => {
        const au = usage[a.id]?.use_count ?? 0;
        const bu = usage[b.id]?.use_count ?? 0;
        if (bu !== au) return bu - au;
        return a.name.localeCompare(b.name);
      });
  }, [drills, query, filterCats, filterIntensity, filterObjectives, filterLevel, showNeverUsed, usage]);

  const allDisplayedSelected = displayed.length > 0 && displayed.every((d) => selectedIds.has(d.id));
  const someDisplayedSelected = !allDisplayedSelected && displayed.some((d) => selectedIds.has(d.id));

  function toggleCat(cat: string) {
    setFilterCats((prev) => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });
    // Clear objective filters that are no longer cascading-available
    setFilterObjectives(new Set());
  }

  function toggleIntensity(n: IntensityLevel) {
    setFilterIntensity((prev) => {
      const next = new Set(prev);
      next.has(n) ? next.delete(n) : next.add(n);
      return next;
    });
  }

  function toggleObjective(o: string) {
    setFilterObjectives((prev) => {
      const next = new Set(prev);
      next.has(o) ? next.delete(o) : next.add(o);
      return next;
    });
  }

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

  const hasFilters = filterCats.size > 0 || filterIntensity.size > 0 || filterObjectives.size > 0 || filterLevel !== null || showNeverUsed;

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-white text-2xl font-bold tracking-tight">Drill Vault</h1>
          <p className="text-gray-400 text-sm mt-0.5 font-mono">
            {loading ? "LOADING…" : `${displayed.length} OF ${drills.length} DRILLS`}
            {activeTeam && <span className="text-gray-600"> · {activeTeam.name.toUpperCase()}</span>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <button type="button" onClick={() => setShowBulkDelete(true)}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 transition-colors text-white text-sm font-semibold px-4 py-2.5 rounded-lg">
              <Trash2 size={15} /> Delete ({selectedIds.size})
            </button>
          )}
          <button onClick={() => setShowNewForm(true)}
            className="flex items-center gap-2 bg-coaches-blue hover:bg-coaches-blue-dark transition-colors text-white text-sm font-semibold px-4 py-2.5 rounded-lg">
            <Plus size={16} /> New Drill
          </button>
        </div>
      </div>

      {/* ── Level chips ───────────────────────────────────────────────── */}
      <div className="flex gap-2 mb-2 overflow-x-auto pb-1 scrollbar-none">
        <FilterChip active={filterLevel === null} label="All Levels" onClick={() => setFilterLevel(null)} />
        {[1, 2, 3, 4, 5].map((n) => (
          <FilterChip key={n} active={filterLevel === n} label={`L${n} · ${DRILL_LEVELS[n]}`}
            onClick={() => setFilterLevel(filterLevel === n ? null : n)} />
        ))}
      </div>

      {/* ── Intensity chips ───────────────────────────────────────────── */}
      <div className="flex gap-2 mb-3 overflow-x-auto pb-1 scrollbar-none">
        {([1, 2, 3] as IntensityLevel[]).map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => toggleIntensity(n)}
            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors"
            style={
              filterIntensity.has(n)
                ? { color: "#60a5fa", backgroundColor: "rgba(96,165,250,0.15)", borderColor: "rgba(96,165,250,0.4)" }
                : { color: "rgb(156 163 175)", backgroundColor: "transparent", borderColor: "rgb(55 65 81)" }
            }
          >
            <IntensityDots level={n} size="xs" />
            {INTENSITY_TIERS[n]}
          </button>
        ))}
        {filterIntensity.size > 0 && (
          <button type="button" onClick={() => setFilterIntensity(new Set())}
            className="shrink-0 px-2 py-1.5 rounded-full text-[10px] font-mono text-gray-500 hover:text-white border border-gray-700 hover:border-gray-500 transition-colors">
            × clear
          </button>
        )}
      </div>

      {/* ── Search ────────────────────────────────────────────────────── */}
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

      {/* ── Category chips ────────────────────────────────────────────── */}
      <div className="flex gap-2 mb-2 overflow-x-auto pb-1 scrollbar-none">
        {allCategories.map((cat) => {
          const color = getCatColor(cat);
          return (
            <FilterChip key={cat} active={filterCats.has(cat)} label={cat} color={color}
              onClick={() => toggleCat(cat)} />
          );
        })}
        {filterCats.size > 0 && (
          <button type="button" onClick={() => { setFilterCats(new Set()); setFilterObjectives(new Set()); }}
            className="shrink-0 px-2 py-1.5 rounded-full text-[10px] font-mono text-gray-500 hover:text-white border border-gray-700 hover:border-gray-500 transition-colors">
            × clear
          </button>
        )}
      </div>

      {/* ── Objective chips (cascading) ───────────────────────────────── */}
      {availableObjectives.length > 0 && (
        <div className="flex gap-2 mb-3 overflow-x-auto pb-1 scrollbar-none">
          {availableObjectives.map((o) => {
            const color = getObjColor(o);
            return (
              <FilterChip key={o} active={filterObjectives.has(o)} label={o} color={color}
                onClick={() => toggleObjective(o)} />
            );
          })}
          {filterObjectives.size > 0 && (
            <button type="button" onClick={() => setFilterObjectives(new Set())}
              className="shrink-0 px-2 py-1.5 rounded-full text-[10px] font-mono text-gray-500 hover:text-white border border-gray-700 hover:border-gray-500 transition-colors">
              × clear
            </button>
          )}
        </div>
      )}

      {/* ── Toolbar (show-never-used + active filter summary) ─────────── */}
      <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => setShowNeverUsed((v) => !v)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
            showNeverUsed
              ? "bg-amber-500/15 border-amber-500/40 text-amber-400"
              : "text-gray-500 border-gray-700 hover:border-gray-500 hover:text-gray-300"
          }`}
        >
          {showNeverUsed ? <Eye size={12} /> : <EyeOff size={12} />}
          {showNeverUsed ? "Showing never used" : "Show never used"}
        </button>

        {hasFilters && (
          <button type="button"
            onClick={() => { setFilterCats(new Set()); setFilterIntensity(new Set()); setFilterObjectives(new Set()); setFilterLevel(null); setShowNeverUsed(false); }}
            className="text-[10px] font-mono text-gray-600 hover:text-gray-400 transition-colors">
            Reset all filters
          </button>
        )}
      </div>

      {/* ── Drill list ────────────────────────────────────────────────── */}
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
        {loading && <p className="text-gray-500 text-xs font-mono text-center py-10">LOADING…</p>}
        {!loading && displayed.length === 0 && (
          <p className="text-gray-500 text-xs font-mono text-center py-10">
            {drills.length === 0 ? "NO DRILLS YET — ADD ONE ABOVE" : "NO DRILLS MATCH FILTERS"}
          </p>
        )}

        <div className="divide-y divide-gray-700/30">
          {displayed.map((drill) => {
            const u = usage[drill.id];
            return (
              <div key={drill.id} className={`px-4 py-3.5 ${selectedIds.has(drill.id) ? "bg-red-500/5" : ""}`}>
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(drill.id)}
                    onChange={(e) => setSelectedIds((prev) => {
                      const next = new Set(prev);
                      e.target.checked ? next.add(drill.id) : next.delete(drill.id);
                      return next;
                    })}
                    className="w-4 h-4 rounded border-gray-600 bg-gray-700 cursor-pointer accent-red-600 mt-1 shrink-0"
                  />
                  <div className="flex-1 min-w-0">

                    {/* Row 1: Name + intensity dots */}
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <p className="text-white text-sm font-semibold truncate">{drill.name}</p>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <IntensityDots level={drill.intensity} />
                        <span className="text-[10px] font-mono text-gray-500 hidden sm:inline">
                          {INTENSITY_TIERS[drill.intensity]}
                        </span>
                      </div>
                    </div>

                    {/* Row 2: Category chips + Objective chips */}
                    <div className="flex flex-wrap gap-1 mb-2">
                      {(drill.categories ?? []).map((c) => (
                        <Chip key={c} label={c} color={getCatColor(c)} />
                      ))}
                      {(drill.objectives ?? []).map((o) => (
                        <Chip key={o} label={o} color={getObjColor(o)} />
                      ))}
                      {drill.level && (
                        <span className="text-[10px] font-mono text-gray-500 px-2 py-0.5 bg-gray-700/60 border border-gray-600 rounded-full">
                          L{drill.level}
                        </span>
                      )}
                    </div>

                    {/* Row 3: Usage */}
                    <p className="text-[11px] font-mono text-gray-500 mb-2.5">
                      {u
                        ? <>Last used {formatShortDate(u.last_used)} <span className="text-gray-400 font-semibold">({u.use_count}×)</span></>
                        : <span className="text-amber-600/80">Never used</span>}
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
                        className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 border border-gray-700 hover:border-gray-500 transition-colors" title="Edit">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => duplicateDrill(drill)} disabled={duplicating === drill.id}
                        className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 border border-gray-700 hover:border-gray-500 transition-colors disabled:opacity-40" title="Duplicate">
                        <Copy size={14} />
                      </button>
                      <button
                        onClick={() => {
                          if (!confirm(`Delete "${drill.name}"? This cannot be undone.`)) return;
                          removeFromCache(drill.id);
                          fetch(`/api/drills/${drill.id}`, { method: "DELETE" }).catch(() => {});
                        }}
                        className="p-2 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-400/10 border border-gray-700 hover:border-red-400/30 transition-colors" title="Delete">
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

      {/* Bulk delete modal */}
      {showBulkDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-gray-900 border border-red-800/50 rounded-2xl p-6 w-full max-w-sm shadow-2xl" onClick={(e) => e.stopPropagation()}>
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
                className="flex-1 py-2.5 rounded-lg border border-gray-600 text-gray-400 text-sm hover:bg-gray-800 transition-colors">Cancel</button>
              <button type="button" onClick={handleBulkDelete} disabled={bulkDeleting}
                className="flex-1 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-semibold transition-colors">
                {bulkDeleting ? "Deleting…" : "Delete All"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showNewForm && (
        <DrillForm onSave={(drill) => { addToCache(drill); setShowNewForm(false); }} onClose={() => setShowNewForm(false)} />
      )}
      {editing && (
        <DrillForm initialDrill={editing} onSave={(drill) => { updateInCache(drill); setEditing(null); }}
          onDelete={(id) => { removeFromCache(id); setEditing(null); }} onClose={() => setEditing(null)} />
      )}
    </DashboardLayout>
  );
}
