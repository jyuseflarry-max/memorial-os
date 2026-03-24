"use client";

import { useState, useMemo, useEffect } from "react";
import { Plus, Search, ExternalLink, Video, Pencil, Trash2, Copy, ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
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

// ── Types ─────────────────────────────────────────────────────────────────

type SortKey = "name" | "category" | "sub_category" | "shot_type" | "shot_density" | "intensity";
type SortDir = "asc" | "desc";

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

// ── Category badge ────────────────────────────────────────────────────────

function CategoryBadge({ cat }: { cat: string }) {
  const { getCatColor } = useDrillCategories();
  return (
    <span
      className="text-xs font-semibold px-2 py-0.5 rounded-full border"
      style={{
        color: getCatColor(cat),
        backgroundColor: hexToRgba(getCatColor(cat), 0.1),
        borderColor: hexToRgba(getCatColor(cat), 0.2),
      }}
    >
      {cat}
    </span>
  );
}

// ── Sortable column header ────────────────────────────────────────────────

function SortHeader({
  label, sortKey, current, dir, onSort,
}: {
  label: string; sortKey: SortKey; current: SortKey; dir: SortDir; onSort: (k: SortKey) => void;
}) {
  const active = current === sortKey;
  const Icon = active ? (dir === "asc" ? ChevronUp : ChevronDown) : ChevronsUpDown;
  return (
    <th className="px-4 py-3 text-left">
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={`flex items-center gap-1 text-xs font-mono uppercase tracking-wider transition-colors ${
          active ? "text-mustang-red" : "text-gray-500 hover:text-gray-300"
        }`}
      >
        {label}
        <Icon size={11} />
      </button>
    </th>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────

export default function DrillVaultPage() {
  const { drills, loading, addToCache, updateInCache, removeFromCache } = useDrills();
  const { activeTeam } = useTeam();
  const { settings } = useSettings();
  const { getCatColor } = useDrillCategories();
  const [query, setQuery]             = useState("");
  const [filterCat, setFilterCat]     = useState("All");
  const [sortKey, setSortKey]         = useState<SortKey>("name");
  const [sortDir, setSortDir]         = useState<SortDir>("asc");
  const [editing, setEditing]         = useState<Drill | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [duplicating, setDuplicating] = useState<string | null>(null);
  const [usage, setUsage] = useState<Record<string, DrillUsage>>({});

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

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  }

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
      .sort((a, b) => {
        let va: string | number = a[sortKey] ?? "";
        let vb: string | number = b[sortKey] ?? "";
        if (typeof va === "string") va = va.toLowerCase();
        if (typeof vb === "string") vb = vb.toLowerCase();
        if (va < vb) return sortDir === "asc" ? -1 : 1;
        if (va > vb) return sortDir === "asc" ? 1 : -1;
        return 0;
      });
  }, [drills, query, filterCat, sortKey, sortDir]);

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
      </div>

      {/* Mobile card list */}
      <div className="sm:hidden bg-gray-800 border border-gray-700 rounded-2xl overflow-hidden">
        {loading && (
          <p className="text-gray-500 text-xs font-mono text-center py-10">LOADING…</p>
        )}
        {!loading && displayed.length === 0 && (
          <p className="text-gray-500 text-xs font-mono text-center py-10">
            {drills.length === 0 ? "NO DRILLS YET — ADD ONE ABOVE" : "NO DRILLS MATCH FILTERS"}
          </p>
        )}
        <div className="divide-y divide-gray-700/30">
          {displayed.map((drill) => (
            <div key={drill.id} className="px-4 py-3">
              {/* Name */}
              <p className="text-white text-sm font-semibold mb-1">{drill.name}</p>
              {/* Attributes */}
              <div className="flex items-center gap-3 mb-2.5">
                {drill.sub_category && (
                  <span className="text-gray-400 text-xs font-mono">{drill.sub_category}</span>
                )}
                <IntensityPips level={drill.intensity} />
                <span className="text-gray-400 text-xs font-mono">
                  {drill.default_duration ?? 10}m
                </span>
              </div>
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
          ))}
        </div>
      </div>

      {/* Desktop table */}
      <div className="hidden sm:block bg-gray-800 border border-gray-700 rounded-2xl overflow-hidden overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead>
            <tr className="border-b border-gray-700">
              <SortHeader label="Drill Name"   sortKey="name"         current={sortKey} dir={sortDir} onSort={handleSort} />
              <SortHeader label="Category"     sortKey="category"     current={sortKey} dir={sortDir} onSort={handleSort} />
              <SortHeader label="Sub-Category" sortKey="sub_category" current={sortKey} dir={sortDir} onSort={handleSort} />
              <SortHeader label="Shot Type"    sortKey="shot_type"    current={sortKey} dir={sortDir} onSort={handleSort} />
              <SortHeader label="Density"      sortKey="shot_density" current={sortKey} dir={sortDir} onSort={handleSort} />
              <SortHeader label="Intensity"    sortKey="intensity"    current={sortKey} dir={sortDir} onSort={handleSort} />
              <th className="px-4 py-3 text-xs font-mono text-gray-500 uppercase tracking-wider text-left">Min</th>
              <th className="px-4 py-3 text-xs font-mono text-gray-500 uppercase tracking-wider text-left hidden lg:table-cell">Last Used</th>
              <th className="px-4 py-3 text-xs font-mono text-gray-500 uppercase tracking-wider text-left">Video</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={10} className="px-4 py-10 text-center text-gray-500 font-mono text-xs">LOADING…</td>
              </tr>
            )}
            {!loading && displayed.length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-10 text-center text-gray-500 font-mono text-xs">
                  {drills.length === 0 ? "NO DRILLS YET — ADD ONE ABOVE" : "NO DRILLS MATCH FILTERS"}
                </td>
              </tr>
            )}
            {displayed.map((drill, i) => {
              const u = usage[drill.id];
              return (
              <tr
                key={drill.id}
                className={`border-b border-gray-700/50 hover:bg-gray-700/20 transition-colors ${
                  i === displayed.length - 1 ? "border-0" : ""
                }`}
              >
                <td className="px-4 py-3 text-white font-medium">{drill.name}</td>
                <td className="px-4 py-3"><CategoryBadge cat={drill.category} /></td>
                <td className="px-4 py-3 text-gray-400">{drill.sub_category}</td>
                <td className="px-4 py-3">
                  <span className="text-xs font-mono text-gray-300 bg-gray-700 px-2 py-0.5 rounded">{drill.shot_type}</span>
                </td>
                <td className="px-4 py-3 text-gray-300 font-mono">
                  {Number(drill.shot_density).toFixed(1)}<span className="text-gray-600 text-xs"> /min</span>
                </td>
                <td className="px-4 py-3"><IntensityPips level={drill.intensity} /></td>
                <td className="px-4 py-3 text-gray-300 font-mono">
                  {drill.default_duration ?? 10}<span className="text-gray-600 text-xs">m</span>
                </td>
                <td className="px-4 py-3 hidden lg:table-cell">
                  {u ? (
                    <div>
                      <p className="text-gray-300 text-xs font-mono">{formatShortDate(u.last_used)}</p>
                      <p className="text-gray-600 text-[10px] font-mono">{u.use_count}× used</p>
                    </div>
                  ) : (
                    <span className="text-gray-600 text-xs font-mono">Never</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {drill.video_url ? (
                    <a href={drill.video_url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 text-mustang-red hover:text-orange-300 transition-colors text-xs">
                      <ExternalLink size={13} /> View
                    </a>
                  ) : (
                    <span className="text-gray-600 flex items-center gap-1 text-xs"><Video size={13} /> —</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <button onClick={() => setEditing(drill)}
                      className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-gray-700 transition-colors" title="Edit drill">
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => duplicateDrill(drill)}
                      disabled={duplicating === drill.id}
                      className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-gray-700 transition-colors disabled:opacity-40" title="Duplicate drill">
                      <Copy size={14} />
                    </button>
                    <button
                      onClick={() => {
                        if (!confirm(`Delete "${drill.name}"? This cannot be undone.`)) return;
                        removeFromCache(drill.id);
                        fetch(`/api/drills/${drill.id}`, { method: "DELETE" }).catch(() => {});
                      }}
                      className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-400/10 transition-colors" title="Delete drill">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
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
