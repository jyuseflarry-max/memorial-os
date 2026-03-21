"use client";

import { useState } from "react";
import { Search, Plus, GripVertical } from "lucide-react";
import { Drill, DrillCategory } from "@/types/drill";
import { MOCK_DRILLS } from "@/lib/mock-drills";

const CAT_BADGE: Record<DrillCategory, string> = {
  [DrillCategory.Defense]:       "text-blue-400   bg-blue-400/10   border-blue-400/20",
  [DrillCategory.Offense]:       "text-green-400  bg-green-400/10  border-green-400/20",
  [DrillCategory.RestTransition]:"text-sky-400    bg-sky-400/10    border-sky-400/20",
  [DrillCategory.Transition]:  "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
  [DrillCategory.SpecialTeams]:"text-purple-400 bg-purple-400/10 border-purple-400/20",
};

interface Props {
  onAdd: (drillId: string) => void;
}

export default function DrillPicker({ onAdd }: Props) {
  const [query, setQuery] = useState("");

  const filtered = MOCK_DRILLS.filter(
    (d) =>
      d.name.toLowerCase().includes(query.toLowerCase()) ||
      d.category.toLowerCase().includes(query.toLowerCase()) ||
      d.sub_category.toLowerCase().includes(query.toLowerCase())
  );

  function handleDragStart(e: React.DragEvent, drill: Drill) {
    e.dataTransfer.setData("x-drill-id", drill.id);
    e.dataTransfer.effectAllowed = "copy";
  }

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-2xl flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-gray-700 shrink-0">
        <p className="text-white font-semibold text-sm mb-3">Drill Vault</p>
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
      </div>

      {/* List */}
      <ul className="flex-1 overflow-y-auto p-2 flex flex-col gap-1">
        {filtered.map((drill) => (
          <li
            key={drill.id}
            draggable
            onDragStart={(e) => handleDragStart(e, drill)}
            className="flex items-center gap-2 bg-gray-700/40 hover:bg-gray-700/80 border border-transparent hover:border-gray-600 rounded-xl px-3 py-2.5 cursor-grab active:cursor-grabbing transition-colors group"
          >
            <GripVertical size={14} className="text-gray-600 group-hover:text-gray-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-medium truncate">{drill.name}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={`text-[10px] font-semibold px-1.5 py-px rounded-full border ${CAT_BADGE[drill.category]}`}>
                  {drill.category}
                </span>
                <span className="text-gray-500 text-[10px] font-mono">{drill.shot_density}/min</span>
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
          <li className="text-center py-8 text-gray-600 text-xs font-mono">NO DRILLS MATCH</li>
        )}
      </ul>

      <div className="px-4 py-2 border-t border-gray-700 shrink-0">
        <p className="text-gray-600 text-[10px] font-mono text-center">
          DRAG TO TIMELINE OR CLICK +
        </p>
      </div>
    </div>
  );
}
