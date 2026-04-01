"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft, Loader2, CheckCircle2 } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import type { StrengthProgram, ProgramBlock, WorkoutLogEntry, StrengthExercise } from "@/types/strength";

interface PlayerMax {
  exercise_id: string;
  estimated_1rm: number;
}

// Extract YouTube video ID from URL
function getYouTubeId(url: string): string | null {
  const m = url.match(/(?:v=|youtu\.be\/|embed\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}

// Round to nearest 5 lbs
function roundTo5(n: number): number {
  return Math.round(n / 5) * 5;
}

// ── Scroll drum picker ─────────────────────────────────────────────────────
// Click and scroll (mouse wheel) or drag (touch) to change value.

function ScrollPicker({
  value,
  onChange,
  min,
  max,
  step = 1,
  label,
  unit,
}: {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  label: string;
  unit?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartY  = useRef(0);
  const touchAccum   = useRef(0);

  function clamp(v: number) {
    return Math.min(max, Math.max(min, Math.round(v / step) * step));
  }

  function increment() { onChange(clamp(value + step)); }
  function decrement() { onChange(clamp(value - step)); }

  // Non-passive wheel listener so we can preventDefault and stop page scroll
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    function handler(e: WheelEvent) {
      e.preventDefault();
      e.stopPropagation();
      if (e.deltaY < 0) onChange(clamp(value + step));
      else               onChange(clamp(value - step));
    }
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, step, min, max]);

  function handleTouchStart(e: React.TouchEvent) {
    touchStartY.current = e.touches[0].clientY;
    touchAccum.current  = 0;
  }

  function handleTouchMove(e: React.TouchEvent) {
    e.preventDefault();
    const delta = touchStartY.current - e.touches[0].clientY;
    touchAccum.current += delta;
    touchStartY.current = e.touches[0].clientY;
    const steps = Math.floor(Math.abs(touchAccum.current) / 28);
    if (steps > 0) {
      const dir = touchAccum.current > 0 ? 1 : -1;
      onChange(clamp(value + dir * step * steps));
      touchAccum.current = touchAccum.current % 28;
    }
  }

  const prevVal = clamp(value - step);
  const nextVal = clamp(value + step);

  return (
    <div className="flex flex-col items-center gap-1 select-none">
      <span className="text-[9px] font-mono text-gray-500 uppercase tracking-wider">{label}</span>
      <div
        ref={containerRef}
        className="flex flex-col items-center cursor-ns-resize touch-none"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
      >
        {/* Up button */}
        <button
          type="button"
          onClick={increment}
          className="w-10 flex items-center justify-center py-0.5 text-gray-600 hover:text-gray-300 transition-colors"
          aria-label="Increase"
        >
          <svg viewBox="0 0 10 6" className="w-3 h-3 fill-current"><path d="M5 0L10 6H0z"/></svg>
        </button>

        {/* Drum roll */}
        <div className="flex flex-col items-center w-16 bg-gray-800 border border-gray-600 rounded-xl overflow-hidden">
          {/* Prev */}
          <div className="h-7 flex items-center justify-center w-full border-b border-gray-700/60">
            <span className="text-gray-600 text-sm font-mono">
              {value > min ? prevVal : ""}
            </span>
          </div>
          {/* Current */}
          <div className="h-10 flex items-center justify-center w-full bg-gray-700/60">
            <span className="text-white text-xl font-bold font-mono leading-none">{value}</span>
            {unit && <span className="text-gray-500 text-[9px] font-mono ml-0.5 mt-1">{unit}</span>}
          </div>
          {/* Next */}
          <div className="h-7 flex items-center justify-center w-full border-t border-gray-700/60">
            <span className="text-gray-600 text-sm font-mono">
              {value < max ? nextVal : ""}
            </span>
          </div>
        </div>

        {/* Down button */}
        <button
          type="button"
          onClick={decrement}
          className="w-10 flex items-center justify-center py-0.5 text-gray-600 hover:text-gray-300 transition-colors"
          aria-label="Decrease"
        >
          <svg viewBox="0 0 10 6" className="w-3 h-3 fill-current"><path d="M5 6L0 0H10z"/></svg>
        </button>
      </div>
    </div>
  );
}

// ── Set logging row ────────────────────────────────────────────────────────

function SetRow({
  setNum,
  target,
  logged,
  targetWeight,
  onLog,
}: {
  setNum: number;
  target: string;
  logged: WorkoutLogEntry | undefined;
  targetWeight: number | null;
  onLog: (setNum: number, reps: number | null, weight: number | null) => void;
}) {
  const initWeight = logged?.weight_lbs != null
    ? roundTo5(logged.weight_lbs)
    : (targetWeight ?? 0);
  const initReps = logged?.reps_completed ?? 0;

  const [weight, setWeight] = useState(initWeight);
  const [reps,   setReps]   = useState(initReps);

  // Debounce: save 800ms after last change
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  function scheduleLog(w: number, r: number) {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      onLog(setNum, r > 0 ? r : null, w > 0 ? w : null);
    }, 800);
  }

  function handleWeightChange(v: number) {
    setWeight(v);
    scheduleLog(v, reps);
  }
  function handleRepsChange(v: number) {
    setReps(v);
    scheduleLog(weight, v);
  }

  const isDone = (logged?.reps_completed ?? 0) > 0;

  return (
    <div className={`flex flex-col gap-2 p-3 rounded-xl transition-colors ${isDone ? "bg-green-900/20 border border-green-800/30" : "bg-gray-800/50 border border-gray-700/50"}`}>
      <div className="flex items-center justify-between">
        <span className={`text-xs font-mono font-bold ${isDone ? "text-green-400" : "text-gray-500"}`}>
          Set {setNum}
        </span>
        <span className="text-xs font-mono text-gray-600">{target} reps</span>
        {isDone && <CheckCircle2 size={13} className="text-green-400" />}
      </div>

      {/* Target weight pill */}
      {targetWeight !== null && !isDone && (
        <span className="self-start text-[10px] font-mono text-coaches-red/80 bg-coaches-red/10 border border-coaches-red/20 rounded-full px-2 py-0.5">
          Target: ~{targetWeight} lbs
        </span>
      )}

      {/* Pickers */}
      <div className="flex items-start justify-around pt-1">
        <ScrollPicker
          value={weight}
          onChange={handleWeightChange}
          min={0}
          max={500}
          step={5}
          label="Weight"
          unit="lbs"
        />
        <div className="w-px bg-gray-700 self-stretch mx-2" />
        <ScrollPicker
          value={reps}
          onChange={handleRepsChange}
          min={0}
          max={20}
          step={1}
          label="Reps"
        />
      </div>
    </div>
  );
}

// ── Exercise card ──────────────────────────────────────────────────────────

function ExerciseCard({
  block,
  index,
  logs,
  maxByExercise,
  coachingCues,
  onLog,
}: {
  block: ProgramBlock;
  index: number;
  logs: WorkoutLogEntry[];
  maxByExercise: Map<string, number>;
  coachingCues: string | null;
  onLog: (exerciseId: string, setNum: number, reps: number | null, weight: number | null) => void;
}) {
  const sets = Array.from({ length: block.sets }, (_, i) => i + 1);
  const completedSets = logs.filter(l => l.exercise_id === block.exercise_id && (l.reps_completed ?? 0) > 0).length;
  const allDone = completedSets >= block.sets;

  const ytId = block.demo_video_url ? getYouTubeId(block.demo_video_url) : null;

  const exerciseMax = maxByExercise.get(block.exercise_id) ?? null;
  const targetWeight =
    exerciseMax !== null && block.intensity_pct > 0
      ? roundTo5(exerciseMax * block.intensity_pct / 100)
      : null;

  const displayCues = coachingCues || block.notes || null;

  return (
    <div className={`bg-gray-900 border rounded-2xl overflow-hidden transition-colors ${allDone ? "border-green-700/50" : "border-gray-700"}`}>
      {/* Card header */}
      <div className="px-4 py-3 bg-gray-800/60 border-b border-gray-700 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-[10px] font-mono text-gray-600 shrink-0">#{index + 1}</span>
          <div className="min-w-0">
            <p className="text-white font-semibold text-sm truncate">{block.exercise_name || "Exercise"}</p>
            <p className="text-gray-500 text-xs font-mono">
              {block.sets} sets × {block.reps} reps
              {block.intensity_pct ? ` @ ${block.intensity_pct}%` : ""}
              {block.tempo ? ` · ${block.tempo}` : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {allDone
            ? <CheckCircle2 size={16} className="text-green-400" />
            : <span className="text-[10px] font-mono text-gray-600">{completedSets}/{block.sets}</span>
          }
        </div>
      </div>

      <div className="p-4 flex flex-col gap-4">
        {/* Coaching cues — always visible when present */}
        {displayCues && (
          <div className="border-l-2 border-coaches-blue/50 pl-3">
            <p className="text-[9px] font-mono text-coaches-blue/70 uppercase tracking-wider mb-1">Coaching Cues</p>
            <p className="text-gray-300 text-xs leading-relaxed whitespace-pre-line">{displayCues}</p>
          </div>
        )}

        {/* Video — autoplay muted, native controls (unmute + fullscreen available) */}
        {ytId && (
          <div className="relative w-full rounded-xl overflow-hidden bg-black" style={{ paddingBottom: "56.25%" }}>
            <iframe
              className="absolute inset-0 w-full h-full"
              src={`https://www.youtube.com/embed/${ytId}?autoplay=1&mute=1&controls=1&rel=0&modestbranding=1&playsinline=1`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
              allowFullScreen
              title={block.exercise_name}
            />
          </div>
        )}

        {/* Set logging */}
        <div className="flex flex-col gap-2">
          <p className="text-[9px] font-mono text-gray-600 uppercase tracking-wider px-1">Log Your Sets</p>
          {sets.map(s => (
            <SetRow
              key={s}
              setNum={s}
              target={block.reps}
              logged={logs.find(l => l.exercise_id === block.exercise_id && l.set_number === s)}
              targetWeight={targetWeight}
              onLog={(setNum, reps, weight) => onLog(block.exercise_id, setNum, reps, weight)}
            />
          ))}
        </div>

        {block.rest_seconds > 0 && (
          <p className="text-[10px] font-mono text-gray-600">Rest: {block.rest_seconds}s between sets</p>
        )}
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function WorkoutPage() {
  const { programId, week, day } = useParams<{ programId: string; week: string; day: string }>();
  const router = useRouter();

  const [program,      setProgram]      = useState<StrengthProgram | null>(null);
  const [logs,         setLogs]         = useState<WorkoutLogEntry[]>([]);
  const [playerMaxes,  setPlayerMaxes]  = useState<PlayerMax[]>([]);
  const [exercises,    setExercises]    = useState<StrengthExercise[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [finished,     setFinished]     = useState(false);

  const weekNum = parseInt(week);
  const dayNum  = parseInt(day);

  const blocks = (program?.blocks ?? []).filter(b => b.week === weekNum && b.day === dayNum);

  const maxByExercise = new Map(playerMaxes.map(m => [m.exercise_id, m.estimated_1rm]));
  const exerciseMap   = new Map(exercises.map(e => [e.id, e]));

  useEffect(() => {
    Promise.all([
      fetch(`/api/strength/programs/${programId}`).then(r => r.json()),
      fetch(`/api/strength/workout-log?program_id=${programId}&week=${week}&day=${day}`).then(r => r.json()),
      fetch(`/api/strength/maxes?player_id=me`).then(r => r.json()),
      fetch(`/api/strength/exercises`).then(r => r.json()),
    ]).then(([p, l, mx, ex]) => {
      if (!p.error) setProgram(p as StrengthProgram);
      if (Array.isArray(l))  setLogs(l as WorkoutLogEntry[]);
      if (Array.isArray(mx)) setPlayerMaxes(mx as PlayerMax[]);
      if (Array.isArray(ex)) setExercises(ex as StrengthExercise[]);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [programId, week, day]);

  const handleLog = useCallback(async (
    exerciseId: string, setNum: number,
    reps: number | null, weight: number | null
  ) => {
    const res = await fetch("/api/strength/workout-log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ program_id: programId, week: weekNum, day: dayNum, exercise_id: exerciseId, set_number: setNum, reps_completed: reps, weight_lbs: weight }),
    });
    if (res.ok) {
      const entry = await res.json() as WorkoutLogEntry;
      setLogs(prev => {
        const idx = prev.findIndex(l => l.exercise_id === exerciseId && l.set_number === setNum);
        if (idx >= 0) { const next = [...prev]; next[idx] = entry; return next; }
        return [...prev, entry];
      });
    }
  }, [programId, weekNum, dayNum]);

  const sessionLabel = dayNum === 1 ? "A" : dayNum === 2 ? "B" : String(dayNum);
  const totalSets    = blocks.reduce((n, b) => n + b.sets, 0);
  const loggedSets   = logs.filter(l => (l.reps_completed ?? 0) > 0).length;

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

  if (finished) return (
    <DashboardLayout>
      <div className="max-w-md mx-auto text-center py-20 flex flex-col items-center gap-4">
        <CheckCircle2 size={56} className="text-green-400" />
        <h2 className="text-white text-2xl font-bold">Session Complete!</h2>
        <p className="text-gray-400 text-sm font-mono">Week {weekNum} · Session {sessionLabel} · {loggedSets}/{totalSets} sets logged</p>
        <button onClick={() => router.push(`/strength/programs/${programId}`)}
          className="mt-4 px-6 py-2.5 bg-coaches-red hover:bg-coaches-red-dark text-white text-sm font-semibold rounded-xl transition-colors">
          Back to Program
        </button>
      </div>
    </DashboardLayout>
  );

  return (
    <DashboardLayout>
      <div className="max-w-2xl">
        {/* Header */}
        <div className="flex items-start gap-3 mb-5">
          <button onClick={() => router.push(`/strength/programs/${programId}`)}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-800 border border-gray-700 text-gray-400 hover:text-white transition-colors shrink-0 mt-0.5">
            <ChevronLeft size={15} />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-white font-bold text-lg truncate">{program.name}</h1>
            <p className="text-gray-500 text-xs font-mono">Week {weekNum} · Session {sessionLabel} · {loggedSets}/{totalSets} sets logged</p>
          </div>
          {totalSets > 0 && (
            <div className="shrink-0 flex flex-col items-end gap-1">
              <span className="text-xs font-mono text-gray-500">{Math.round((loggedSets / totalSets) * 100)}%</span>
              <div className="w-24 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full bg-coaches-red rounded-full transition-all" style={{ width: `${(loggedSets / totalSets) * 100}%` }} />
              </div>
            </div>
          )}
        </div>

        {/* Exercise cards */}
        {blocks.length === 0 ? (
          <p className="text-gray-600 font-mono text-sm text-center py-12">No exercises programmed for this session.</p>
        ) : (
          <div className="flex flex-col gap-4">
            {blocks.map((block, idx) => {
              const ex = exerciseMap.get(block.exercise_id);
              return (
                <ExerciseCard
                  key={`${block.exercise_id}-${idx}`}
                  block={block}
                  index={idx}
                  logs={logs.filter(l => l.exercise_id === block.exercise_id)}
                  maxByExercise={maxByExercise}
                  coachingCues={ex?.coaching_cues ?? block.notes ?? null}
                  onLog={handleLog}
                />
              );
            })}

            <button
              onClick={() => setFinished(true)}
              className="w-full py-3 bg-green-700 hover:bg-green-600 text-white font-semibold rounded-2xl transition-colors mt-2">
              Finish Session
            </button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
