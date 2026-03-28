"use client";

import { useState, useMemo, useRef } from "react";
import { Search, Plus, Check } from "lucide-react";
import { Drill, INTENSITY_TIERS, IntensityLevel } from "@/types/drill";
import { useDrillCategories, hexToRgba } from "@/context/DrillCategoryContext";
import { useDrillObjectives } from "@/context/DrillObjectivesContext";

interface Props {
  drills: Drill[];
  onAdd: (drill: Drill) => void;
  onNewDrill?: () => void;
}

function IntensityDots({ level }: { level: IntensityLevel }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3].map((n) => (
        <span key={n} className={`w-1.5 h-1.5 rounded-full ${n <= level ? "bg-coaches-blue" : "bg-gray-600"}`} />
      ))}
    </div>
  );
}

export default function DrillPicker({ drills, onAdd, onNewDrill }: Props) {
  const { getCatColor } = useDrillCategories();
  const { getObjColor } = useDrillObjectives();
  const [query,      setQuery]      = useState("");
  const [filterCats, setFilterCats] = useState<Set<string>>(new Set());
  const [addedId,    setAddedId]    = useState<string | null>(null);
  const addedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const categories = useMemo(
    () => Array.from(new Set(drills.flatMap((d) => d.categories ?? []))).sort(),
    [drills]
  );

  function toggleCat(cat: string) {
    setFilterCats((prev) => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });
  }

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return drills
      .filter((d) => {
        const matchesSearch = !q || d.name.toLowerCase().includes(q) ||
          (d.categories ?? []).some((c) => c.toLowerCase().includes(q));
        const matchesCat = filterCats.size === 0 ||
          [...filterCats].some((c) => (d.categories ?? []).includes(c));
        return matchesSearch && matchesCat;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [drills, query, filterCats]);

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-2xl flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-gray-700 shrink-0 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <p className="text-white font-semibold text-sm">Drill Vault</p>
          {onNewDrill && (
            <button type="button" onClick={onNewDrill}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-coaches-red/10 hover:bg-coaches-red border border-coaches-red/30 hover:border-coaches-red text-coaches-red hover:text-white text-[11px] font-semibold transition-colors">
              <Plus size={11} /> New
            </button>
          )}
        </div>
        {/* Search */}
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input type="text" placeholder="Search drills…" value={query} onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-gray-700/60 border border-gray-600 rounded-lg pl-8 pr-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-coaches-red transition-colors" />
        </div>
        {/* Category chips — multi-select */}
        <div className="flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
          {categories.map((cat) => {
            const active = filterCats.has(cat);
            const color  = getCatColor(cat);
            return (
              <button key={cat} type="button" onClick={() => toggleCat(cat)}
                className="shrink-0 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors"
                style={active
                  ? { color, backgroundColor: hexToRgba(color, 0.2), borderColor: hexToRgba(color, 0.5) }
                  : { color: "rgb(156 163 175)", backgroundColor: "transparent", borderColor: "rgb(75 85 99)" }}>
                {cat}
              </button>
            );
          })}
          {filterCats.size > 0 && (
            <button type="button" onClick={() => setFilterCats(new Set())}
              className="shrink-0 px-2 py-1 rounded-full text-[10px] font-mono text-gray-600 hover:text-white border border-gray-700 hover:border-gray-500 transition-colors">
              × all
            </button>
          )}
        </div>
        <p className="text-gray-600 text-[10px] font-mono text-right">{filtered.length} of {drills.length}</p>
      </div>

      {/* List */}
      <ul className="flex-1 overflow-y-auto p-2 flex flex-col gap-1">
        {filtered.map((drill) => (
          <li key={drill.id}
            className="flex items-center gap-2 bg-gray-700/40 hover:bg-gray-700/80 border border-transparent hover:border-gray-600 rounded-xl px-3 py-2.5 transition-colors group">
            <div className="flex-1 min-w-0">
              {/* Row 1: name + intensity */}
              <div className="flex items-center gap-2">
                <p className="text-white text-xs font-medium truncate flex-1">{drill.name}</p>
                <div className="flex items-center gap-1 shrink-0">
                  <IntensityDots level={drill.intensity} />
                </div>
              </div>
              {/* Row 2: category + objective chips */}
              <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                {(drill.categories ?? []).map((cat) => (
                  <span key={cat} className="text-[9px] font-semibold px-1.5 py-px rounded-full border"
                    style={{ color: getCatColor(cat), backgroundColor: hexToRgba(getCatColor(cat), 0.1), borderColor: hexToRgba(getCatColor(cat), 0.2) }}>
                    {cat}
                  </span>
                ))}
                {(drill.objectives ?? []).slice(0, 2).map((o) => (
                  <span key={o} className="text-[9px] font-semibold px-1.5 py-px rounded-full border"
                    style={{ color: getObjColor(o), backgroundColor: hexToRgba(getObjColor(o), 0.1), borderColor: hexToRgba(getObjColor(o), 0.2) }}>
                    {o}
                  </span>
                ))}
              </div>
            </div>
            <button type="button"
              onClick={() => {
                onAdd(drill);
                setAddedId(drill.id);
                if (addedTimer.current) clearTimeout(addedTimer.current);
                addedTimer.current = setTimeout(() => setAddedId(null), 1500);
              }}
              className={`w-7 h-7 rounded-lg border flex items-center justify-center transition-colors shrink-0 ${
                addedId === drill.id
                  ? "bg-green-500 border-green-500 text-white"
                  : "bg-coaches-red/0 hover:bg-coaches-red border-coaches-red/30 hover:border-coaches-red text-coaches-red hover:text-white"
              }`}>
              {addedId === drill.id ? <Check size={14} /> : <Plus size={14} />}
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
        <p className="text-gray-600 text-[10px] font-mono text-center">TAP + TO ADD TO PLAN</p>
      </div>
    </div>
  );
}
