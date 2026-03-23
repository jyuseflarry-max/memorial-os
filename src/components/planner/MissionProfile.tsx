"use client";

import { SessionDrill, totalShots } from "@/types/session";
import { DrillCategory } from "@/types/drill";

// ── Category styling ──────────────────────────────────────────────────────

const CAT_STYLE: Record<DrillCategory, { bar: string; text: string; dot: string }> = {
  [DrillCategory.Defense]:       { bar: "bg-blue-400",   text: "text-blue-400",   dot: "bg-blue-400" },
  [DrillCategory.Offense]:       { bar: "bg-green-400",  text: "text-green-400",  dot: "bg-green-400" },
  [DrillCategory.Transition]:    { bar: "bg-yellow-400", text: "text-yellow-400", dot: "bg-yellow-400" },
  [DrillCategory.SpecialTeams]:  { bar: "bg-purple-400", text: "text-purple-400", dot: "bg-purple-400" },
  [DrillCategory.RestTransition]:{ bar: "bg-sky-400",    text: "text-sky-400",    dot: "bg-sky-400" },
};

interface Props {
  drills: SessionDrill[];
}

// ── Analytics computation ─────────────────────────────────────────────────

function computeProfile(drills: SessionDrill[]) {
  const totalTime = drills.reduce((s, d) => s + d.duration, 0);
  const shots = Math.round(totalShots(drills));

  // Category time map
  const catTime: Partial<Record<DrillCategory, number>> = {};
  for (const sd of drills) {
    catTime[sd.drill.category] = (catTime[sd.drill.category] ?? 0) + sd.duration;
  }

  // Sub-category map — skip drills with no sub_category set
  const subCat: Record<
    string,
    { time: number; shots: number; category: DrillCategory }
  > = {};
  for (const sd of drills) {
    const key = sd.drill.sub_category?.trim();
    if (!key) continue;
    if (!subCat[key]) subCat[key] = { time: 0, shots: 0, category: sd.drill.category };
    subCat[key].time += sd.duration;
    subCat[key].shots += Math.round(sd.drill.shot_density * sd.duration);
  }

  return { totalTime, shots, catTime, subCat };
}

// ── Component ─────────────────────────────────────────────────────────────

export default function MissionProfile({ drills }: Props) {
  if (drills.length === 0) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-2xl p-5 flex flex-col items-center justify-center gap-2 min-h-[200px]">
        <p className="text-gray-500 text-sm font-medium">Mission Profile</p>
        <p className="text-gray-600 text-xs text-center">
          Add drills to see live analytics
        </p>
      </div>
    );
  }

  const { totalTime, shots, catTime, subCat } = computeProfile(drills);

  const sortedCats = (Object.entries(catTime) as [DrillCategory, number][]).sort(
    (a, b) => b[1] - a[1]
  );

  const sortedSubCats = Object.entries(subCat).sort((a, b) => b[1].time - a[1].time);
  const maxSubTime = sortedSubCats[0]?.[1].time ?? 1;

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-2xl p-5 flex flex-col gap-5">
      <p className="text-white font-semibold text-sm">Mission Profile</p>

      {/* ── Time Allocation ── */}
      <div className="flex flex-col gap-3">
        <p className="text-gray-400 text-xs font-mono uppercase tracking-wider">
          Time Allocation
        </p>

        {/* Stacked bar */}
        <div className="h-3 rounded-full overflow-hidden flex gap-px bg-gray-700">
          {sortedCats.map(([cat, minutes]) => (
            <div
              key={cat}
              className={`h-full transition-all duration-300 ${CAT_STYLE[cat].bar}`}
              style={{ width: `${(minutes / totalTime) * 100}%` }}
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
                  <span className={`w-2 h-2 rounded-full shrink-0 ${CAT_STYLE[cat].dot}`} />
                  <span className="text-gray-300 text-xs">{cat}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 text-xs font-mono">{minutes}m</span>
                  <span className={`text-xs font-bold font-mono ${CAT_STYLE[cat].text}`}>
                    {pct}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Projected Shot Volume ── */}
      <div className="bg-mustang-red/10 border border-mustang-red/20 rounded-xl px-4 py-3 flex items-center justify-between">
        <div>
          <p className="text-orange-300 text-xs font-mono uppercase tracking-wider mb-0.5">
            Projected Shot Volume
          </p>
          <p className="text-white text-xs font-mono">
            {totalTime} min · {drills.length} drills
          </p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold font-mono text-mustang-red">{shots}</p>
          <p className="text-orange-300 text-[10px] font-mono">SHOTS</p>
        </div>
      </div>

      {/* ── Sub-Category Breakdown ── */}
      <div className="flex flex-col gap-2">
        <p className="text-gray-400 text-xs font-mono uppercase tracking-wider">
          Skills Breakdown
        </p>
        {sortedSubCats.map(([subCatName, data]) => (
          <div key={subCatName} className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${CAT_STYLE[data.category].dot}`} />
                <span className="text-gray-300 text-xs">{subCatName}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-500 text-[10px] font-mono">{data.shots} shots</span>
                <span className="text-gray-400 text-[10px] font-mono">{data.time}m</span>
              </div>
            </div>
            <div className="h-1 bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${CAT_STYLE[data.category].bar}`}
                style={{ width: `${(data.time / maxSubTime) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
