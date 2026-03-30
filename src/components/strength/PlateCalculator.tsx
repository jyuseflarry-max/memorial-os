"use client";
import { useState, useMemo } from "react";
import { calcPlates, PLATE_COLORS } from "@/lib/strength-utils";

export function PlateCalculator({ availablePlateKeys }: { availablePlateKeys?: string[] }) {
  const [target, setTarget] = useState(135);
  const [bar, setBar]       = useState<45 | 35>(45);

  const config = useMemo(() => calcPlates(target, bar, availablePlateKeys), [target, bar, availablePlateKeys]);

  // Expand plates per side into an array for visualization
  const plateArray = config.platesPerSide.flatMap(p => Array(p.count).fill(p.weight) as number[]);

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-2xl p-5 flex flex-col gap-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-mono text-gray-500 uppercase tracking-wider">Target (lbs)</label>
          <input
            type="number"
            value={target}
            min={barWeightMin(bar)}
            step={5}
            onChange={e => setTarget(Number(e.target.value))}
            className="w-28 bg-gray-800 border border-gray-600 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-coaches-red"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-mono text-gray-500 uppercase tracking-wider">Bar</label>
          <div className="flex bg-gray-800 border border-gray-700 rounded-lg p-0.5 gap-0.5">
            {([45, 35] as const).map(w => (
              <button
                key={w}
                type="button"
                onClick={() => setBar(w)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${bar === w ? "bg-gray-600 text-white" : "text-gray-400 hover:text-white"}`}
              >
                {w} lb
              </button>
            ))}
          </div>
        </div>
        <div className="ml-auto text-right">
          <p className="text-xs font-mono text-gray-500">Rounded</p>
          <p className="text-xl font-bold text-white">{config.roundedTarget} <span className="text-sm text-gray-400">lbs</span></p>
        </div>
      </div>

      {/* Visual barbell */}
      <div className="flex items-center justify-center gap-1 py-2 overflow-x-auto">
        {/* Collar left */}
        <div className="w-2.5 h-10 bg-gray-500 rounded-sm shrink-0" />
        {/* Plates left (reverse order — closest to bar first in display = largest outer) */}
        {[...plateArray].reverse().map((w, i) => (
          <PlateBlock key={i} weight={w} />
        ))}
        {/* Bar */}
        <div className="px-4 h-5 bg-gray-600 rounded-sm flex items-center justify-center shrink-0 min-w-[80px]">
          <span className="text-[9px] font-mono text-gray-300">{bar}lb bar</span>
        </div>
        {/* Plates right */}
        {plateArray.map((w, i) => (
          <PlateBlock key={i} weight={w} />
        ))}
        {/* Collar right */}
        <div className="w-2.5 h-10 bg-gray-500 rounded-sm shrink-0" />
      </div>

      {/* Plate list */}
      {config.platesPerSide.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {config.platesPerSide.map(({ weight, count }) => (
            <span
              key={weight}
              className="px-2.5 py-1 rounded-lg text-xs font-mono font-semibold"
              style={{ backgroundColor: PLATE_COLORS[weight]?.bg ?? "#374151", color: PLATE_COLORS[weight]?.text ?? "#fff" }}
            >
              {count} × {weight}
            </span>
          ))}
          <span className="text-xs font-mono text-gray-400 self-center">per side</span>
        </div>
      ) : (
        <p className="text-xs font-mono text-gray-500">Bar only</p>
      )}

      {!config.achievable && (
        <p className="text-xs font-mono text-yellow-400">⚠ Cannot load exactly — closest available: {config.roundedTarget} lbs</p>
      )}
    </div>
  );
}

function PlateBlock({ weight }: { weight: number }) {
  const colors = PLATE_COLORS[weight] ?? { bg: "#374151", text: "#fff" };
  const height = Math.min(64, 28 + weight / 3);
  return (
    <div
      className="rounded-sm shrink-0 flex items-center justify-center"
      style={{ width: 14, height, backgroundColor: colors.bg }}
    >
      <span className="text-[7px] font-bold leading-none" style={{ color: colors.text, writingMode: "vertical-rl" }}>
        {weight}
      </span>
    </div>
  );
}

function barWeightMin(bar: number) { return bar + 5; }
