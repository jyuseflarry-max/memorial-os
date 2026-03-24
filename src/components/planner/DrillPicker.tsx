"use client";

import { useState, useMemo } from "react";
import { Search, Plus } from "lucide-react";
import { Drill } from "@/types/drill";
import { useDrillCategories, hexToRgba } from "@/context/DrillCategoryContext";

interface Props {
  drills: Drill[];
  onAdd: (drillId: string) => void;
  onNewDrill?: () => void;
}

export default function DrillPicker({ drills, onAdd, onNewDrill }: Props) {
  const { getCatColor } = useDrillCategories();
  const [query,     setQuery]     = useState("");
  const [filterCat, setFilterCat] = useState("All");

  // Unique categories derived from drill list
  const categories = useMemo(
    () => Array.from(new Set(drills.map((d) => d.category))).sort(),
    [drills]
  );

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return drills.filter((d) => {
      const matchesSearch = !q ||
        d.name.toLowerCase().includes(q) ||
        d.category.toLowerCase().includes(q) ||
        d.sub_category.toLowerCase().includes(q);
      const matchesCat = filterCat === "All" || d.category === filterCat;
      return matchesSearch && matchesCat;
    });
  }, [drills, query, filterCat]);

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-2xl flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-gray-700 shrink-0 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <p className="text-white font-semibold text-sm">Drill Vault</p>
          {onNewDrill && (
            <button
              type="button"
              onClick={onNewDrill}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-mustang-red/10 hover:bg-mustang-red border border-mustang-red/30 hover:border-mustang-red text-mustang-red hover:text-white text-[11px] font-semibold transition-colors"
            >
              <Plus size={11} />
              New
            </button>
          )}
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Search drills…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-gray-700/60 border border-gray-600 rounded-lg pl-8 pr-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-mustang-red transition-colors"
          />
        </div>

        {/* Category chips — horizontal scroll */}
        <div className="flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
          {["All", ...categories].map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setFilterCat(cat)}
              className={`shrink-0 px-3 py-1 rounded-full text-[11px] font-semibold border transition-colors ${
                filterCat === cat
                  ? "bg-mustang-red border-mustang-red text-white"
                  : "bg-gray-700/40 border-gray-600 text-gray-400 hover:text-white"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <p className="text-gray-600 text-[10px] font-mono text-right">
          {filtered.length} of {drills.length}
        </p>
      </div>

      {/* List */}
      <ul className="flex-1 overflow-y-auto p-2 flex flex-col gap-1">
        {filtered.map((drill) => (
          <li key={drill.id} className="flex items-center gap-2 bg-gray-700/40 hover:bg-gray-700/80 border border-transparent hover:border-gray-600 rounded-xl px-3 py-2.5 transition-colors group">
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-medium truncate">{drill.name}</p>
              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                <span
                  className="text-[10px] font-semibold px-1.5 py-px rounded-full border"
                  style={{
                    color: getCatColor(drill.category),
                    backgroundColor: hexToRgba(getCatColor(drill.category), 0.1),
                    borderColor: hexToRgba(getCatColor(drill.category), 0.2),
                  }}
                >
                  {drill.category}
                </span>
                {drill.sub_category && (
                  <span className="text-gray-500 text-[10px] font-mono truncate">{drill.sub_category}</span>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => onAdd(drill.id)}
              className="w-7 h-7 rounded-lg bg-mustang-red/0 hover:bg-mustang-red border border-mustang-red/30 hover:border-mustang-red text-mustang-red hover:text-white flex items-center justify-center transition-colors shrink-0"
            >
              <Plus size={14} />
            </button>
          </li>
        ))}
        {filtered.length === 0 && (
          <li className="text-center py-8 text-gray-600 text-xs font-mono">
            {drills.length === 0 ? "LOADING DRILLS…" : "NO DRILLS MATCH"}
          </li>
        )}
      </ul>

      <div className="px-4 py-2 border-t border-gray-700 shrink-0">
        <p className="text-gray-600 text-[10px] font-mono text-center">
          TAP + TO ADD TO PLAN
        </p>
      </div>
    </div>
  );
}
