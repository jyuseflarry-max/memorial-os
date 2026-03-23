"use client";

import { useState, useRef, useCallback } from "react";
import { Sparkles, Mic, MicOff, Loader2, ChevronDown, ChevronUp, RotateCcw, Check } from "lucide-react";

// ── Web Speech API types ──────────────────────────────────────────────────

interface ISpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: ((e: { results: { [k: number]: { [k: number]: { transcript: string } } } }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition: new () => ISpeechRecognition;
    webkitSpeechRecognition: new () => ISpeechRecognition;
  }
}

// ── Types ─────────────────────────────────────────────────────────────────

export interface GeneratedDrill {
  drill_id: string;
  duration: number;
}

interface APIResponse {
  type: "plan" | "clarification";
  plan?: GeneratedDrill[];
  rationale?: string;
  clarification?: string;
  error?: string;
}

interface Props {
  playerCount: number;
  teamName?: string;
  onLoadPlan: (plan: GeneratedDrill[]) => void;
}

// ── Component ─────────────────────────────────────────────────────────────

export default function AIGeneratorPanel({ playerCount, teamName, onLoadPlan }: Props) {
  const [open, setOpen]               = useState(false);
  const [prompt, setPrompt]           = useState("");
  const [loading, setLoading]         = useState(false);
  const [listening, setListening]     = useState(false);
  const [result, setResult]           = useState<APIResponse | null>(null);
  const [clarifyInput, setClarifyInput] = useState("");
  const [loaded, setLoaded]           = useState(false);

  const recognitionRef = useRef<ISpeechRecognition | null>(null);
  const textareaRef    = useRef<HTMLTextAreaElement>(null);

  // ── Voice input ───────────────────────────────────────────────────────

  function toggleVoice() {
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }

    const SR = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!SR) {
      alert("Voice input is not supported in this browser. Try Chrome or Edge.");
      return;
    }

    const rec = new SR();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = "en-US";

    rec.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      setPrompt((prev) => (prev ? `${prev} ${transcript}` : transcript));
      setListening(false);
    };
    rec.onerror = () => setListening(false);
    rec.onend   = () => setListening(false);

    recognitionRef.current = rec;
    rec.start();
    setListening(true);
  }

  // ── Generate ──────────────────────────────────────────────────────────

  const generate = useCallback(async (overridePrompt?: string) => {
    const finalPrompt = overridePrompt ?? prompt;
    if (!finalPrompt.trim()) return;

    setLoading(true);
    setResult(null);
    setLoaded(false);

    try {
      const res = await fetch("/api/planner/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: finalPrompt,
          player_count: playerCount,
          team_name: teamName,
        }),
      });
      const data: APIResponse = await res.json();
      if (!res.ok || data.error) {
        setResult({ type: "clarification", clarification: data.error ?? "Something went wrong. Please try again." });
      } else {
        setResult(data);
      }
    } finally {
      setLoading(false);
    }
  }, [prompt, playerCount, teamName]);

  function handleClarifySubmit() {
    if (!clarifyInput.trim()) return;
    const combined = `${prompt}\n\n${clarifyInput}`;
    setPrompt(combined);
    setClarifyInput("");
    generate(combined);
  }

  function handleLoadPlan() {
    if (!result?.plan) return;
    onLoadPlan(result.plan);
    setLoaded(true);
  }

  function reset() {
    setResult(null);
    setPrompt("");
    setClarifyInput("");
    setLoaded(false);
    setTimeout(() => textareaRef.current?.focus(), 50);
  }

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <div className="bg-gray-800/60 border border-gray-700 rounded-2xl overflow-hidden print:hidden">
      {/* ── Header / toggle ── */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-800 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-md bg-mustang-red/20 border border-mustang-red/40 flex items-center justify-center shrink-0">
            <Sparkles size={12} className="text-mustang-red" />
          </div>
          <span className="text-sm font-semibold text-white">AI Practice Generator</span>
          <span className="text-[10px] font-mono text-gray-500 bg-gray-700 px-1.5 py-0.5 rounded">
            BETA
          </span>
        </div>
        {open ? (
          <ChevronUp size={15} className="text-gray-500" />
        ) : (
          <ChevronDown size={15} className="text-gray-500" />
        )}
      </button>

      {/* ── Expanded panel ── */}
      {open && (
        <div className="px-4 pb-4 border-t border-gray-700 pt-4 flex flex-col gap-4">

          {/* Prompt area */}
          {!result && (
            <>
              <div className="relative">
                <textarea
                  ref={textareaRef}
                  rows={4}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) generate();
                  }}
                  placeholder={`Describe the practice you want to build…\n\ne.g. "90 minutes focusing on defense — specifically closeouts and help rotations — plus transition offense. Everyone should get at least 200 shots."`}
                  className="w-full bg-gray-900 border border-gray-700 focus:border-mustang-red/60 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none resize-none leading-relaxed transition-colors"
                />
                <p className="absolute bottom-2 right-3 text-[10px] font-mono text-gray-700 pointer-events-none">
                  ⌘↵ to generate
                </p>
              </div>

              <div className="flex items-center gap-2">
                {/* Voice input */}
                <button
                  type="button"
                  onClick={toggleVoice}
                  title={listening ? "Stop recording" : "Speak your request"}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                    listening
                      ? "bg-red-500/20 border-red-500/50 text-red-400 animate-pulse"
                      : "bg-gray-700 border-gray-600 text-gray-400 hover:text-white hover:bg-gray-600"
                  }`}
                >
                  {listening ? <MicOff size={13} /> : <Mic size={13} />}
                  {listening ? "Listening…" : "Voice"}
                </button>

                {/* Generate */}
                <button
                  type="button"
                  onClick={() => generate()}
                  disabled={loading || !prompt.trim()}
                  className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-mustang-red hover:bg-mustang-red-dark disabled:opacity-40 text-white text-sm font-semibold transition-colors"
                >
                  {loading ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Analyzing your drill library…
                    </>
                  ) : (
                    <>
                      <Sparkles size={14} />
                      Generate Plan
                    </>
                  )}
                </button>
              </div>
            </>
          )}

          {/* ── Clarification ── */}
          {result?.type === "clarification" && (
            <div className="flex flex-col gap-3">
              <div className="bg-amber-900/20 border border-amber-600/30 rounded-xl px-4 py-3">
                <p className="text-xs font-mono text-amber-400 uppercase tracking-wider mb-1">
                  Need a bit more info
                </p>
                <p className="text-sm text-amber-100/80 leading-relaxed">
                  {result.clarification}
                </p>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  autoFocus
                  value={clarifyInput}
                  onChange={(e) => setClarifyInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleClarifySubmit()}
                  placeholder="Your answer…"
                  className="flex-1 bg-gray-900 border border-gray-700 focus:border-mustang-red/60 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none transition-colors"
                />
                <button
                  type="button"
                  onClick={handleClarifySubmit}
                  disabled={!clarifyInput.trim()}
                  className="px-4 py-2 rounded-xl bg-mustang-red hover:bg-mustang-red-dark disabled:opacity-40 text-white text-sm font-semibold transition-colors"
                >
                  Continue
                </button>
              </div>

              <button
                type="button"
                onClick={reset}
                className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors self-start"
              >
                <RotateCcw size={11} /> Start over
              </button>
            </div>
          )}

          {/* ── Generated plan ── */}
          {result?.type === "plan" && result.plan && (
            <div className="flex flex-col gap-3">
              {/* Rationale */}
              <div className="bg-green-900/20 border border-green-700/30 rounded-xl px-4 py-3">
                <p className="text-xs font-mono text-green-400 uppercase tracking-wider mb-1">
                  Plan Ready · {result.plan.length} drills ·{" "}
                  {result.plan.reduce((s, d) => s + d.duration, 0)} min
                </p>
                <p className="text-sm text-green-100/80 leading-relaxed">
                  {result.rationale}
                </p>
              </div>

              {/* Drill list preview */}
              <div className="bg-gray-900 border border-gray-700 rounded-xl divide-y divide-gray-800 text-xs font-mono overflow-hidden">
                {result.plan.map((item, i) => (
                  <div key={i} className="flex items-center justify-between px-3 py-2">
                    <span className="text-gray-400">{item.drill_id.slice(0, 8)}…</span>
                    <span className="text-white">{item.duration} min</span>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleLoadPlan}
                  disabled={loaded}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                    loaded
                      ? "bg-green-600/20 border border-green-600/40 text-green-400"
                      : "bg-mustang-red hover:bg-mustang-red-dark text-white"
                  }`}
                >
                  {loaded ? (
                    <><Check size={14} /> Loaded into Timeline</>
                  ) : (
                    <><Sparkles size={14} /> Load Plan</>
                  )}
                </button>
                <button
                  type="button"
                  onClick={reset}
                  className="px-3 py-2.5 rounded-xl border border-gray-600 text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
                  title="Start over"
                >
                  <RotateCcw size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
