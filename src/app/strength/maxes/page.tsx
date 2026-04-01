"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Loader2, Plus, X, Check } from "lucide-react";
import type { StrengthExercise } from "@/types/strength";

interface Player {
  id: string;
  name: string;
  jersey_number: number | null;
  team_id: string | null;
}

interface MaxRecord {
  id: string;
  player_id: string;
  exercise_id: string;
  weight_lbs: number;
  reps: number;
  estimated_1rm: number;
  recorded_at: string;
}

// Epley formula preview (matches DB generated column)
function epley(weight: number, reps: number): number {
  if (reps <= 1) return weight;
  return weight * (1 + reps / 30);
}

// ── Log Max Modal ──────────────────────────────────────────────────────────

function LogMaxModal({
  players,
  exercises,
  defaultPlayer,
  defaultExercise,
  onClose,
  onSaved,
}: {
  players: Player[];
  exercises: StrengthExercise[];
  defaultPlayer: string;
  defaultExercise: string;
  onClose: () => void;
  onSaved: (record: MaxRecord) => void;
}) {
  const [playerId,   setPlayerId]   = useState(defaultPlayer);
  const [exerciseId, setExerciseId] = useState(defaultExercise);
  const [weight,     setWeight]     = useState("");
  const [reps,       setReps]       = useState("1");
  const [saving,     setSaving]     = useState(false);

  const preview =
    weight && reps ? epley(parseFloat(weight), parseInt(reps)) : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!playerId || !exerciseId || !weight) return;
    setSaving(true);
    try {
      const res = await fetch("/api/strength/lifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          player_id:   playerId,
          exercise_id: exerciseId,
          weight_lbs:  parseFloat(weight),
          reps:        parseInt(reps) || 1,
        }),
      });
      if (res.ok) {
        const saved = await res.json() as MaxRecord;
        onSaved(saved);
      }
    } finally {
      setSaving(false);
    }
  }

  const inputCls =
    "bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-coaches-red transition-colors w-full";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm bg-gray-900 border border-gray-700 rounded-2xl p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-white font-bold">Log Max</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-mono text-gray-500 uppercase">
              Player
            </label>
            <select
              value={playerId}
              onChange={e => setPlayerId(e.target.value)}
              className={inputCls}
              required
            >
              <option value="">— Select player —</option>
              {players
                .sort((a, b) => (a.jersey_number ?? 99) - (b.jersey_number ?? 99))
                .map(p => (
                  <option key={p.id} value={p.id}>
                    #{p.jersey_number ?? "—"} {p.name}
                  </option>
                ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-mono text-gray-500 uppercase">
              Exercise
            </label>
            <select
              value={exerciseId}
              onChange={e => setExerciseId(e.target.value)}
              className={inputCls}
              required
            >
              <option value="">— Select exercise —</option>
              {exercises.map(ex => (
                <option key={ex.id} value={ex.id}>
                  {ex.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-mono text-gray-500 uppercase">
                Weight (lbs)
              </label>
              <input
                type="number"
                min={1}
                step={2.5}
                value={weight}
                onChange={e => setWeight(e.target.value)}
                placeholder="225"
                className={inputCls}
                required
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-mono text-gray-500 uppercase">
                Reps
              </label>
              <input
                type="number"
                min={1}
                max={30}
                value={reps}
                onChange={e => setReps(e.target.value)}
                className={inputCls}
              />
            </div>
          </div>

          {/* Live 1RM preview */}
          {preview !== null && (
            <div className="bg-gray-800/60 border border-gray-700 rounded-xl px-4 py-3 flex items-center justify-between">
              <span className="text-gray-400 text-xs font-mono">
                Estimated 1RM
              </span>
              <span className="text-white font-bold text-lg">
                {preview.toFixed(1)}{" "}
                <span className="text-gray-500 text-sm font-normal">lbs</span>
              </span>
            </div>
          )}

          <button
            type="submit"
            disabled={saving || !playerId || !exerciseId || !weight}
            className="flex items-center justify-center gap-2 bg-coaches-red hover:bg-coaches-red-dark disabled:opacity-40 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors mt-1"
          >
            {saving ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Check size={14} />
            )}
            {saving ? "Saving…" : "Save Max"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function MaxesPage() {
  const [players,       setPlayers]       = useState<Player[]>([]);
  const [exercises,     setExercises]     = useState<StrengthExercise[]>([]);
  const [maxes,         setMaxes]         = useState<MaxRecord[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [selectedEx,    setSelectedEx]    = useState<string>("");
  const [modalOpen,     setModalOpen]     = useState(false);
  const [modalPlayer,   setModalPlayer]   = useState("");
  const [modalExercise, setModalExercise] = useState("");

  // Only primary lifts for the exercise filter tabs
  const primaryLifts = exercises
    .filter(ex => ex.is_primary_lift)
    .sort((a, b) => a.name.localeCompare(b.name));

  useEffect(() => {
    Promise.all([
      fetch("/api/strength/maxes").then(r => r.json()),
      fetch("/api/strength/exercises").then(r => r.json()),
      fetch("/api/players").then(r => r.json()),
    ])
      .then(([mx, ex, pl]) => {
        if (Array.isArray(mx)) setMaxes(mx as MaxRecord[]);
        if (Array.isArray(ex)) {
          setExercises(ex as StrengthExercise[]);
          const first = (ex as StrengthExercise[])
            .filter(e => e.is_primary_lift)
            .sort((a, b) => a.name.localeCompare(b.name))[0];
          if (first) setSelectedEx(first.id);
        }
        if (Array.isArray(pl)) setPlayers(pl as Player[]);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function openModal(playerId = "", exerciseId = "") {
    setModalPlayer(playerId);
    setModalExercise(exerciseId || selectedEx);
    setModalOpen(true);
  }

  function onSaved(record: MaxRecord) {
    setMaxes(prev => {
      const existing = prev.find(
        m => m.player_id === record.player_id && m.exercise_id === record.exercise_id,
      );
      if (existing && record.estimated_1rm >= existing.estimated_1rm) {
        return prev.map(m =>
          m.player_id === record.player_id && m.exercise_id === record.exercise_id
            ? record
            : m,
        );
      }
      if (!existing) return [...prev, record];
      return prev; // new record wasn't a new max, keep old
    });
    setModalOpen(false);
  }

  const exerciseMaxes = maxes.filter(m => m.exercise_id === selectedEx);
  const maxMap = new Map(exerciseMaxes.map(m => [m.player_id, m]));
  const selectedExercise = exercises.find(e => e.id === selectedEx);
  const sortedPlayers = [...players].sort(
    (a, b) => (a.jersey_number ?? 99) - (b.jersey_number ?? 99),
  );

  if (loading)
    return (
      <DashboardLayout>
        <div className="flex justify-center py-20">
          <Loader2 size={24} className="animate-spin text-coaches-red" />
        </div>
      </DashboardLayout>
    );

  return (
    <DashboardLayout>
      <div className="max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
          <div>
            <h1 className="text-white text-2xl font-bold tracking-tight">
              Player Maxes
            </h1>
            <p className="text-gray-400 text-xs font-mono mt-0.5">
              ESTIMATED 1-REP MAXES · EPLEY FORMULA
            </p>
          </div>
          <button
            onClick={() => openModal()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-coaches-red hover:bg-coaches-red-dark text-white text-sm font-semibold transition-colors"
          >
            <Plus size={14} /> Log Max
          </button>
        </div>

        {/* Exercise selector */}
        {primaryLifts.length === 0 ? (
          <p className="text-gray-500 text-sm font-mono">
            No primary lift exercises found. Mark exercises as Primary Lift in the
            Library first.
          </p>
        ) : (
          <>
            {/* Scrollable exercise pill tabs */}
            <div className="flex gap-2 mb-5 overflow-x-auto pb-1 no-scrollbar">
              {primaryLifts.map(ex => (
                <button
                  key={ex.id}
                  onClick={() => setSelectedEx(ex.id)}
                  className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-colors border ${
                    selectedEx === ex.id
                      ? "bg-coaches-red border-coaches-red text-white"
                      : "bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-200"
                  }`}
                >
                  {ex.name}
                </button>
              ))}
            </div>

            {/* Player table for selected exercise */}
            {selectedExercise && (
              <div className="bg-gray-900 border border-gray-700 rounded-2xl overflow-hidden">
                <div className="px-4 py-3 bg-gray-800/60 border-b border-gray-700 flex items-center justify-between">
                  <p className="text-xs font-mono font-semibold text-gray-300 uppercase tracking-wider">
                    {selectedExercise.name}
                  </p>
                  <p className="text-[10px] font-mono text-gray-600">
                    {exerciseMaxes.length} / {players.length} players recorded
                  </p>
                </div>

                <table className="w-full">
                  <thead className="border-b border-gray-800">
                    <tr>
                      <th className="text-left text-[10px] font-mono text-gray-600 uppercase px-4 py-2.5">
                        #
                      </th>
                      <th className="text-left text-[10px] font-mono text-gray-600 uppercase px-4 py-2.5">
                        Player
                      </th>
                      <th className="text-left text-[10px] font-mono text-gray-600 uppercase px-4 py-2.5">
                        Best 1RM
                      </th>
                      <th className="text-left text-[10px] font-mono text-gray-600 uppercase px-4 py-2.5">
                        Weight × Reps
                      </th>
                      <th className="text-left text-[10px] font-mono text-gray-600 uppercase px-4 py-2.5">
                        Date
                      </th>
                      <th className="px-4 py-2.5"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/60">
                    {sortedPlayers.map(player => {
                      const record = maxMap.get(player.id);
                      return (
                        <tr
                          key={player.id}
                          className="hover:bg-gray-800/30 transition-colors"
                        >
                          <td className="px-4 py-3 text-gray-500 text-sm font-mono">
                            {player.jersey_number ?? "—"}
                          </td>
                          <td className="px-4 py-3 text-white text-sm font-medium">
                            {player.name}
                          </td>
                          <td className="px-4 py-3">
                            {record ? (
                              <span className="text-white font-bold text-sm">
                                {record.estimated_1rm.toFixed(1)}{" "}
                                <span className="text-gray-500 font-normal text-xs">
                                  lbs
                                </span>
                              </span>
                            ) : (
                              <span className="text-gray-700 text-sm font-mono">
                                —
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-gray-400 text-sm font-mono">
                            {record
                              ? `${record.weight_lbs} × ${record.reps}`
                              : "—"}
                          </td>
                          <td className="px-4 py-3 text-gray-600 text-xs font-mono">
                            {record
                              ? new Date(record.recorded_at).toLocaleDateString()
                              : "—"}
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => openModal(player.id, selectedEx)}
                              className="text-[11px] font-mono text-gray-600 hover:text-coaches-red transition-colors"
                            >
                              {record ? "Update" : "+ Log"}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {players.length === 0 && (
                      <tr>
                        <td
                          colSpan={6}
                          className="text-center text-gray-600 font-mono text-sm py-10"
                        >
                          No players found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      {modalOpen && (
        <LogMaxModal
          players={players}
          exercises={primaryLifts}
          defaultPlayer={modalPlayer}
          defaultExercise={modalExercise}
          onClose={() => setModalOpen(false)}
          onSaved={onSaved}
        />
      )}
    </DashboardLayout>
  );
}
