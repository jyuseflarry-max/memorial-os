"use client";

import { useState, useEffect } from "react";
import {
  Dumbbell,
  ChevronRight,
  Trophy,
  RefreshCw,
  Check,
  ArrowLeft,
} from "lucide-react";
import { Player } from "@/types/player";

// ── Types ─────────────────────────────────────────────────────────────────

interface PlayerMax {
  player_id: string;
  back_squat: number | null;
  power_clean: number | null;
  bench_press: number | null;
  recorded_on: string | null;
}

interface Block {
  id: string;
  exercise_name: string;
  max_ref: "back_squat" | "power_clean" | "bench_press" | null;
  percentage: number;
  sets: number;
  reps: number;
  notes: string;
}

interface Phase {
  id: string;
  name: string;
  description: string | null;
  blocks: Block[];
}

type Lift = "back_squat" | "power_clean" | "bench_press";
type Step = "pick-player" | "pick-phase" | "active";

// ── Plate calculator ──────────────────────────────────────────────────────

const BAR_WEIGHT = 45;
const PLATE_SIZES = [45, 35, 25, 10, 5, 2.5] as const;

const PLATE_STYLE: Record<number, { bg: string; text: string }> = {
  45:  { bg: "#dc2626", text: "#fff" },   // red-600
  35:  { bg: "#eab308", text: "#000" },   // yellow-500
  25:  { bg: "#16a34a", text: "#fff" },   // green-600
  10:  { bg: "#e5e7eb", text: "#111" },   // gray-200
  5:   { bg: "#4b5563", text: "#fff" },   // gray-600
  2.5: { bg: "#38bdf8", text: "#000" },   // sky-400
};

function calcPlates(target: number): { weight: number; count: number }[] {
  if (target <= BAR_WEIGHT) return [];
  let remaining = (target - BAR_WEIGHT) / 2;
  const out: { weight: number; count: number }[] = [];
  for (const p of PLATE_SIZES) {
    const n = Math.floor(remaining / p + 0.001);
    if (n > 0) { out.push({ weight: p, count: n }); remaining -= n * p; }
  }
  return out;
}

function calcTarget(max: number | null, pct: number): number | null {
  if (!max) return null;
  return Math.round((max * pct) / 100 / 5) * 5;
}

// ── PlateMap ──────────────────────────────────────────────────────────────

function PlateMap({ weight }: { weight: number }) {
  const plates = calcPlates(weight);
  return (
    <div className="flex items-center gap-1 flex-wrap mt-2">
      <span className="text-[10px] font-mono text-gray-600 mr-0.5 shrink-0">BAR</span>
      {plates.length === 0 ? (
        <span className="text-[10px] font-mono text-gray-500">only</span>
      ) : (
        plates.map(({ weight: pw, count }) =>
          Array.from({ length: count }).map((_, i) => {
            const s = PLATE_STYLE[pw] ?? { bg: "#6b7280", text: "#fff" };
            return (
              <span
                key={`${pw}-${i}`}
                style={{ backgroundColor: s.bg, color: s.text }}
                className="inline-flex items-center justify-center rounded font-bold text-[10px] font-mono px-1.5 py-1 leading-none shrink-0"
                title={`${pw} lb`}
              >
                {pw}
              </span>
            );
          })
        )
      )}
      <span className="text-[10px] font-mono text-gray-600 ml-0.5 shrink-0">× each side</span>
    </div>
  );
}

// ── PR Celebration overlay ────────────────────────────────────────────────

function PRCelebration({
  lift,
  weight,
  onDismiss,
}: {
  lift: string;
  weight: number;
  onDismiss: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md cursor-pointer"
      onClick={onDismiss}
    >
      <div className="text-center select-none" style={{ animation: "prBounce 0.65s cubic-bezier(0.34,1.56,0.64,1) forwards" }}>
        <div className="text-7xl mb-5">🏆</div>
        <h1
          className="text-6xl font-black tracking-tighter mb-3"
          style={{
            color: "var(--color-mustang-red)",
            textShadow: "0 0 30px var(--color-mustang-red), 0 0 60px color-mix(in srgb, var(--color-mustang-red) 67%, transparent), 0 0 120px color-mix(in srgb, var(--color-mustang-red) 33%, transparent)",
          }}
        >
          NEW PR!
        </h1>
        <p className="text-3xl font-black text-white mb-1">{weight} lbs</p>
        <p className="text-sm font-mono uppercase tracking-widest text-gray-400">{lift}</p>
        <p className="text-gray-600 text-xs mt-8 font-mono">tap anywhere to dismiss</p>
      </div>
      <style>{`
        @keyframes prBounce {
          0%   { transform: scale(0.2) rotate(-8deg); opacity: 0; }
          55%  { transform: scale(1.08) rotate(2deg);  opacity: 1; }
          72%  { transform: scale(0.96); }
          85%  { transform: scale(1.02); }
          100% { transform: scale(1) rotate(0); }
        }
      `}</style>
    </div>
  );
}

// ── BlockCard ─────────────────────────────────────────────────────────────

function BlockCard({
  block,
  max,
  vibeAdjusted,
}: {
  block: Block;
  max: number | null;
  vibeAdjusted: boolean;
}) {
  const rawTarget = calcTarget(max, block.percentage);
  const adjTarget =
    rawTarget !== null ? Math.round((rawTarget * 0.9) / 5) * 5 : null;
  const displayTarget =
    vibeAdjusted && adjTarget !== null ? adjTarget : rawTarget;

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-semibold text-white text-sm leading-tight truncate">
            {block.exercise_name}
          </h3>
          <p className="text-[11px] font-mono text-gray-500 mt-0.5">
            {block.sets} sets × {block.reps} reps &nbsp;·&nbsp; {block.percentage}%
            {vibeAdjusted && rawTarget !== null && (
              <span className="text-amber-400 ml-1.5">-10% adj.</span>
            )}
          </p>
        </div>
        <div className="shrink-0 text-right">
          {displayTarget !== null ? (
            <>
              <span className="text-2xl font-black text-white leading-none">
                {displayTarget}
              </span>
              <span className="text-sm font-mono text-gray-500 ml-1">lb</span>
            </>
          ) : (
            <span className="text-xs font-mono text-gray-600">no max</span>
          )}
        </div>
      </div>

      {/* Plate map */}
      {displayTarget !== null && (
        <div className="mt-3 bg-gray-950 rounded-xl px-3 py-2.5">
          <PlateMap weight={displayTarget} />
        </div>
      )}

      {/* Notes */}
      {block.notes && (
        <p className="text-[11px] text-gray-500 mt-2.5 italic">{block.notes}</p>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────

const LIFT_LABELS: Record<Lift, string> = {
  back_squat: "Back Squat",
  power_clean: "Power Clean",
  bench_press: "Bench Press",
};

export default function WorkoutPortal() {
  const [step, setStep] = useState<Step>("pick-player");

  // Data
  const [players, setPlayers] = useState<Player[]>([]);
  const [phases, setPhases] = useState<Phase[]>([]);
  const [playerMax, setPlayerMax] = useState<PlayerMax | null>(null);

  // Selections
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [selectedPhase, setSelectedPhase] = useState<Phase | null>(null);

  // Vibe
  const [vibeAdjusted, setVibeAdjusted] = useState(false);
  const vibeScore = selectedPlayer?.latest_vibe_score ?? null;
  const lowVibe = vibeScore !== null && vibeScore < 3.0;

  // PR logger state
  const [prLift, setPrLift] = useState<Lift>("back_squat");
  const [prWeight, setPrWeight] = useState("");
  const [prSaving, setPrSaving] = useState(false);
  const [prSaved, setPrSaved] = useState(false);
  const [prCelebration, setPrCelebration] = useState<{
    lift: string;
    weight: number;
  } | null>(null);

  // Loading flags
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [loadingPhases, setLoadingPhases] = useState(false);
  const [loadingMax, setLoadingMax] = useState(false);

  // ── Fetch players + phases on mount ──────────────────────────────────

  useEffect(() => {
    setLoadingPlayers(true);
    fetch("/api/players")
      .then((r) => r.json())
      .then((d) => setPlayers(Array.isArray(d) ? d : []))
      .finally(() => setLoadingPlayers(false));

    setLoadingPhases(true);
    fetch("/api/strength/phases")
      .then((r) => r.json())
      .then((d) => setPhases(Array.isArray(d) ? d : []))
      .finally(() => setLoadingPhases(false));
  }, []);

  // ── Select player → fetch their maxes ────────────────────────────────

  async function selectPlayer(p: Player) {
    setSelectedPlayer(p);
    setVibeAdjusted(false);
    setLoadingMax(true);
    try {
      const res = await fetch(
        `/api/strength/maxes/history?player_id=${p.id}&limit=1`
      );
      const rows: PlayerMax[] = await res.json();
      if (Array.isArray(rows) && rows.length > 0) {
        const { player_id: _pid, ...rest } = rows[0];
        setPlayerMax({ player_id: p.id, ...rest });
      } else {
        setPlayerMax({
          player_id: p.id,
          back_squat: null,
          power_clean: null,
          bench_press: null,
          recorded_on: null,
        });
      }
    } finally {
      setLoadingMax(false);
    }
    setStep("pick-phase");
  }

  function selectPhase(ph: Phase) {
    setSelectedPhase(ph);
    setStep("active");
  }

  // ── Log new max / PR check ────────────────────────────────────────────

  async function logMax() {
    if (!selectedPlayer || !prWeight) return;
    const w = Number(prWeight);
    if (!w || w <= 0) return;

    setPrSaving(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const currentMax = playerMax?.[prLift] ?? null;

      // Carry over all lifts so we don't null out existing maxes
      const payload = {
        player_id:    selectedPlayer.id,
        recorded_on:  today,
        back_squat:   prLift === "back_squat"   ? w : (playerMax?.back_squat   ?? null),
        power_clean:  prLift === "power_clean"  ? w : (playerMax?.power_clean  ?? null),
        bench_press:  prLift === "bench_press"  ? w : (playerMax?.bench_press  ?? null),
      };

      const res = await fetch("/api/strength/maxes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Save failed");

      // Update local max state
      setPlayerMax((prev) =>
        prev
          ? { ...prev, [prLift]: w, recorded_on: today }
          : { player_id: selectedPlayer.id, back_squat: null, power_clean: null, bench_press: null, recorded_on: today, [prLift]: w }
      );

      // PR check — new PR if no prior max or weight is higher
      if (currentMax === null || w > currentMax) {
        setPrCelebration({ lift: LIFT_LABELS[prLift], weight: w });
      } else {
        setPrSaved(true);
        setTimeout(() => setPrSaved(false), 2500);
      }
      setPrWeight("");
    } finally {
      setPrSaving(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────

  const sortedPlayers = [...players].sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* PR Celebration overlay */}
      {prCelebration && (
        <PRCelebration
          lift={prCelebration.lift}
          weight={prCelebration.weight}
          onDismiss={() => setPrCelebration(null)}
        />
      )}

      {/* Top bar */}
      <div className="sticky top-0 z-10 bg-gray-950/95 backdrop-blur border-b border-gray-800 px-4 py-3 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: "var(--color-mustang-red)" }}>
          <Dumbbell size={15} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white leading-tight">Athlete Portal</p>
          <p className="text-[10px] font-mono text-gray-600 uppercase tracking-widest">
            Iron Lab
          </p>
        </div>
        {selectedPlayer && (
          <div className="text-right shrink-0">
            <p className="text-xs font-semibold text-white">
              #{selectedPlayer.jersey_number} {selectedPlayer.name.split(" ")[0]}
            </p>
            {vibeScore !== null && (
              <p className={`text-[10px] font-mono ${lowVibe ? "text-amber-400" : "text-green-400"}`}>
                Vibe {vibeScore.toFixed(1)}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">

        {/* ── STEP 1: Pick player ─────────────────────────────────── */}
        {step === "pick-player" && (
          <div>
            <h2 className="text-xl font-bold mb-1">Who are you?</h2>
            <p className="text-sm text-gray-500 mb-5">Select your name to load your workout</p>

            {loadingPlayers ? (
              <div className="flex items-center gap-2 text-gray-500 text-sm">
                <RefreshCw size={14} className="animate-spin" /> Loading roster…
              </div>
            ) : sortedPlayers.length === 0 ? (
              <p className="text-gray-600 text-sm">No players found. Ask your coach to add the roster.</p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {sortedPlayers.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => selectPlayer(p)}
                    className="bg-gray-900 hover:bg-gray-800 active:bg-gray-700 border border-gray-800 hover:border-gray-700 rounded-2xl px-4 py-3 text-left transition-colors"
                  >
                    <p className="text-[10px] text-gray-600 font-mono">#{p.jersey_number}</p>
                    <p className="font-semibold text-sm text-white leading-tight mt-0.5">
                      {p.name}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── STEP 2: Pick phase ──────────────────────────────────── */}
        {step === "pick-phase" && (
          <div>
            <button
              onClick={() => setStep("pick-player")}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-white font-mono mb-5 transition-colors"
            >
              <ArrowLeft size={12} /> Back
            </button>

            <h2 className="text-xl font-bold mb-1">Select Phase</h2>
            <p className="text-sm text-gray-500 mb-5">
              Choose today's training block
            </p>

            {loadingMax && (
              <div className="flex items-center gap-2 text-gray-500 text-xs font-mono mb-4">
                <RefreshCw size={12} className="animate-spin" /> Loading your maxes…
              </div>
            )}

            {loadingPhases ? (
              <div className="flex items-center gap-2 text-gray-500 text-sm">
                <RefreshCw size={14} className="animate-spin" /> Loading phases…
              </div>
            ) : phases.length === 0 ? (
              <p className="text-gray-600 text-sm">
                No phases built yet. Ask your coach to create one in the Designer.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {phases.map((ph) => (
                  <button
                    key={ph.id}
                    onClick={() => selectPhase(ph)}
                    className="bg-gray-900 hover:bg-gray-800 active:bg-gray-700 border border-gray-800 hover:border-gray-700 rounded-2xl px-4 py-4 text-left transition-colors flex items-center gap-3 group"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white text-sm">{ph.name}</p>
                      {ph.description && (
                        <p className="text-xs text-gray-500 mt-0.5 truncate">
                          {ph.description}
                        </p>
                      )}
                      <p className="text-[10px] font-mono text-gray-600 mt-1">
                        {ph.blocks.length} exercise{ph.blocks.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <ChevronRight
                      size={16}
                      className="text-gray-700 group-hover:text-gray-400 transition-colors shrink-0"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── STEP 3: Active workout ──────────────────────────────── */}
        {step === "active" && selectedPhase && (
          <div className="space-y-5">
            {/* Back nav */}
            <button
              onClick={() => setStep("pick-phase")}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-white font-mono transition-colors"
            >
              <ArrowLeft size={12} /> Back to phases
            </button>

            {/* Phase title */}
            <div>
              <h2 className="text-xl font-bold text-white">{selectedPhase.name}</h2>
              {selectedPhase.description && (
                <p className="text-sm text-gray-500 mt-1">{selectedPhase.description}</p>
              )}
            </div>

            {/* ── Vibe banner ───────────────────────────────────────── */}
            {lowVibe && (
              <div
                className={`rounded-2xl border px-4 py-4 transition-colors ${
                  vibeAdjusted
                    ? "bg-amber-950/50 border-amber-600/60"
                    : "bg-amber-900/25 border-amber-500/40"
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl mt-0.5 shrink-0">⚠️</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-amber-400 text-sm">
                      Low Energy Detected
                    </p>
                    <p className="text-amber-200/70 text-xs mt-1 leading-relaxed">
                      Your vibe score this morning is{" "}
                      <strong className="text-amber-300">{vibeScore?.toFixed(1)}</strong>
                      /5.0. Consider reducing today's load by 10%.
                    </p>
                    <button
                      onClick={() => setVibeAdjusted((v) => !v)}
                      className={`mt-3 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                        vibeAdjusted
                          ? "bg-amber-500 text-black"
                          : "bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 border border-amber-500/40"
                      }`}
                    >
                      {vibeAdjusted ? "✓ -10% Load Applied" : "Apply -10% Load"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── Block cards ───────────────────────────────────────── */}
            <div className="space-y-3">
              <p className="text-[10px] font-mono uppercase tracking-widest text-gray-600">
                Exercises — {selectedPhase.blocks.length} total
              </p>

              {selectedPhase.blocks.length === 0 ? (
                <p className="text-gray-600 text-sm">
                  No exercises in this phase yet.
                </p>
              ) : (
                selectedPhase.blocks.map((block) => {
                  const maxVal =
                    block.max_ref ? (playerMax?.[block.max_ref] ?? null) : null;
                  return (
                    <BlockCard
                      key={block.id}
                      block={block}
                      max={maxVal}
                      vibeAdjusted={vibeAdjusted}
                    />
                  );
                })
              )}
            </div>

            {/* ── Log Max / PR Alert ────────────────────────────────── */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
              <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <Trophy size={14} style={{ color: "var(--color-mustang-red)" }} />
                Log New Max
              </h3>

              {/* Lift selector */}
              <div className="grid grid-cols-3 gap-1.5 mb-3">
                {(["back_squat", "power_clean", "bench_press"] as const).map(
                  (lift) => (
                    <button
                      key={lift}
                      onClick={() => setPrLift(lift)}
                      className={`py-2 px-1 rounded-xl text-[11px] font-mono font-bold transition-colors ${
                        prLift === lift
                          ? "text-white"
                          : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                      }`}
                      style={prLift === lift ? { backgroundColor: "var(--color-mustang-red)" } : undefined}
                    >
                      {lift === "back_squat"
                        ? "Squat"
                        : lift === "power_clean"
                        ? "Clean"
                        : "Bench"}
                    </button>
                  )
                )}
              </div>

              {/* Weight input + submit */}
              <div className="flex gap-2 mb-3">
                <div className="flex-1 relative">
                  <input
                    type="number"
                    inputMode="numeric"
                    value={prWeight}
                    onChange={(e) => setPrWeight(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && logMax()}
                    placeholder="Weight (lbs)"
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none"
                    style={{ "--tw-ring-color": "var(--color-mustang-red)" } as React.CSSProperties}
                  />
                  {playerMax?.[prLift] != null && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-gray-600 pointer-events-none">
                      PR {playerMax[prLift]}
                    </span>
                  )}
                </div>
                <button
                  onClick={logMax}
                  disabled={prSaving || !prWeight}
                  className="shrink-0 px-4 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-40 transition-colors flex items-center gap-1.5"
                  style={{ backgroundColor: "var(--color-mustang-red)" }}
                >
                  {prSaving ? (
                    <RefreshCw size={13} className="animate-spin" />
                  ) : prSaved ? (
                    <Check size={13} />
                  ) : null}
                  {prSaved ? "Saved!" : "Log"}
                </button>
              </div>

              {/* Current maxes summary */}
              {playerMax &&
                (playerMax.back_squat ||
                  playerMax.power_clean ||
                  playerMax.bench_press) && (
                  <div className="grid grid-cols-3 gap-1.5 pt-3 border-t border-gray-800">
                    {(["back_squat", "power_clean", "bench_press"] as const).map(
                      (lift) => (
                        <div key={lift} className="text-center">
                          <p className="text-[10px] font-mono text-gray-600 uppercase">
                            {lift === "back_squat"
                              ? "Squat"
                              : lift === "power_clean"
                              ? "Clean"
                              : "Bench"}
                          </p>
                          <p className="text-sm font-bold text-white mt-0.5">
                            {playerMax[lift] ?? (
                              <span className="text-gray-700">—</span>
                            )}
                          </p>
                        </div>
                      )
                    )}
                  </div>
                )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
