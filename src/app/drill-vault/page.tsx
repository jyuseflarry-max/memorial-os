"use client";

import { useState, useMemo, useEffect } from "react";
import { Plus, Search, ExternalLink, Video, Pencil, Trash2, ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import DrillForm from "@/components/drill-vault/DrillForm";
import ShotProjection from "@/components/drill-vault/ShotProjection";
import { useDrills } from "@/hooks/useDrills";
import { useTeam } from "@/context/TeamContext";
import { Drill, DrillCategory } from "@/types/drill";

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

const CAT_COLORS: Record<string, string> = {
  [DrillCategory.Defense]:        "text-blue-400   bg-blue-400/10   border-blue-400/20",
  [DrillCategory.Offense]:        "text-green-400  bg-green-400/10  border-green-400/20",
  [DrillCategory.RestTransition]: "text-sky-400    bg-sky-400/10    border-sky-400/20",
  [DrillCategory.Transition]:     "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
  [DrillCategory.SpecialTeams]:   "text-purple-400 bg-purple-400/10 border-purple-400/20",
};

function CategoryBadge({ cat }: { cat: string }) {
  const cls = CAT_COLORS[cat] ?? "text-gray-400 bg-gray-400/10 border-gray-400/20";
  return <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${cls}`}>{cat}</span>;
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
  const [query, setQuery]             = useState("");
  const [filterCat, setFilterCat]     = useState("All");
  const [sortKey, setSortKey]         = useState<SortKey>("name");
  const [sortDir, setSortDir]         = useState<SortDir>("asc");
  const [editing, setEditing]         = useState<Drill | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [usage, setUsage] = useState<Record<string, DrillUsage>>({});

  useEffect(() => {
    const teamParam = activeTeam ? `?team_id=${activeTeam.id}` : "";
    fetch(`/api/drills/usage${teamParam}`)
      .then((r) => r.json())
      .then((data) => { if (!data.error) setUsage(data); })
      .catch(() => {});
  }, [activeTeam]);

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

      {/* Shot Projection */}
      <div className="mb-6">
        <ShotProjection drills={drills} />
      </div>

      {/* Search + Category filter */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Search drills…"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-9 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-mustang-red transition-colors"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <select
          value={filterCat}
          onChange={(e) => setFilterCat(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-mustang-red transition-colors"
        >
          <option value="All">All Categories</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-gray-800 border border-gray-700 rounded-2xl overflow-hidden overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead>
            <tr className="border-b border-gray-700">
              <SortHeader label="Drill Name"   sortKey="name"         current={sortKey} dir={sortDir} onSort={handleSort} />
              <SortHeader label="Category"     sortKey="category"     current={sortKey} dir={sortDir} onSort={handleSort} />
              <SortHeader label="Sub-Category" sortKey="sub_category" current={sortKey} dir={sortDir} onSort={handleSort} />
              <SortHeader label="Shot Type"    sortKey="shot_type"    current={sortKey} dir={sortDir} onSort={handleSort} />
              <SortHeader label="Density"      sortKey="shot_density" current={sortKey} dir={sortDir} onSort={handleSort} />
              <SortHeader label="Intensity"    sortKey="intensity"    current={sortKey} dir={sortDir} onSort={handleSort} />
              <th className="px-4 py-3 text-xs font-mono text-gray-500 uppercase tracking-wider text-left hidden lg:table-cell">Last Used</th>
              <th className="px-4 py-3 text-xs font-mono text-gray-500 uppercase tracking-wider text-left">Video</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-gray-500 font-mono text-xs">LOADING…</td>
              </tr>
            )}
            {!loading && displayed.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-gray-500 font-mono text-xs">
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
          categories={categories}
          subCategories={subCategories}
          onSave={(drill: Drill) => addToCache(drill)}
          onClose={() => setShowNewForm(false)}
        />
      )}
      {editing && (
        <DrillForm
          initialDrill={editing}
          categories={categories}
          subCategories={subCategories}
          onSave={(drill: Drill) => updateInCache(drill)}
          onDelete={(id: string) => removeFromCache(id)}
          onClose={() => setEditing(null)}
        />
      )}
    </DashboardLayout>
  );
}
