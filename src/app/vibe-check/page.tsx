"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePlayers } from "@/context/PlayerContext";
import { VibeScale, computeVibeScore } from "@/types/player";
import { CheckCircle, ChevronRight, ChevronLeft, Moon, Zap, Brain, Smile } from "lucide-react";
import PlayerShell from "@/components/PlayerShell";
import { TrafficLightBadge, READINESS_LABELS } from "@/components/strength/TrafficLightBadge";
import { vibeToReadinessStatus, readinessLoadFactor } from "@/lib/strength-utils";

// ── Types ─────────────────────────────────────────────────────────────────

interface FormState {
  playerId: string;
  sleepHours: number;
  soreness: VibeScale;
  stress: VibeScale;
  moodEnergy: VibeScale;
}

// ── Step definitions ──────────────────────────────────────────────────────

const STEPS = ["intro", "sleep", "soreness", "stress", "mood", "done"] as const;
type Step = (typeof STEPS)[number];

// ── Sub-components ────────────────────────────────────────────────────────

function ProgressBar({ step }: { step: number }) {
  const total = 4;
  const filled = Math.min(step, total);
  return (
    <div className="flex gap-1.5 w-full">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
            i < filled ? "bg-coaches-red" : "bg-gray-700"
          }`}
        />
      ))}
    </div>
  );
}

function ScaleButtons({
  value,
  onChange,
  lowLabel,
  highLabel,
}: {
  value: VibeScale;
  onChange: (v: VibeScale) => void;
  lowLabel: string;
  highLabel: string;
}) {
  return (
    <div className="flex flex-col gap-3 w-full">
      <div className="flex gap-3">
        {([1, 2, 3, 4, 5] as VibeScale[]).map((n) => (
          <button
            key={n}
            style={{ touchAction: "manipulation" }}
            onClick={() => onChange(n)}
            className={`flex-1 rounded-2xl text-xl font-bold min-h-[56px] transition-colors duration-150 ${
              value === n
                ? "bg-coaches-red text-white shadow-lg shadow-coaches-red/30"
                : "bg-gray-800 text-gray-400 border border-gray-700"
            }`}
          >
            {n}
          </button>
        ))}
      </div>
      <div className="flex justify-between text-xs text-gray-500 font-mono px-1">
        <span>{lowLabel}</span>
        <span>{highLabel}</span>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────

export default function VibeCheckPage() {
  const router = useRouter();
  const { players } = usePlayers();
  const [stepIndex, setStepIndex] = useState(0);
  const [form, setForm] = useState<FormState>({
    playerId: "",
    sleepHours: 7,
    soreness: 3,
    stress: 3,
    moodEnergy: 3,
  });
  const [submittedScore, setSubmittedScore] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [autoPlayer, setAutoPlayer] = useState<{ id: string; name: string } | null>(null);
  const [autoLoading, setAutoLoading] = useState(true);

  // Try to auto-detect the logged-in player
  useEffect(() => {
    fetch("/api/auth/me")
      .then(r => r.json())
      .then(d => {
        if (d?.playerId) {
          setAutoPlayer({ id: d.playerId, name: d.fullName ?? "" });
          setForm(f => ({ ...f, playerId: d.playerId }));
          // Skip intro name selector — go straight to first question
          setStepIndex(1);
        }
      })
      .catch(() => {})
      .finally(() => setAutoLoading(false));
  }, []);

  const step = STEPS[stepIndex];
  const surveyStep = stepIndex - 1;

  // Auto-redirect home after submission
  useEffect(() => {
    if (step !== "done") return;
    const t = setTimeout(() => router.push("/schedules/weekly"), 3500);
    return () => clearTimeout(t);
  }, [step, router]);

  async function next() {
    if (step === "mood") {
      const score = computeVibeScore(
        form.sleepHours,
        form.soreness,
        form.stress,
        form.moodEnergy
      );
      setSubmittedScore(score);
      setSubmitting(true);
      try {
        await fetch("/api/vibe-checks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            player_id:   form.playerId,
            sleep_hours: form.sleepHours,
            soreness:    form.soreness,
            stress:      form.stress,
            mood_energy: form.moodEnergy,
            vibe_score:  score,
          }),
        });
      } finally {
        setSubmitting(false);
      }
    }
    setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
  }

  function back() {
    setStepIndex((i) => Math.max(i - 1, 0));
  }

  const selectedPlayer = autoPlayer ?? players.find((p) => p.id === form.playerId);

  // Readiness status derived from submitted inputs
  const readinessStatus = submittedScore !== null
    ? vibeToReadinessStatus(form.sleepHours, form.soreness, form.moodEnergy, form.stress)
    : null;
  const loadPct = readinessStatus ? Math.round(readinessLoadFactor(readinessStatus) * 100) : null;

  if (autoLoading) return null;

  return (
    <PlayerShell>
      <div className="min-h-[70vh] flex flex-col items-center justify-center px-1">
      <div className="w-full max-w-sm flex flex-col gap-6">
        {/* Progress */}
        {step !== "intro" && step !== "done" && (
          <ProgressBar step={surveyStep} />
        )}

        {/* ── Intro (only shown when not auto-detected) ────────────── */}
        {step === "intro" && (
          <div className="flex flex-col gap-6">
            <div>
              <h1 className="text-white text-3xl font-bold leading-tight">
                How are you feeling today?
              </h1>
              <p className="text-gray-400 mt-2 text-sm leading-relaxed">
                4 quick questions. Takes under a minute. Your coaches use this to keep you healthy.
              </p>
            </div>

            <div>
              <label className="block text-xs font-mono text-gray-400 mb-2 uppercase tracking-wider">
                Select your name
              </label>
              <select
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3.5 text-white text-base focus:outline-none focus:border-coaches-red transition-colors"
                value={form.playerId}
                onChange={(e) => setForm((f) => ({ ...f, playerId: e.target.value }))}
              >
                <option value="">— Pick your name —</option>
                {players.map((p) => (
                  <option key={p.id} value={p.id}>
                    #{p.jersey_number} {p.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              disabled={!form.playerId}
              style={{ touchAction: "manipulation" }}
              onClick={next}
              className="flex items-center justify-center gap-2 w-full min-h-[56px] rounded-2xl bg-coaches-red disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-base transition-colors"
            >
              Let&apos;s go <ChevronRight size={18} />
            </button>
          </div>
        )}

        {/* ── Sleep ──────────────────────────────────────────────── */}
        {step === "sleep" && (
          <div className="flex flex-col gap-6">
            {autoPlayer && (
              <p className="text-gray-500 text-sm font-mono">Hey {autoPlayer.name.split(" ")[0]} 👋</p>
            )}
            <div className="flex items-center gap-3">
              <Moon size={28} className="text-coaches-red shrink-0" />
              <h2 className="text-white text-2xl font-bold leading-tight">
                How many hours did you sleep?
              </h2>
            </div>

            <div className="flex flex-col gap-2">
              <div className="text-6xl font-bold text-white text-center font-mono py-4">
                {form.sleepHours.toFixed(1)}
                <span className="text-2xl text-gray-500 font-normal ml-2">hrs</span>
              </div>
              <input
                type="range"
                min={3}
                max={12}
                step={0.5}
                value={form.sleepHours}
                onChange={(e) => setForm((f) => ({ ...f, sleepHours: parseFloat(e.target.value) }))}
                className="w-full accent-coaches-red h-2"
              />
              <div className="flex justify-between text-xs text-gray-500 font-mono">
                <span>3 hrs</span>
                <span>12 hrs</span>
              </div>
            </div>
          </div>
        )}

        {/* ── Soreness ───────────────────────────────────────────── */}
        {step === "soreness" && (
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-3">
              <Zap size={28} className="text-coaches-red shrink-0" />
              <h2 className="text-white text-2xl font-bold leading-tight">
                Muscle soreness level?
              </h2>
            </div>
            <ScaleButtons
              value={form.soreness}
              onChange={(v) => setForm((f) => ({ ...f, soreness: v }))}
              lowLabel="No soreness"
              highLabel="Extremely sore"
            />
          </div>
        )}

        {/* ── Stress ─────────────────────────────────────────────── */}
        {step === "stress" && (
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-3">
              <Brain size={28} className="text-coaches-red shrink-0" />
              <h2 className="text-white text-2xl font-bold leading-tight">
                Stress level right now?
              </h2>
            </div>
            <ScaleButtons
              value={form.stress}
              onChange={(v) => setForm((f) => ({ ...f, stress: v }))}
              lowLabel="Totally chill"
              highLabel="Very stressed"
            />
          </div>
        )}

        {/* ── Mood / Energy ───────────────────────────────────────── */}
        {step === "mood" && (
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-3">
              <Smile size={28} className="text-coaches-red shrink-0" />
              <h2 className="text-white text-2xl font-bold leading-tight">
                Mood and energy today?
              </h2>
            </div>
            <ScaleButtons
              value={form.moodEnergy}
              onChange={(v) => setForm((f) => ({ ...f, moodEnergy: v }))}
              lowLabel="Low energy"
              highLabel="Feeling great"
            />
          </div>
        )}

        {/* ── Done ───────────────────────────────────────────────── */}
        {step === "done" && submittedScore !== null && readinessStatus && (
          <div className="flex flex-col items-center gap-5 text-center">
            <CheckCircle size={56} className="text-green-400" />
            <div>
              <h2 className="text-white text-2xl font-bold">Locked in.</h2>
              <p className="text-gray-400 mt-1 text-sm">
                Thanks{selectedPlayer ? `, ${selectedPlayer.name.split(" ")[0]}` : ""}. Your coaches have your data.
              </p>
            </div>

            {/* Vibe score */}
            <div className="bg-gray-800 border border-gray-700 rounded-2xl px-8 py-4 flex flex-col items-center gap-1 w-full">
              <p className="text-5xl font-bold font-mono text-white">
                {submittedScore.toFixed(1)}
                <span className="text-gray-500 text-xl font-normal"> / 5</span>
              </p>
              <p className="text-xs font-mono text-gray-400 uppercase tracking-wider">
                Vibe Score
              </p>
            </div>

            {/* Readiness + load recommendation */}
            <div className="bg-gray-800 border border-gray-700 rounded-2xl px-6 py-4 flex flex-col items-center gap-3 w-full">
              <TrafficLightBadge status={readinessStatus} size="lg" pulse />
              <div>
                <p className="text-white font-semibold">{READINESS_LABELS[readinessStatus]}</p>
                <p className="text-gray-400 text-sm mt-1">
                  Recommended load today:{" "}
                  <span className="text-white font-bold">{loadPct}%</span>
                </p>
              </div>
              {readinessStatus === "red" && (
                <p className="text-red-400 text-xs font-mono">Consider a recovery session today.</p>
              )}
              {readinessStatus === "yellow" && (
                <p className="text-yellow-400 text-xs font-mono">Reduce intensity by ~10% today.</p>
              )}
            </div>

            <p className="text-gray-600 text-xs font-mono">Heading back to your schedule…</p>
          </div>
        )}

        {/* ── Nav buttons (not shown on intro/done) ──────────────── */}
        {step !== "intro" && step !== "done" && (
          <div className="flex gap-3 pt-2">
            <button
              style={{ touchAction: "manipulation" }}
              onClick={back}
              className="flex items-center justify-center px-5 min-h-[56px] rounded-2xl border border-gray-700 text-gray-400 transition-colors"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              disabled={submitting}
              style={{ touchAction: "manipulation" }}
              onClick={next}
              className="flex-1 flex items-center justify-center gap-2 min-h-[56px] rounded-2xl bg-coaches-red disabled:opacity-50 text-white font-semibold text-base transition-colors"
            >
              {submitting ? "Saving…" : step === "mood" ? "Submit" : "Next"} <ChevronRight size={18} />
            </button>
          </div>
        )}
      </div>
      </div>
    </PlayerShell>
  );
}
