"use client";

/**
 * LiftProgressChart — lightweight SVG line chart for estimated 1RM over time.
 * No external dependencies. Fetches its own data given player_id + exercise_id.
 */

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";

interface LiftRecord {
  id: string;
  weight_lbs: number;
  reps: number;
  estimated_1rm: number;
  recorded_at: string;
}

// ── SVG line chart ────────────────────────────────────────────────────────

const W = 560, H = 180;
const PAD = { top: 16, right: 20, bottom: 32, left: 52 };
const innerW = W - PAD.left - PAD.right;
const innerH = H - PAD.top - PAD.bottom;

function Chart({ records, color }: { records: LiftRecord[]; color: string }) {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; record: LiftRecord } | null>(null);

  if (records.length === 0) {
    return (
      <div className="flex items-center justify-center h-28 text-gray-600 text-xs font-mono">
        No lift history yet.
      </div>
    );
  }

  const times  = records.map(r => new Date(r.recorded_at).getTime());
  const values = records.map(r => r.estimated_1rm);
  const minT   = Math.min(...times);
  const maxT   = Math.max(...times);
  const minV   = Math.min(...values);
  const maxV   = Math.max(...values);
  const rangeV = maxV - minV || 1;
  const pad    = rangeV * 0.12;

  function xPx(t: number) {
    if (minT === maxT) return PAD.left + innerW / 2;
    return PAD.left + ((t - minT) / (maxT - minT)) * innerW;
  }
  function yPx(v: number) {
    return PAD.top + innerH - ((v - (minV - pad)) / (rangeV + pad * 2)) * innerH;
  }

  const pts = records.map(r => ({
    x: xPx(new Date(r.recorded_at).getTime()),
    y: yPx(r.estimated_1rm),
    r,
  }));

  const polyline = pts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const area     = `${pts[0].x.toFixed(1)},${(PAD.top + innerH).toFixed(1)} ${polyline} ${pts[pts.length - 1].x.toFixed(1)},${(PAD.top + innerH).toFixed(1)}`;

  // Y-axis tick values (3 evenly spaced)
  const yTicks = [minV - pad, minV - pad + (rangeV + pad * 2) / 2, maxV + pad].map(Math.round);

  // X-axis: show up to 4 evenly distributed date labels
  const xLabelIdxs = records.length <= 4
    ? records.map((_, i) => i)
    : [0, Math.floor(records.length / 3), Math.floor((records.length * 2) / 3), records.length - 1];

  function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        style={{ height: H }}
        onMouseLeave={() => setTooltip(null)}
      >
        {/* Grid lines + Y labels */}
        {yTicks.map((v, i) => {
          const y = yPx(v);
          return (
            <g key={i}>
              <line x1={PAD.left} x2={PAD.left + innerW} y1={y} y2={y}
                stroke="#1f2937" strokeWidth={1} />
              <text x={PAD.left - 6} y={y + 4} textAnchor="end"
                fontSize={10} fill="#4b5563" fontFamily="monospace">
                {v}
              </text>
            </g>
          );
        })}

        {/* X axis labels */}
        {xLabelIdxs.map(i => (
          <text key={i} x={pts[i].x} y={H - 4} textAnchor="middle"
            fontSize={9} fill="#4b5563" fontFamily="monospace">
            {fmtDate(records[i].recorded_at)}
          </text>
        ))}

        {/* Area fill */}
        <polygon points={area} fill={color} fillOpacity={0.08} />

        {/* Line */}
        <polyline points={polyline} fill="none" stroke={color}
          strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

        {/* Data points + hover targets */}
        {pts.map((p, i) => (
          <g key={i}
            onMouseEnter={() => setTooltip({ x: p.x, y: p.y, record: p.r })}
          >
            {/* Invisible larger hit area */}
            <circle cx={p.x} cy={p.y} r={10} fill="transparent" />
            <circle cx={p.x} cy={p.y} r={4} fill={color} stroke="#111827" strokeWidth={1.5} />
          </g>
        ))}
      </svg>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="absolute z-10 pointer-events-none bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs shadow-xl"
          style={{
            left:      `${(tooltip.x / W) * 100}%`,
            top:       `${(tooltip.y / H) * 100}%`,
            transform: "translate(-50%, -115%)",
          }}
        >
          <p className="text-white font-bold">{tooltip.record.estimated_1rm.toFixed(1)} lbs 1RM</p>
          <p className="text-gray-400 font-mono">{tooltip.record.weight_lbs} × {tooltip.record.reps} reps</p>
          <p className="text-gray-600 font-mono">{new Date(tooltip.record.recorded_at).toLocaleDateString()}</p>
        </div>
      )}
    </div>
  );
}

// ── Public component ──────────────────────────────────────────────────────

export default function LiftProgressChart({
  playerId,
  exerciseId,
  exerciseName,
  color = "#e63946",
}: {
  playerId: string;
  exerciseId: string;
  exerciseName?: string;
  color?: string;
}) {
  const [records, setRecords] = useState<LiftRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!playerId || !exerciseId) return;
    setLoading(true);
    fetch(`/api/strength/lifts/history?player_id=${playerId}&exercise_id=${exerciseId}`)
      .then(r => r.ok ? r.json() : [])
      .then(d => { if (Array.isArray(d)) setRecords(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [playerId, exerciseId]);

  const best = records.length > 0
    ? Math.max(...records.map(r => r.estimated_1rm))
    : null;

  const latest = records[records.length - 1] ?? null;
  const first  = records[0] ?? null;
  const gain   = records.length >= 2 && first && latest
    ? latest.estimated_1rm - first.estimated_1rm
    : null;

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between gap-4 flex-wrap">
        <p className="text-white text-sm font-semibold">{exerciseName ?? "Lift Progress"}</p>
        <div className="flex items-center gap-4">
          {best !== null && (
            <div className="text-right">
              <p className="text-[9px] font-mono text-gray-600 uppercase">Best 1RM</p>
              <p className="text-white font-bold text-sm">{best.toFixed(1)} <span className="text-gray-500 font-normal text-xs">lbs</span></p>
            </div>
          )}
          {gain !== null && (
            <div className="text-right">
              <p className="text-[9px] font-mono text-gray-600 uppercase">Total Gain</p>
              <p className={`font-bold text-sm ${gain >= 0 ? "text-green-400" : "text-red-400"}`}>
                {gain >= 0 ? "+" : ""}{gain.toFixed(1)} <span className="font-normal text-xs">lbs</span>
              </p>
            </div>
          )}
          <div className="text-right">
            <p className="text-[9px] font-mono text-gray-600 uppercase">Sessions</p>
            <p className="text-white font-bold text-sm">{records.length}</p>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="p-4">
        {loading
          ? <div className="flex justify-center h-28 items-center">
              <Loader2 size={18} className="animate-spin text-gray-600" />
            </div>
          : <Chart records={records} color={color} />
        }
      </div>
    </div>
  );
}
