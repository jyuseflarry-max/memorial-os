"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2, Plus, Trash2, ChevronLeft, Save, CheckCircle2 } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import type { StrengthProgram, ProgramBlock, StrengthExercise } from "@/types/strength";

const PHASE_COLORS: Record<string, string> = {
  accumulation:    "text-blue-400   bg-blue-400/10   border-blue-400/20",
  intensification: "text-orange-400 bg-orange-400/10 border-orange-400/20",
  realization:     "text-red-400    bg-red-400/10    border-red-400/20",
  deload:          "text-green-400  bg-green-400/10  border-green-400/20",
};

// ── Session key helpers ────────────────────────────────────────────────────

type SessionKey = string; // "week-day" e.g. "1-1"
function makeKey(week: number, day: number): SessionKey { return `${week}-${day}`; }

type SessionMap = Map<SessionKey, ProgramBlock[]>;

function blocksToSessions(blocks: ProgramBlock[]): SessionMap {
  const map = new Map<SessionKey, ProgramBlock[]>();
  for (const b of blocks) {
    const k = makeKey(b.week, b.day);
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(b);
  }
  return map;
}

function sessionsToBlocks(sessions: SessionMap): ProgramBlock[] {
  const out: ProgramBlock[] = [];
  for (const blocks of sessions.values()) out.push(...blocks);
  return out;
}

// ── Empty exercise row ─────────────────────────────────────────────────────

function emptyBlock(week: number, day: number): ProgramBlock {
  return { week, day, exercise_id: "", exercise_name: "", sets: 3, reps: "5", intensity_pct: 70, tempo: "", rest_seconds: 180, notes: "" };
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function ProgramEditorPage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();

  const [program,   setProgram]   = useState<StrengthProgram | null>(null);
  const [exercises, setExercises] = useState<StrengthExercise[]>([]);
  const [sessions,  setSessions]  = useState<SessionMap>(new Map());
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [saved,     setSaved]     = useState(false);

  // Sessions per week: default 2, derived from existing blocks
  const daysPerWeek = program
    ? Math.max(2, ...[...sessions.keys()].map((k) => parseInt(k.split("-")[1])))
    : 2;

  useEffect(() => {
    Promise.all([
      fetch(`/api/strength/programs/${id}`).then((r) => r.json()),
      fetch("/api/strength/exercises").then((r) => r.json()),
    ]).then(([p, ex]) => {
      if (!p.error) {
        setProgram(p);
        setSessions(blocksToSessions(p.blocks ?? []));
      }
      if (Array.isArray(ex)) setExercises(ex);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [id]);

  // ── Session mutations ──────────────────────────────────────────────────

  const addExercise = useCallback((week: number, day: number) => {
    setSessions((prev) => {
      const next = new Map(prev);
      const k    = makeKey(week, day);
      next.set(k, [...(next.get(k) ?? []), emptyBlock(week, day)]);
      return next;
    });
  }, []);

  const updateExercise = useCallback(
    (week: number, day: number, idx: number, field: keyof ProgramBlock, value: unknown) => {
      setSessions((prev) => {
        const next    = new Map(prev);
        const k       = makeKey(week, day);
        const blocks  = [...(next.get(k) ?? [])];
        blocks[idx]   = { ...blocks[idx], [field]: value };

        // If exercise changed, sync the name too
        if (field === "exercise_id") {
          const ex = exercises.find((e) => e.id === value);
          blocks[idx].exercise_name = ex?.name ?? "";
        }
        next.set(k, blocks);
        return next;
      });
    },
    [exercises]
  );

  const removeExercise = useCallback((week: number, day: number, idx: number) => {
    setSessions((prev) => {
      const next   = new Map(prev);
      const k      = makeKey(week, day);
      const blocks = (next.get(k) ?? []).filter((_, i) => i !== idx);
      if (blocks.length === 0) next.delete(k);
      else next.set(k, blocks);
      return next;
    });
  }, []);

  // ── Save ───────────────────────────────────────────────────────────────

  async function handleSave() {
    if (!program) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/strength/programs/${id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ blocks: sessionsToBlocks(sessions) }),
      });
      if (res.ok) {
        const updated = await res.json();
        setProgram(updated);
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      }
    } finally {
      setSaving(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────

  if (loading) return (
    <DashboardLayout>
      <div className="flex justify-center py-20"><Loader2 size={24} className="animate-spin text-coaches-red" /></div>
    </DashboardLayout>
  );

  if (!program) return (
    <DashboardLayout>
      <p className="text-gray-500 font-mono text-sm text-center py-20">Program not found.</p>
    </DashboardLayout>
  );

  const weeks = Array.from({ length: program.weeks }, (_, i) => i + 1);
  const days  = Array.from({ length: daysPerWeek }, (_, i) => i + 1);

  return (
    <DashboardLayout>
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/strength/programs")}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-800 border border-gray-700 text-gray-400 hover:text-white transition-colors"
          >
            <ChevronLeft size={15} />
          </button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-white text-xl font-bold tracking-tight">{program.name}</h1>
              {program.phase && (
                <span className={`text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded border ${PHASE_COLORS[program.phase] ?? ""}`}>
                  {program.phase}
                </span>
              )}
            </div>
            <p className="text-gray-500 text-xs font-mono mt-0.5">{program.weeks} weeks · {daysPerWeek} sessions/week</p>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-coaches-red hover:bg-coaches-red-dark disabled:opacity-50 text-white text-sm font-semibold transition-colors"
        >
          {saved ? <CheckCircle2 size={14} /> : saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          {saved ? "Saved!" : saving ? "Saving…" : "Save Changes"}
        </button>
      </div>

      {/* ── Session grid ────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4">
        {weeks.map((week) => (
          <div key={week} className="bg-gray-900 border border-gray-700 rounded-2xl overflow-hidden">
            <div className="px-4 py-2.5 bg-gray-800/60 border-b border-gray-700">
              <p className="text-xs font-mono font-semibold text-gray-300 uppercase tracking-wider">Week {week}</p>
            </div>

            <div className={`grid gap-px bg-gray-700 ${days.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
              {days.map((day) => {
                const key    = makeKey(week, day);
                const blocks = sessions.get(key) ?? [];

                return (
                  <div key={day} className="bg-gray-900 p-4">
                    <p className="text-[10px] font-mono text-gray-500 uppercase tracking-wider mb-3">
                      Session {day === 1 ? "A" : day === 2 ? "B" : day}
                    </p>

                    {/* Exercise rows */}
                    <div className="flex flex-col gap-2">
                      {blocks.map((block, idx) => (
                        <ExerciseRow
                          key={idx}
                          block={block}
                          exercises={exercises}
                          onUpdate={(field, value) => updateExercise(week, day, idx, field, value)}
                          onRemove={() => removeExercise(week, day, idx)}
                        />
                      ))}
                    </div>

                    {blocks.length === 0 && (
                      <p className="text-gray-700 text-[11px] font-mono mb-2">No exercises yet</p>
                    )}

                    <button
                      onClick={() => addExercise(week, day)}
                      className="mt-2 flex items-center gap-1.5 text-[11px] font-mono text-gray-500 hover:text-coaches-red transition-colors"
                    >
                      <Plus size={11} /> Add exercise
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
}

// ── Exercise row ───────────────────────────────────────────────────────────

function ExerciseRow({
  block,
  exercises,
  onUpdate,
  onRemove,
}: {
  block:     ProgramBlock;
  exercises: StrengthExercise[];
  onUpdate:  (field: keyof ProgramBlock, value: unknown) => void;
  onRemove:  () => void;
}) {
  const inputCls = "bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none focus:border-coaches-red transition-colors";

  return (
    <div className="bg-gray-800/60 border border-gray-700/60 rounded-xl p-3 flex flex-col gap-2">
      {/* Exercise selector */}
      <div className="flex items-center gap-2">
        <select
          value={block.exercise_id}
          onChange={(e) => onUpdate("exercise_id", e.target.value)}
          className={`${inputCls} flex-1 min-w-0`}
        >
          <option value="">— Select exercise —</option>
          {exercises.map((ex) => (
            <option key={ex.id} value={ex.id}>{ex.name}</option>
          ))}
        </select>
        <button onClick={onRemove} className="text-gray-600 hover:text-red-400 transition-colors shrink-0">
          <Trash2 size={13} />
        </button>
      </div>

      {/* Sets / Reps / Intensity */}
      <div className="grid grid-cols-3 gap-2">
        <div className="flex flex-col gap-1">
          <label className="text-[9px] font-mono text-gray-600 uppercase">Sets</label>
          <input
            type="number" min={1} max={20}
            value={block.sets}
            onChange={(e) => onUpdate("sets", parseInt(e.target.value) || 1)}
            className={inputCls}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[9px] font-mono text-gray-600 uppercase">Reps</label>
          <input
            type="text"
            placeholder="5 or 3-5"
            value={block.reps}
            onChange={(e) => onUpdate("reps", e.target.value)}
            className={inputCls}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[9px] font-mono text-gray-600 uppercase">Intensity %</label>
          <input
            type="number" min={0} max={110}
            value={block.intensity_pct}
            onChange={(e) => onUpdate("intensity_pct", parseFloat(e.target.value) || 0)}
            className={inputCls}
          />
        </div>
      </div>

      {/* Notes */}
      <input
        type="text"
        placeholder="Notes (optional)"
        value={block.notes}
        onChange={(e) => onUpdate("notes", e.target.value)}
        className={`${inputCls} text-[11px]`}
      />
    </div>
  );
}
