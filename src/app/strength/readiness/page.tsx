"use client";
import { useState, useEffect, useMemo } from "react";
import { Loader2, Zap } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { TrafficLightBadge, READINESS_LABELS } from "@/components/strength/TrafficLightBadge";
import { autoReadinessStatus, readinessLoadFactor } from "@/lib/strength-utils";
import type { ReadinessScore } from "@/types/strength";

export default function ReadinessPage() {
  const [sleep, setSleep]       = useState(7);
  const [soreness, setSoreness] = useState(3);
  const [energy, setEnergy]     = useState(7);
  const [notes, setNotes]       = useState("");
  const [submitting, setSub]    = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [history, setHistory]   = useState<ReadinessScore[]>([]);
  const [playerId, setPlayerId] = useState<string | null>(null);

  const status = useMemo(() => autoReadinessStatus(sleep, soreness, energy), [sleep, soreness, energy]);
  const loadPct = Math.round(readinessLoadFactor(status) * 100);

  useEffect(() => {
    // Get current user's player_id from their profile
    fetch("/api/auth/me").then(r => r.json()).then(d => {
      if (d?.player_id) {
        setPlayerId(d.player_id);
        fetch(`/api/strength/readiness?player_id=${d.player_id}&days=14`)
          .then(r => r.json()).then(h => setHistory(Array.isArray(h) ? h : []));
      }
    }).catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!playerId) return;
    setSub(true);
    try {
      const res = await fetch("/api/strength/readiness", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ player_id: playerId, sleep_hours: sleep, soreness, energy, notes }),
      });
      if (res.ok) setSubmitted(true);
    } finally {
      setSub(false);
    }
  }

  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  return (
    <DashboardLayout>
      <div className="max-w-lg">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0">
            <Zap size={18} className="text-purple-400" />
          </div>
          <div>
            <h1 className="text-white text-2xl font-bold tracking-tight">Daily Readiness</h1>
            <p className="text-gray-400 text-sm font-mono">{today.toUpperCase()}</p>
          </div>
        </div>

        {submitted ? (
          <div className="bg-gray-800 border border-gray-700 rounded-2xl p-8 flex flex-col items-center gap-4 text-center">
            <TrafficLightBadge status={status} size="lg" pulse />
            <div>
              <p className="text-white font-semibold text-lg">{READINESS_LABELS[status]}</p>
              <p className="text-gray-400 text-sm mt-1">Today&apos;s recommended load: <span className="text-white font-bold">{loadPct}%</span></p>
              {status === "red" && <p className="text-red-400 text-xs font-mono mt-2">Consider a recovery session today.</p>}
              {status === "yellow" && <p className="text-yellow-400 text-xs font-mono mt-2">Reduce intensity by ~10% today.</p>}
            </div>
            <button type="button" onClick={() => setSubmitted(false)} className="text-xs text-gray-500 hover:text-white transition-colors">
              Edit response
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-gray-800 border border-gray-700 rounded-2xl p-6 flex flex-col gap-6">
            {/* Live status preview */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-gray-500 uppercase tracking-wider">Status Preview</span>
              <TrafficLightBadge status={status} showLabel />
            </div>

            <Slider label="Sleep Last Night" value={sleep} min={0} max={12} step={0.5}
              unit="hrs" display={sleep.toFixed(1)}
              color={sleep >= 7 ? "bg-green-500" : sleep >= 5 ? "bg-yellow-400" : "bg-red-500"}
              onChange={setSleep} />

            <Slider label="Muscle Soreness" value={soreness} min={1} max={10} step={1}
              unit="/10" display={String(soreness)}
              color={soreness <= 3 ? "bg-green-500" : soreness <= 6 ? "bg-yellow-400" : "bg-red-500"}
              onChange={setSoreness} />

            <Slider label="Energy Level" value={energy} min={1} max={10} step={1}
              unit="/10" display={String(energy)}
              color={energy >= 7 ? "bg-green-500" : energy >= 5 ? "bg-yellow-400" : "bg-red-500"}
              onChange={setEnergy} />

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-mono text-gray-400 uppercase tracking-wider">Notes (optional)</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={2}
                placeholder="Anything worth noting today…"
                className="bg-gray-700/60 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-coaches-red resize-none"
              />
            </div>

            <div className="flex items-center justify-between">
              <p className="text-xs font-mono text-gray-500">Recommended load today: <span className="text-white">{loadPct}%</span></p>
              <button
                type="submit"
                disabled={submitting || !playerId}
                className="flex items-center gap-2 bg-coaches-red hover:bg-coaches-red-dark disabled:opacity-40 text-white text-sm font-semibold px-5 py-2 rounded-lg transition-colors"
              >
                {submitting && <Loader2 size={14} className="animate-spin" />}
                Submit
              </button>
            </div>
          </form>
        )}

        {/* 14-day history */}
        {history.length > 0 && (
          <div className="mt-6">
            <p className="text-[10px] font-mono text-gray-600 uppercase tracking-widest mb-3">14-Day History</p>
            <div className="flex gap-1.5 flex-wrap">
              {history.slice(0, 14).map(r => (
                <div key={r.id} title={r.score_date} className="flex flex-col items-center gap-1">
                  <TrafficLightBadge status={r.status} size="sm" />
                  <span className="text-[8px] font-mono text-gray-600">
                    {new Date(r.score_date + "T00:00:00").toLocaleDateString("en-US", { month: "numeric", day: "numeric" })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

function Slider({ label, value, min, max, step, unit, display, color, onChange }: {
  label: string; value: number; min: number; max: number; step: number;
  unit: string; display: string; color: string; onChange: (v: number) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-mono text-gray-400 uppercase tracking-wider">{label}</label>
        <span className="text-sm font-bold text-white font-mono">{display} <span className="text-gray-500 font-normal text-xs">{unit}</span></span>
      </div>
      <div className="relative">
        <input type="range" min={min} max={max} step={step} value={value}
          onChange={e => onChange(Number(e.target.value))}
          className="w-full h-2 rounded-lg appearance-none bg-gray-700 cursor-pointer accent-coaches-red"
        />
        <div
          className={`absolute left-0 top-0 h-2 rounded-lg pointer-events-none transition-all ${color}`}
          style={{ width: `${((value - min) / (max - min)) * 100}%` }}
        />
      </div>
    </div>
  );
}
