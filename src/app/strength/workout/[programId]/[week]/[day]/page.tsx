"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft, ChevronDown, ChevronUp, Video, Loader2, CheckCircle2 } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import type { StrengthProgram, ProgramBlock, WorkoutLogEntry } from "@/types/strength";

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

// ── Set logging row ────────────────────────────────────────────────────────

function SetRow({
  setNum,
  target,
  logged,
  targetWeight,
  onLog,
}: {
  setNum: number;
  target: string; // reps string from program e.g. "5" or "3-5"
  logged: WorkoutLogEntry | undefined;
  targetWeight: number | null;
  onLog: (setNum: number, reps: number | null, weight: number | null) => void;
}) {
  const prefill = !logged && targetWeight ? String(targetWeight) : "";
  const [reps,   setReps]   = useState<string>(logged?.reps_completed?.toString() ?? "");
  const [weight, setWeight] = useState<string>(logged?.weight_lbs?.toString() ?? prefill);

  function flush() {
    onLog(
      setNum,
      reps.trim()   ? parseInt(reps)     : null,
      weight.trim() ? parseFloat(weight) : null,
    );
  }

  const isDone = logged?.reps_completed != null;

  return (
    <div className="flex flex-col gap-1">
      {/* Target weight pill — shown when intensity is programmed and a max exists */}
      {targetWeight !== null && !isDone && (
        <div className="flex items-center gap-1.5 px-3">
          <span className="text-[10px] font-mono text-coaches-red/80 bg-coaches-red/10 border border-coaches-red/20 rounded-full px-2 py-0.5">
            Target: ~{targetWeight} lbs
          </span>
        </div>
      )}
      <div className={`grid grid-cols-[2rem_1fr_1fr_1fr] gap-2 items-center px-3 py-2 rounded-lg transition-colors ${isDone ? "bg-green-900/20 border border-green-800/30" : "bg-gray-800/60 border border-gray-700/60"}`}>
        <span className={`text-xs font-mono font-bold ${isDone ? "text-green-400" : "text-gray-500"}`}>{setNum}</span>
        <span className="text-xs text-gray-500 font-mono">{target}</span>
        <div className="flex flex-col gap-0.5">
          <span className="text-[9px] font-mono text-gray-600 uppercase">lbs</span>
          <input
            type="number" inputMode="decimal" placeholder="0"
            value={weight}
            onChange={e => setWeight(e.target.value)}
            onBlur={flush}
            className="bg-transparent border-b border-gray-600 text-white text-sm focus:outline-none focus:border-coaches-red text-center w-full"
          />
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-[9px] font-mono text-gray-600 uppercase">reps</span>
          <input
            type="number" inputMode="numeric" placeholder="0"
            value={reps}
            onChange={e => setReps(e.target.value)}
            onBlur={flush}
            className="bg-transparent border-b border-gray-600 text-white text-sm focus:outline-none focus:border-coaches-red text-center w-full"
          />
        </div>
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
  onLog,
}: {
  block: ProgramBlock;
  index: number;
  logs: WorkoutLogEntry[];
  maxByExercise: Map<string, number>;
  onLog: (exerciseId: string, setNum: number, reps: number | null, weight: number | null) => void;
}) {
  const [cuesOpen, setCuesOpen] = useState(false);
  const sets = Array.from({ length: block.sets }, (_, i) => i + 1);
  const completedSets = logs.filter(l => l.exercise_id === block.exercise_id && l.reps_completed != null).length;
  const allDone = completedSets >= block.sets;

  const ytId = block.demo_video_url ? getYouTubeId(block.demo_video_url) : null;

  // Compute target weight from 1RM max and intensity_pct
  const exerciseMax = maxByExercise.get(block.exercise_id) ?? null;
  const targetWeight =
    exerciseMax !== null && block.intensity_pct > 0
      ? roundTo5(exerciseMax * block.intensity_pct / 100)
      : null;

  return (
    <div className={`bg-gray-900 border rounded-2xl overflow-hidden transition-colors ${allDone ? "border-green-700/50" : "border-gray-700"}`}>
      {/* Card header */}
      <div className="px-4 py-3 bg-gray-800/60 border-b border-gray-700 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-[10px] font-mono text-gray-600 shrink-0">#{index + 1}</span>
          <div className="min-w-0">
            <p className="text-white font-semibold text-sm truncate">{block.exercise_name || "Exercise"}</p>
            <p className="text-gray-500 text-xs font-mono">{block.sets} sets × {block.reps} reps{block.intensity_pct ? ` @ ${block.intensity_pct}%` : ""}</p>
          </div>
        </div>
        {allDone && <CheckCircle2 size={16} className="text-green-400 shrink-0" />}
        {!allDone && <span className="text-[10px] font-mono text-gray-600 shrink-0">{completedSets}/{block.sets}</span>}
      </div>

      <div className="p-4 flex flex-col gap-3">
        {/* Video */}
        {block.demo_video_url && (
          ytId ? (
            <div className="relative w-full rounded-xl overflow-hidden bg-black" style={{ paddingBottom: "56.25%" }}>
              <iframe
                className="absolute inset-0 w-full h-full"
                src={`https://www.youtube.com/embed/${ytId}`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title={block.exercise_name}
              />
            </div>
          ) : (
            <a href={block.demo_video_url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm transition-colors">
              <Video size={14} /> Watch Demo
            </a>
          )
        )}

        {/* Coaching cues */}
        {block.notes && (
          <button onClick={() => setCuesOpen(o => !o)} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors text-left">
            {cuesOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            {cuesOpen ? "Hide" : "Show"} notes
          </button>
        )}
        {cuesOpen && block.notes && (
          <p className="text-gray-400 text-xs leading-relaxed border-l-2 border-gray-700 pl-3">{block.notes}</p>
        )}

        {/* Set rows */}
        <div className="flex flex-col gap-1.5">
          <div className="grid grid-cols-[2rem_1fr_1fr_1fr] gap-2 px-3">
            <span className="text-[9px] font-mono text-gray-600 uppercase">Set</span>
            <span className="text-[9px] font-mono text-gray-600 uppercase">Target</span>
            <span className="text-[9px] font-mono text-gray-600 uppercase">Weight</span>
            <span className="text-[9px] font-mono text-gray-600 uppercase">Reps</span>
          </div>
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

  const [program,     setProgram]     = useState<StrengthProgram | null>(null);
  const [logs,        setLogs]        = useState<WorkoutLogEntry[]>([]);
  const [playerMaxes, setPlayerMaxes] = useState<PlayerMax[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [finished,    setFinished]    = useState(false);

  const weekNum = parseInt(week);
  const dayNum  = parseInt(day);

  const blocks = (program?.blocks ?? []).filter(b => b.week === weekNum && b.day === dayNum);

  // Build exercise_id → best 1RM lookup for the current player
  const maxByExercise = new Map(playerMaxes.map(m => [m.exercise_id, m.estimated_1rm]));

  useEffect(() => {
    Promise.all([
      fetch(`/api/strength/programs/${programId}`).then(r => r.json()),
      fetch(`/api/strength/workout-log?program_id=${programId}&week=${week}&day=${day}`).then(r => r.json()),
      fetch(`/api/strength/maxes?player_id=me`).then(r => r.json()),
    ]).then(([p, l, mx]) => {
      if (!p.error) setProgram(p as StrengthProgram);
      if (Array.isArray(l)) setLogs(l as WorkoutLogEntry[]);
      if (Array.isArray(mx)) setPlayerMaxes(mx as PlayerMax[]);
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
  const loggedSets   = logs.filter(l => l.reps_completed != null).length;

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
            {blocks.map((block, idx) => (
              <ExerciseCard
                key={`${block.exercise_id}-${idx}`}
                block={block}
                index={idx}
                logs={logs.filter(l => l.exercise_id === block.exercise_id)}
                maxByExercise={maxByExercise}
                onLog={handleLog}
              />
            ))}

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
