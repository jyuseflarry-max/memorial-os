"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Play, Square, Target, ChevronDown, RotateCcw,
  CheckCircle2, Loader2, TrendingUp,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import type { Drill } from "@/types/drill";

// ── Helpers ────────────────────────────────────────────────────────────────

function fmtTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** Weighted running average — new session gets equal weight to all prior sessions combined
 *  up to a cap of 10 sessions, then each new session is 1/10th. */
function weightedAverage(oldAvg: number, oldSessions: number, newRate: number): number {
  if (oldSessions === 0) return newRate;
  const weight = Math.min(oldSessions, 10);
  return (oldAvg * weight + newRate) / (weight + 1);
}

// ── Page states ────────────────────────────────────────────────────────────

type Phase = "setup" | "active" | "results";

interface Results {
  drill: Drill;
  totalShots: number;
  elapsedSeconds: number;
  playerCount: number;
  shotsPerPlayerPerMin: number;
  newDensity: number;
  newSessions: number;
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function ShotCounterPage() {
  const [drills,  setDrills]  = useState<Drill[]>([]);
  const [loading, setLoading] = useState(true);

  const [phase,       setPhase]       = useState<Phase>("setup");
  const [selectedId,  setSelectedId]  = useState<string>("");
  const [playerCount, setPlayerCount] = useState<number>(5);

  // Active phase state
  const [elapsed, setElapsed] = useState(0);
  const [shots,   setShots]   = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Results phase state
  const [results,  setResults]  = useState<Results | null>(null);
  const [saving,   setSaving]   = useState(false);
  const [saved,    setSaved]    = useState(false);
  const [saveErr,  setSaveErr]  = useState<string | null>(null);

  // Load drills
  useEffect(() => {
    fetch("/api/drills")
      .then((r) => r.json())
      .then((d) => setDrills(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false));
  }, []);

  // Cleanup interval on unmount
  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); }, []);

  const selectedDrill = drills.find((d) => d.id === selectedId) ?? null;

  // Live shots/player/min
  const liveRate = elapsed > 0 ? round1((shots / elapsed) * 60 / Math.max(playerCount, 1)) : 0;

  // ── Controls ──────────────────────────────────────────────────────────────

  function handleStart() {
    setElapsed(0);
    setShots(0);
    setPhase("active");
    intervalRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
  }

  const handleStop = useCallback(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    if (!selectedDrill) return;

    const elapsedSecs  = elapsed;
    const totalShots   = shots;
    const players      = Math.max(playerCount, 1);
    const rate         = elapsedSecs > 0 ? (totalShots / elapsedSecs) * 60 / players : 0;
    const oldDensity   = selectedDrill.shot_density   ?? 0;
    const oldSessions  = selectedDrill.shot_sessions  ?? 0;
    const newDensity   = round1(weightedAverage(oldDensity, oldSessions, rate));
    const newSessions  = oldSessions + 1;

    setResults({
      drill: selectedDrill,
      totalShots,
      elapsedSeconds: elapsedSecs,
      playerCount: players,
      shotsPerPlayerPerMin: round1(rate),
      newDensity,
      newSessions,
    });
    setSaved(false);
    setSaveErr(null);
    setPhase("results");
  }, [elapsed, shots, playerCount, selectedDrill]);

  // Increment shot — exposed as stable callback so the button re-render is minimal
  const addShot = useCallback(() => setShots((s) => s + 1), []);

  async function handleSave() {
    if (!results) return;
    setSaving(true);
    setSaveErr(null);
    const res = await fetch(`/api/drills/${results.drill.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        shot_density:  results.newDensity,
        shot_sessions: results.newSessions,
      }),
    });
    const data = await res.json();
    if (!res.ok) { setSaveErr(data.error ?? "Save failed"); setSaving(false); return; }

    // Update local drill list so the dropdown reflects new values immediately
    setDrills((prev) => prev.map((d) => d.id === results.drill.id
      ? { ...d, shot_density: results.newDensity, shot_sessions: results.newSessions }
      : d
    ));
    setSaving(false);
    setSaved(true);
  }

  function handleReset() {
    setPhase("setup");
    setResults(null);
    setSaved(false);
    setSaveErr(null);
    setElapsed(0);
    setShots(0);
  }

  // ── Render: Setup ─────────────────────────────────────────────────────────

  if (phase === "setup") {
    return (
      <DashboardLayout>
        <div className="max-w-md mx-auto">
          <div className="mb-8">
            <h1 className="text-white text-2xl font-bold tracking-tight">Shot Counter</h1>
            <p className="text-gray-400 text-sm mt-0.5 font-mono">MEASURE SHOTS PER PLAYER PER MINUTE</p>
          </div>

          <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 flex flex-col gap-5">

            {/* Drill selector */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-mono text-gray-400 uppercase tracking-wider">Select Drill</label>
              {loading ? (
                <div className="flex items-center gap-2 text-gray-500 text-sm font-mono">
                  <Loader2 size={14} className="animate-spin" /> Loading drills…
                </div>
              ) : (
                <div className="relative">
                  <select
                    value={selectedId}
                    onChange={(e) => setSelectedId(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-3 text-sm text-white focus:outline-none focus:border-mustang-red transition-colors appearance-none pr-8"
                  >
                    <option value="">— Choose a drill —</option>
                    {drills.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                </div>
              )}
            </div>

            {/* Drill info */}
            {selectedDrill && (
              <div className="bg-gray-900/60 border border-gray-700/50 rounded-xl px-4 py-3 flex flex-col gap-1">
                <p className="text-gray-500 text-[10px] font-mono uppercase tracking-wider mb-1">Current Drill Data</p>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-xs">Shots/player/min</span>
                  <span className="text-white font-mono text-sm font-bold">
                    {selectedDrill.shot_density > 0 ? selectedDrill.shot_density.toFixed(1) : "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-xs">Measurement sessions</span>
                  <span className="text-gray-400 font-mono text-sm">
                    {(selectedDrill.shot_sessions ?? 0) > 0 ? selectedDrill.shot_sessions : "None yet"}
                  </span>
                </div>
              </div>
            )}

            {/* Player count */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-mono text-gray-400 uppercase tracking-wider">Players in This Drill</label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setPlayerCount((n) => Math.max(1, n - 1))}
                  className="w-10 h-10 rounded-lg bg-gray-700 border border-gray-600 text-white text-lg font-bold hover:bg-gray-600 transition-colors flex items-center justify-center"
                >−</button>
                <span className="text-white font-mono text-2xl font-bold w-10 text-center">{playerCount}</span>
                <button
                  type="button"
                  onClick={() => setPlayerCount((n) => Math.min(15, n + 1))}
                  className="w-10 h-10 rounded-lg bg-gray-700 border border-gray-600 text-white text-lg font-bold hover:bg-gray-600 transition-colors flex items-center justify-center"
                >+</button>
              </div>
              <p className="text-[10px] font-mono text-gray-600">Used to calculate per-player rate.</p>
            </div>

            {/* Start button */}
            <button
              onClick={handleStart}
              disabled={!selectedId}
              className="flex items-center justify-center gap-2 w-full py-4 rounded-xl bg-mustang-red hover:bg-mustang-red-dark text-white font-bold text-base transition-colors disabled:opacity-40 disabled:cursor-not-allowed mt-2"
            >
              <Play size={18} fill="currentColor" />
              Start Drill
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // ── Render: Active ────────────────────────────────────────────────────────

  if (phase === "active") {
    return (
      <DashboardLayout>
        <div className="max-w-md mx-auto flex flex-col gap-4">

          {/* Status bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-mustang-red animate-pulse" />
              <span className="text-mustang-red font-mono text-xs font-bold uppercase tracking-widest">Live</span>
            </div>
            <span className="text-gray-400 font-mono text-xs truncate max-w-[200px]">{selectedDrill?.name}</span>
          </div>

          {/* Timer */}
          <div className="bg-gray-800 border border-gray-700 rounded-2xl py-6 text-center">
            <p className="text-gray-600 font-mono text-[10px] uppercase tracking-widest mb-1">Elapsed</p>
            <p className="text-white font-mono text-5xl font-bold tracking-tight">{fmtTime(elapsed)}</p>
          </div>

          {/* Shot count display */}
          <div className="bg-gray-800 border border-gray-700 rounded-2xl py-5 text-center">
            <p className="text-white font-mono text-7xl font-black leading-none">{shots}</p>
            <p className="text-gray-500 font-mono text-xs uppercase tracking-widest mt-2">Total Shots</p>
            {elapsed > 0 && (
              <p className="text-mustang-red font-mono text-sm font-bold mt-1">
                {liveRate} shots/player/min
              </p>
            )}
          </div>

          {/* Counter button — as large as possible for in-practice use */}
          <button
            onClick={addShot}
            className="w-full bg-mustang-red hover:bg-mustang-red-dark active:scale-95 transition-all rounded-2xl flex flex-col items-center justify-center gap-1 select-none"
            style={{ minHeight: "160px" }}
          >
            <Target size={36} className="text-white/80" />
            <span className="text-white font-black text-2xl tracking-tight">+ SHOT</span>
            <span className="text-white/60 font-mono text-xs">tap each time a player shoots</span>
          </button>

          {/* End drill */}
          <button
            onClick={handleStop}
            className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl border border-gray-600 text-gray-300 hover:text-white hover:border-gray-400 font-semibold text-sm transition-colors"
          >
            <Square size={14} fill="currentColor" />
            End Drill
          </button>
        </div>
      </DashboardLayout>
    );
  }

  // ── Render: Results ───────────────────────────────────────────────────────

  if (phase === "results" && results) {
    const improved = results.newDensity > (results.drill.shot_density ?? 0) && (results.drill.shot_sessions ?? 0) > 0;
    const isFirst  = (results.drill.shot_sessions ?? 0) === 0;

    return (
      <DashboardLayout>
        <div className="max-w-md mx-auto">
          <div className="mb-6">
            <h1 className="text-white text-2xl font-bold tracking-tight">Drill Complete</h1>
            <p className="text-gray-400 text-sm mt-0.5 font-mono">{results.drill.name}</p>
          </div>

          {/* Stats */}
          <div className="bg-gray-800 border border-gray-700 rounded-2xl p-5 flex flex-col gap-0 mb-4">
            <p className="text-[10px] font-mono text-gray-500 uppercase tracking-widest mb-3">Session Results</p>
            {[
              { label: "Duration",            value: fmtTime(results.elapsedSeconds) },
              { label: "Total Shots",         value: String(results.totalShots) },
              { label: "Players in Drill",    value: String(results.playerCount) },
              { label: "Shots/Player/Min",    value: `${results.shotsPerPlayerPerMin.toFixed(1)}`, highlight: true },
            ].map(({ label, value, highlight }) => (
              <div key={label} className="flex items-center justify-between py-2.5 border-b border-gray-700/50 last:border-0">
                <span className="text-gray-400 text-sm">{label}</span>
                <span className={`font-mono text-sm font-bold ${highlight ? "text-mustang-red" : "text-white"}`}>{value}</span>
              </div>
            ))}
          </div>

          {/* Drill vault update preview */}
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-5 mb-5">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp size={14} className="text-mustang-red" />
              <p className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">Drill Vault Update</p>
            </div>

            {isFirst ? (
              <p className="text-gray-400 text-sm">
                First measurement for this drill.{" "}
                <span className="text-white font-bold">{results.newDensity.toFixed(1)}</span> shots/player/min will be set as the baseline.
              </p>
            ) : (
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <p className="text-gray-600 text-[10px] font-mono uppercase mb-1">Previous</p>
                  <p className="text-gray-400 font-mono text-xl font-bold">{results.drill.shot_density.toFixed(1)}</p>
                </div>
                <div className="flex-1 border-t border-dashed border-gray-700 relative">
                  <span className={`absolute -top-2.5 left-1/2 -translate-x-1/2 text-[10px] font-mono px-1 ${improved ? "text-emerald-400" : "text-gray-500"}`}>
                    {improved ? "▲" : "▼"}
                  </span>
                </div>
                <div className="text-center">
                  <p className="text-gray-500 text-[10px] font-mono uppercase mb-1">New Average</p>
                  <p className={`font-mono text-xl font-bold ${improved ? "text-emerald-400" : "text-white"}`}>
                    {results.newDensity.toFixed(1)}
                  </p>
                </div>
              </div>
            )}
            <p className="text-gray-600 text-[10px] font-mono mt-3">
              Based on {results.newSessions} session{results.newSessions !== 1 ? "s" : ""} total · weighted running average
            </p>
          </div>

          {saveErr && (
            <p className="text-red-400 text-xs font-mono mb-3">{saveErr}</p>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-3">
            {saved ? (
              <div className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-emerald-600/20 border border-emerald-600/40 text-emerald-400 font-semibold text-sm">
                <CheckCircle2 size={15} />
                Saved to Drill Vault
              </div>
            ) : (
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-mustang-red hover:bg-mustang-red-dark text-white font-bold text-sm transition-colors disabled:opacity-50"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <TrendingUp size={14} />}
                {saving ? "Saving…" : "Save to Drill Vault"}
              </button>
            )}

            <button
              onClick={handleReset}
              className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl border border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 font-semibold text-sm transition-colors"
            >
              <RotateCcw size={14} />
              Count Another Drill
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return null;
}
