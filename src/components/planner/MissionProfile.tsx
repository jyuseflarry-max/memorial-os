"use client";

import { SessionDrill } from "@/types/session";
import { useDrillCategories } from "@/context/DrillCategoryContext";

interface Props {
  drills: SessionDrill[];
}

// ── Analytics computation ─────────────────────────────────────────────────

function computeProfile(drills: SessionDrill[]) {
  const totalTime = drills.reduce((s, d) => s + d.duration, 0);
  const catTime: Record<string, number> = {};
  for (const sd of drills) {
    const cat = sd.drill.categories?.[0] ?? "Other";
    catTime[cat] = (catTime[cat] ?? 0) + sd.duration;
  }
  return { totalTime, catTime };
}

// ── Component ─────────────────────────────────────────────────────────────

export default function MissionProfile({ drills }: Props) {
  const { getCatColor } = useDrillCategories();

  if (drills.length === 0) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-2xl p-5 flex flex-col items-center justify-center gap-2 min-h-[200px]">
        <p className="text-gray-600 text-xs text-center">
          Add drills to see live analytics
        </p>
      </div>
    );
  }

  const { totalTime, catTime } = computeProfile(drills);

  const sortedCats = Object.entries(catTime).sort((a, b) => b[1] - a[1]);

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-2xl p-5 flex flex-col gap-3">
      <p className="text-gray-400 text-xs font-mono uppercase tracking-wider">
        Time Allocation
      </p>

      {/* Stacked bar */}
      <div className="h-3 rounded-full overflow-hidden flex gap-px bg-gray-700">
        {sortedCats.map(([cat, minutes]) => (
          <div
            key={cat}
            className="h-full transition-all duration-300"
            style={{ width: `${(minutes / totalTime) * 100}%`, backgroundColor: getCatColor(cat) }}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-col gap-1.5">
        {sortedCats.map(([cat, minutes]) => {
          const pct = Math.round((minutes / totalTime) * 100);
          return (
            <div key={cat} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: getCatColor(cat) }} />
                <span className="text-gray-300 text-xs">{cat}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-500 text-xs font-mono">{minutes}m</span>
                <span className="text-xs font-bold font-mono" style={{ color: getCatColor(cat) }}>
                  {pct}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
