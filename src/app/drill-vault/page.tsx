"use client";

import { useState, useMemo } from "react";
import { Plus, Search, ExternalLink, Video } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import DrillForm from "@/components/drill-vault/DrillForm";
import ShotProjection from "@/components/drill-vault/ShotProjection";
import { MOCK_DRILLS } from "@/lib/mock-drills";
import { Drill, DrillCategory } from "@/types/drill";

// ── Intensity pip display ─────────────────────────────────────────────────

function IntensityPips({ level }: { level: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          className={`w-2 h-2 rounded-full ${
            n <= level ? "bg-mustang-red" : "bg-gray-600"
          }`}
        />
      ))}
    </div>
  );
}

// ── Category badge ────────────────────────────────────────────────────────

const CAT_COLORS: Record<DrillCategory, string> = {
  [DrillCategory.Defense]:       "text-blue-400  bg-blue-400/10  border-blue-400/20",
  [DrillCategory.Offense]:       "text-green-400 bg-green-400/10 border-green-400/20",
  [DrillCategory.RestTransition]:"text-sky-400   bg-sky-400/10   border-sky-400/20",
  [DrillCategory.Transition]: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
  [DrillCategory.SpecialTeams]: "text-purple-400 bg-purple-400/10 border-purple-400/20",
};

function CategoryBadge({ cat }: { cat: DrillCategory }) {
  return (
    <span
      className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${CAT_COLORS[cat]}`}
    >
      {cat}
    </span>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────

export default function DrillVaultPage() {
  const [drills, setDrills] = useState<Drill[]>(MOCK_DRILLS);
  const [query, setQuery] = useState("");
  const [showForm, setShowForm] = useState(false);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return drills.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        d.sub_category.toLowerCase().includes(q) ||
        d.category.toLowerCase().includes(q)
    );
  }, [drills, query]);

  function handleSave(drill: Drill) {
    setDrills((prev) => [drill, ...prev]);
  }

  return (
    <DashboardLayout>
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-white text-2xl font-bold tracking-tight">Drill Vault</h1>
          <p className="text-gray-400 text-sm mt-0.5 font-mono">
            {drills.length} DRILLS INDEXED
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
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

      {/* Search bar */}
      <div className="relative mb-4">
        <Search
          size={15}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
        />
        <input
          type="text"
          placeholder="Search by name, category, or sub-category…"
          className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-9 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-mustang-red transition-colors"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="bg-gray-800 border border-gray-700 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-700 text-left">
              {["Drill Name", "Category", "Sub-Category", "Shot Type", "Density", "Intensity", "Video"].map(
                (h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-xs font-mono text-gray-500 uppercase tracking-wider"
                  >
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-gray-500 font-mono text-xs">
                  NO DRILLS MATCH QUERY
                </td>
              </tr>
            )}
            {filtered.map((drill, i) => (
              <tr
                key={drill.id}
                className={`border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors ${
                  i === filtered.length - 1 ? "border-0" : ""
                }`}
              >
                <td className="px-4 py-3 text-white font-medium">{drill.name}</td>
                <td className="px-4 py-3">
                  <CategoryBadge cat={drill.category} />
                </td>
                <td className="px-4 py-3 text-gray-400">{drill.sub_category}</td>
                <td className="px-4 py-3">
                  <span className="text-xs font-mono text-gray-300 bg-gray-700 px-2 py-0.5 rounded">
                    {drill.shot_type}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-300 font-mono">
                  {drill.shot_density.toFixed(1)}
                  <span className="text-gray-600 text-xs"> /min</span>
                </td>
                <td className="px-4 py-3">
                  <IntensityPips level={drill.intensity} />
                </td>
                <td className="px-4 py-3">
                  {drill.video_url ? (
                    <a
                      href={drill.video_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-mustang-red hover:text-orange-300 transition-colors text-xs"
                    >
                      <ExternalLink size={13} /> View
                    </a>
                  ) : (
                    <span className="text-gray-600 flex items-center gap-1 text-xs">
                      <Video size={13} /> —
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showForm && (
        <DrillForm onSave={handleSave} onClose={() => setShowForm(false)} />
      )}
    </DashboardLayout>
  );
}
