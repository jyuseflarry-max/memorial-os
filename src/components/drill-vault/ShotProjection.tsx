"use client";

import { useState } from "react";
import { BarChart2 } from "lucide-react";
import { Drill } from "@/types/drill";

interface Props {
  drills: Drill[];
}

const TEAM_SIZE = 12;

export default function ShotProjection({ drills }: Props) {
  const [drillId, setDrillId] = useState<string>(drills[0]?.id ?? "");
  const [minutes, setMinutes] = useState<number>(10);

  const selected = drills.find((d) => d.id === drillId);
  const perPlayer = selected ? Math.round(selected.shot_density * minutes) : 0;
  const totalShots = perPlayer * TEAM_SIZE;

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-2xl p-5 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <BarChart2 size={18} className="text-coaches-red" />
        <h3 className="text-white font-semibold text-sm">Shot Volume Projection</h3>
      </div>

      {/* Controls */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-mono text-gray-400 mb-1 uppercase tracking-wider">
            Drill
          </label>
          <select
            className="w-full bg-gray-700/60 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-coaches-red transition-colors"
            value={drillId}
            onChange={(e) => setDrillId(e.target.value)}
          >
            {drills.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-mono text-gray-400 mb-1 uppercase tracking-wider">
            Duration (min)
          </label>
          <input
            type="number"
            min={1}
            max={120}
            className="w-full bg-gray-700/60 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-coaches-red transition-colors"
            value={minutes}
            onChange={(e) => setMinutes(Math.max(1, parseInt(e.target.value) || 1))}
          />
        </div>
      </div>

      {/* Output */}
      {selected && (
        <div className="grid grid-cols-3 gap-3">
          {[
            {
              label: "Shots / Player",
              value: perPlayer,
              sub: `@ ${selected.shot_density} shots/min`,
              highlight: true,
            },
            {
              label: "Total Shots",
              value: totalShots,
              sub: `${TEAM_SIZE}-player roster`,
              highlight: false,
            },
            {
              label: "Shot Type",
              value: selected.shot_type,
              sub: undefined,
              highlight: false,
            },
          ].map(({ label, value, sub, highlight }) => (
            <div
              key={label}
              className={`rounded-xl px-4 py-3 flex flex-col gap-0.5 ${
                highlight
                  ? "bg-coaches-red/10 border border-coaches-red/30"
                  : "bg-gray-700/40 border border-gray-700"
              }`}
            >
              <p
                className={`text-2xl font-bold font-mono ${
                  highlight ? "text-coaches-red" : "text-white"
                }`}
              >
                {value}
              </p>
              <p className="text-white text-xs font-semibold">{label}</p>
              <p className="text-gray-500 text-xs">{sub}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
