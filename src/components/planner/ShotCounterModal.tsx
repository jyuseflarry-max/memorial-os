"use client";

import { useState, useEffect, useRef } from "react";
import { X, Target, Square, ChevronUp, ChevronDown, RotateCcw, Check, Loader2 } from "lucide-react";
import type { Drill } from "@/types/drill";

// ── Helpers ───────────────────────────────────────────────────────────────

function fmtTime(s: number) {
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

function round1(n: number) { return Math.round(n * 10) / 10; }

function weightedAverage(oldAvg: number, oldSessions: number, newRate: number): number {
  if (oldSessions === 0) return newRate;
  const weight = Math.min(oldSessions, 10);
  return (oldAvg * weight + newRate) / (weight + 1);
}

// ── Props ─────────────────────────────────────────────────────────────────

interface Props {
  drill: Drill;
  defaultPlayerCount: number;
  onClose: () => void;
  onSaved?: (newDensity: number) => void;
}

// ── Component ─────────────────────────────────────────────────────────────

type Phase = "ready" | "active" | "results";

export default function ShotCounterModal({ drill, defaultPlayerCount, onClose, onSaved }: Props) {
  const [phase,       setPhase]       = useState<Phase>("ready");
  const [playerCount, setPlayerCount] = useState(Math.max(defaultPlayerCount, 1));
  const [elapsed,     setElapsed]     = useState(0);
  const [shots,       setShots]       = useState(0);
  const [saving,      setSaving]      = useState(false);
  const [saved,       setSaved]       = useState(false);
  const [saveErr,     setSaveErr]     = useState<string | null>(null);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cleanup on unmount
  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); }, []);

  function startCounting() {
    setElapsed(0);
    setShots(0);
    setPhase("active");
    intervalRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
  }

  function endDrill() {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    setPhase("results");
  }

  function restart() {
    setElapsed(0);
    setShots(0);
    setSaved(false);
    setSaveErr(null);
    setPhase("ready");
  }

  const liveRate   = elapsed > 0 ? round1((shots / elapsed) * 60 / Math.max(playerCount, 1)) : 0;
  const elapsedMin = elapsed / 60;
  const finalRate  = elapsedMin > 0 ? round1(shots / elapsedMin / Math.max(playerCount, 1)) : 0;
  const newDensity = round1(weightedAverage(
    drill.shot_density,
    drill.shot_sessions ?? 0,
    finalRate,
  ));

  async function saveResults() {
    setSaving(true);
    setSaveErr(null);
    try {
      const oldSessions = drill.shot_sessions ?? 0;
      const res = await fetch(`/api/drills/${drill.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shot_density: newDensity, shot_sessions: oldSessions + 1 }),
      });
      if (!res.ok) throw new Error("Save failed");
      setSaved(true);
      onSaved?.(newDensity);
    } catch (err) {
      setSaveErr(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full sm:max-w-sm bg-gray-950 border border-gray-800 rounded-t-3xl sm:rounded-2xl overflow-hidden shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div className="min-w-0">
            <p className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">Shot Counter</p>
            <h2 className="text-white font-bold text-base leading-tight truncate">{drill.name}</h2>
          </div>
          <button onClick={onClose} className="text-gray-600 hover:text-white transition-colors shrink-0 ml-3">
            <X size={20} />
          </button>
        </div>

        {/* ── READY phase ── */}
        {phase === "ready" && (
          <div className="px-5 pb-6 flex flex-col gap-5">
            <div className="flex items-center justify-between bg-gray-900 border border-gray-800 rounded-2xl px-4 py-3">
              <p className="text-sm text-gray-400">Players</p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setPlayerCount((n) => Math.max(1, n - 1))}
                  className="w-8 h-8 rounded-full bg-gray-800 hover:bg-gray-700 flex items-center justify-center transition-colors"
                >
                  <ChevronDown size={16} className="text-white" />
                </button>
                <span className="text-white font-bold text-xl w-6 text-center">{playerCount}</span>
                <button
                  onClick={() => setPlayerCount((n) => n + 1)}
                  className="w-8 h-8 rounded-full bg-gray-800 hover:bg-gray-700 flex items-center justify-center transition-colors"
                >
                  <ChevronUp size={16} className="text-white" />
                </button>
              </div>
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-2xl px-4 py-3">
              <p className="text-[10px] font-mono text-gray-600 uppercase tracking-wider mb-1">Current avg density</p>
              <p className="text-white font-bold text-lg">
                {round1(drill.shot_density)}<span className="text-gray-500 text-sm font-mono"> shots/player/min</span>
              </p>
              {(drill.shot_sessions ?? 0) > 0 && (
                <p className="text-gray-600 text-[10px] font-mono mt-0.5">from {drill.shot_sessions} session{drill.shot_sessions !== 1 ? "s" : ""}</p>
              )}
            </div>

            <button
              onClick={startCounting}
              className="w-full py-4 rounded-2xl text-white font-bold text-lg flex items-center justify-center gap-2 transition-colors"
              style={{ backgroundColor: "#ED1C24" }}
            >
              <Target size={20} />
              Start Counting
            </button>
          </div>
        )}

        {/* ── ACTIVE phase ── */}
        {phase === "active" && (
          <div className="px-5 pb-6 flex flex-col gap-4">
            {/* Timer + live rate */}
            <div className="flex items-center justify-between px-1">
              <span className="text-4xl font-black font-mono text-white tabular-nums">{fmtTime(elapsed)}</span>
              <div className="text-right">
                <p className="text-2xl font-black text-white tabular-nums">{liveRate}</p>
                <p className="text-[10px] font-mono text-gray-500">shots/player/min</p>
              </div>
            </div>

            {/* Big shot button */}
            <button
              onClick={() => setShots((s) => s + 1)}
              className="w-full rounded-2xl flex flex-col items-center justify-center gap-1 py-10 active:scale-95 transition-transform select-none"
              style={{ backgroundColor: "#ED1C24" }}
            >
              <span className="text-7xl font-black text-white tabular-nums leading-none">{shots}</span>
              <span className="text-white/70 text-sm font-semibold uppercase tracking-widest">tap to count</span>
            </button>

            {/* Undo + End */}
            <div className="flex gap-2">
              <button
                onClick={() => setShots((s) => Math.max(0, s - 1))}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-400 hover:text-white text-sm font-semibold transition-colors"
              >
                <RotateCcw size={14} /> Undo
              </button>
              <button
                onClick={endDrill}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white text-sm font-semibold transition-colors"
              >
                <Square size={14} /> End Drill
              </button>
            </div>
          </div>
        )}

        {/* ── RESULTS phase ── */}
        {phase === "results" && (
          <div className="px-5 pb-6 flex flex-col gap-4">
            {/* Stats */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Shots",         value: shots },
                { label: "Time",          value: fmtTime(elapsed) },
                { label: "Shots/p/min",   value: finalRate },
              ].map(({ label, value }) => (
                <div key={label} className="bg-gray-900 border border-gray-800 rounded-xl px-3 py-2.5 text-center">
                  <p className="text-white font-bold text-lg tabular-nums">{value}</p>
                  <p className="text-gray-600 text-[10px] font-mono uppercase tracking-wider">{label}</p>
                </div>
              ))}
            </div>

            {/* Density update preview */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-mono text-gray-600 uppercase tracking-wider">Shot Density Update</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-gray-500 font-mono text-sm">{round1(drill.shot_density)}</span>
                  <span className="text-gray-700">→</span>
                  <span className="text-white font-bold font-mono text-sm">{newDensity}</span>
                  <span className="text-gray-600 text-xs font-mono">shots/player/min</span>
                </div>
              </div>
            </div>

            {saveErr && (
              <p className="text-red-400 text-xs font-mono px-1">{saveErr}</p>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={restart}
                className="px-4 py-2.5 rounded-xl border border-gray-700 text-gray-400 hover:text-white hover:bg-gray-800 text-sm font-semibold transition-colors flex items-center gap-1.5"
              >
                <RotateCcw size={13} /> Redo
              </button>
              <button
                onClick={saveResults}
                disabled={saving || saved}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-colors ${
                  saved
                    ? "bg-green-600/20 border border-green-600/40 text-green-400"
                    : "text-white"
                }`}
                style={saved ? undefined : { backgroundColor: "#ED1C24" }}
              >
                {saving ? (
                  <><Loader2 size={14} className="animate-spin" /> Saving…</>
                ) : saved ? (
                  <><Check size={14} /> Saved to Vault</>
                ) : (
                  "Save to Drill Vault"
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
