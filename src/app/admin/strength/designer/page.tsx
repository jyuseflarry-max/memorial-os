"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Plus, Trash2, Loader2, CheckCircle2, ChevronRight,
  Dumbbell, FlaskConical, X, GripVertical, AlertCircle,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";

// ── Types ──────────────────────────────────────────────────────────────────

type MaxRef = "back_squat" | "power_clean" | "bench_press" | null;

interface Exercise {
  id:       string;
  name:     string;
  category: string;
  max_ref:  MaxRef;
}

interface Block {
  id:            string;
  exercise_id:   string;
  exercise_name: string;
  max_ref:       MaxRef;
  percentage:    number;
  sets:          number;
  reps:          number;
  notes:         string;
}

interface Phase {
  id:          string;
  name:        string;
  description: string | null;
  blocks:      Block[];
  created_at:  string;
  updated_at:  string;
}

type SaveStatus = "idle" | "saving" | "saved" | "error";

// ── Constants ──────────────────────────────────────────────────────────────

const MAX_REF_LABELS: Record<string, string> = {
  back_squat:  "Back Squat",
  power_clean: "Power Clean",
  bench_press: "Bench Press",
};

const PREVIEW_MAXES = [100, 150, 200, 250];

// ── Helpers ────────────────────────────────────────────────────────────────

function calcWeight(max: number, pct: number): string {
  const raw     = max * (pct / 100);
  const rounded = Math.round(raw / 5) * 5;
  return `${rounded}`;
}

function newBlockId(): string {
  return crypto.randomUUID();
}

function emptyBlock(ex: Exercise): Block {
  return {
    id:            newBlockId(),
    exercise_id:   ex.id,
    exercise_name: ex.name,
    max_ref:       ex.max_ref,
    percentage:    75,
    sets:          3,
    reps:          5,
    notes:         "",
  };
}

// ── Live Preview panel ─────────────────────────────────────────────────────

function LivePreview({ blocks }: { blocks: Block[] }) {
  const calcBlocks = blocks.filter((b) => b.max_ref !== null && b.percentage > 0);

  if (calcBlocks.length === 0) {
    return (
      <div className="bg-gray-900/50 border border-gray-700/50 rounded-xl p-4 text-center">
        <FlaskConical size={18} className="text-gray-700 mx-auto mb-2" />
        <p className="text-gray-600 font-mono text-[10px] uppercase tracking-widest">
          Add blocks with a max reference to see the live preview
        </p>
      </div>
    );
  }

  return (
    <div className="bg-gray-900/50 border border-gray-700/50 rounded-xl overflow-hidden">
      <div className="px-4 py-2.5 border-b border-gray-700/50 flex items-center gap-2">
        <FlaskConical size={13} className="text-sky-400" />
        <p className="text-sky-400 text-[10px] font-mono uppercase tracking-widest font-bold">Live Preview</p>
        <span className="text-gray-600 text-[10px] font-mono ml-1">— calculated weights by reference max</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-700/50">
              <th className="px-4 py-2 text-left text-[10px] font-mono text-gray-500 uppercase tracking-wider">Exercise</th>
              <th className="px-4 py-2 text-center text-[10px] font-mono text-gray-500 uppercase tracking-wider">Sets × Reps</th>
              <th className="px-4 py-2 text-center text-[10px] font-mono text-gray-500 uppercase tracking-wider">%</th>
              {PREVIEW_MAXES.map((m) => (
                <th key={m} className="px-3 py-2 text-center text-[10px] font-mono text-gray-400 uppercase tracking-wider">
                  {m}lb max
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {calcBlocks.map((b) => (
              <tr key={b.id} className="border-b border-gray-700/30 last:border-0 hover:bg-gray-800/30 transition-colors">
                <td className="px-4 py-2.5">
                  <p className="text-white font-medium">{b.exercise_name}</p>
                  {b.max_ref && (
                    <p className="text-gray-600 text-[9px] font-mono mt-0.5">
                      based on {MAX_REF_LABELS[b.max_ref]}
                    </p>
                  )}
                </td>
                <td className="px-4 py-2.5 text-center font-mono text-gray-300">
                  {b.sets}×{b.reps}
                </td>
                <td className="px-4 py-2.5 text-center">
                  <span className="font-mono font-bold text-mustang-red">{b.percentage}%</span>
                </td>
                {PREVIEW_MAXES.map((m) => (
                  <td key={m} className="px-3 py-2.5 text-center">
                    <span className="font-mono font-semibold text-white">{calcWeight(m, b.percentage)}</span>
                    <span className="text-gray-600 text-[9px] ml-0.5">lbs</span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="px-4 pb-2.5 text-[9px] font-mono text-gray-700">
        Weights rounded to nearest 5 lbs · blocks without a max reference are excluded
      </p>
    </div>
  );
}

// ── Block editor row ───────────────────────────────────────────────────────

function BlockRow({
  block,
  exercises,
  onChange,
  onRemove,
}: {
  block:     Block;
  exercises: Exercise[];
  onChange:  (updated: Block) => void;
  onRemove:  () => void;
}) {
  function set<K extends keyof Block>(key: K, val: Block[K]) {
    onChange({ ...block, [key]: val });
  }

  function selectExercise(exId: string) {
    const ex = exercises.find((e) => e.id === exId);
    if (!ex) return;
    onChange({ ...block, exercise_id: ex.id, exercise_name: ex.name, max_ref: ex.max_ref });
  }

  const inputCls = "bg-gray-950 border border-gray-700 rounded-lg px-2 py-1.5 text-sm text-white font-mono focus:outline-none focus:border-mustang-red transition-colors w-full";

  // Group exercises by category for the select
  const grouped = exercises.reduce<Record<string, Exercise[]>>((acc, ex) => {
    const cat = ex.category || "Other";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(ex);
    return acc;
  }, {});

  return (
    <div className="bg-gray-900/60 border border-gray-700/50 rounded-xl p-4 flex flex-col gap-3">
      <div className="flex items-start gap-3">
        {/* Drag handle (visual only) */}
        <div className="mt-2 text-gray-700 cursor-grab shrink-0">
          <GripVertical size={14} />
        </div>

        <div className="flex-1 grid grid-cols-1 sm:grid-cols-[1fr_auto_auto_auto] gap-3 items-start">
          {/* Exercise selector */}
          <div className="flex flex-col gap-1">
            <label className="text-[9px] font-mono text-gray-500 uppercase tracking-wider">Exercise</label>
            <select
              value={block.exercise_id}
              onChange={(e) => selectExercise(e.target.value)}
              className={inputCls + " appearance-none"}
            >
              {Object.entries(grouped).map(([cat, exs]) => (
                <optgroup key={cat} label={cat}>
                  {exs.map((ex) => (
                    <option key={ex.id} value={ex.id}>{ex.name}</option>
                  ))}
                </optgroup>
              ))}
            </select>
            {block.max_ref && (
              <p className="text-[9px] font-mono text-gray-600">
                % based on {MAX_REF_LABELS[block.max_ref]}
              </p>
            )}
            {!block.max_ref && (
              <p className="text-[9px] font-mono text-amber-600">No max reference — excluded from preview</p>
            )}
          </div>

          {/* Percentage */}
          <div className="flex flex-col gap-1">
            <label className="text-[9px] font-mono text-gray-500 uppercase tracking-wider">% of Max</label>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => set("percentage", Math.max(5, block.percentage - 5))}
                className="w-7 h-8 flex items-center justify-center rounded-lg bg-gray-800 border border-gray-700 text-white hover:bg-gray-700 transition-colors text-xs font-bold"
              >−</button>
              <input
                type="number"
                min={5}
                max={110}
                step={5}
                value={block.percentage}
                onChange={(e) => set("percentage", Math.min(110, Math.max(5, parseInt(e.target.value) || 75)))}
                className="w-14 bg-gray-950 border border-gray-700 rounded-lg px-2 py-1.5 text-sm text-mustang-red font-mono font-bold text-center focus:outline-none focus:border-mustang-red"
              />
              <button
                type="button"
                onClick={() => set("percentage", Math.min(110, block.percentage + 5))}
                className="w-7 h-8 flex items-center justify-center rounded-lg bg-gray-800 border border-gray-700 text-white hover:bg-gray-700 transition-colors text-xs font-bold"
              >+</button>
              <span className="text-gray-600 font-mono text-xs">%</span>
            </div>
          </div>

          {/* Sets */}
          <div className="flex flex-col gap-1">
            <label className="text-[9px] font-mono text-gray-500 uppercase tracking-wider">Sets</label>
            <input
              type="number"
              min={1}
              max={20}
              value={block.sets}
              onChange={(e) => set("sets", Math.max(1, parseInt(e.target.value) || 1))}
              className="w-16 bg-gray-950 border border-gray-700 rounded-lg px-2 py-1.5 text-sm text-white font-mono text-center focus:outline-none focus:border-mustang-red transition-colors"
            />
          </div>

          {/* Reps */}
          <div className="flex flex-col gap-1">
            <label className="text-[9px] font-mono text-gray-500 uppercase tracking-wider">Reps</label>
            <input
              type="number"
              min={1}
              max={50}
              value={block.reps}
              onChange={(e) => set("reps", Math.max(1, parseInt(e.target.value) || 1))}
              className="w-16 bg-gray-950 border border-gray-700 rounded-lg px-2 py-1.5 text-sm text-white font-mono text-center focus:outline-none focus:border-mustang-red transition-colors"
            />
          </div>
        </div>

        {/* Remove */}
        <button
          onClick={onRemove}
          className="mt-6 w-7 h-7 flex items-center justify-center rounded-lg text-gray-600 hover:text-mustang-red hover:bg-mustang-red/10 transition-colors shrink-0"
        >
          <X size={13} />
        </button>
      </div>

      {/* Notes */}
      <div className="ml-5">
        <input
          type="text"
          value={block.notes}
          onChange={(e) => set("notes", e.target.value)}
          placeholder="Notes (optional) — e.g. pause at bottom, touch and go…"
          className="w-full bg-transparent border-0 border-b border-gray-800 text-gray-500 text-xs font-mono py-1 focus:outline-none focus:border-gray-600 transition-colors placeholder-gray-700"
        />
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function DesignerPage() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [phases,    setPhases]    = useState<Phase[]>([]);
  const [loadingEx, setLoadingEx] = useState(true);
  const [loadingPh, setLoadingPh] = useState(true);

  const [activeId,    setActiveId]    = useState<string | null>(null);
  const [editing,     setEditing]     = useState<Phase | null>(null);
  const [saveStatus,  setSaveStatus]  = useState<SaveStatus>("idle");
  const [creatingNew, setCreatingNew] = useState(false);
  const [newName,     setNewName]     = useState("");
  const [showNewForm, setShowNewForm] = useState(false);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load exercises
  useEffect(() => {
    fetch("/api/strength/exercises")
      .then((r) => r.json())
      .then((d) => setExercises(Array.isArray(d) ? d : []))
      .finally(() => setLoadingEx(false));
  }, []);

  // Load phases
  useEffect(() => {
    fetch("/api/strength/phases")
      .then((r) => r.json())
      .then((d: Phase[]) => {
        setPhases(Array.isArray(d) ? d : []);
        if (d.length > 0 && !activeId) {
          setActiveId(d[0].id);
          setEditing(d[0]);
        }
      })
      .finally(() => setLoadingPh(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-save editing phase on change
  const scheduleSave = useCallback((phase: Phase) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSaveStatus("saving");
    saveTimer.current = setTimeout(async () => {
      const res = await fetch(`/api/strength/phases/${phase.id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ name: phase.name, description: phase.description, blocks: phase.blocks }),
      });
      if (res.ok) {
        const saved = await res.json();
        setPhases((prev) => prev.map((p) => p.id === saved.id ? saved : p));
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 2500);
      } else {
        setSaveStatus("error");
      }
    }, 700);
  }, []);

  function patchEditing(updates: Partial<Phase>) {
    if (!editing) return;
    const next = { ...editing, ...updates };
    setEditing(next);
    scheduleSave(next);
  }

  function selectPhase(phase: Phase) {
    setActiveId(phase.id);
    setEditing({ ...phase });
    setSaveStatus("idle");
  }

  // ── New phase ────────────────────────────────────────────────────────────

  async function handleCreate() {
    if (!newName.trim()) return;
    setCreatingNew(true);
    const res  = await fetch("/api/strength/phases", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ name: newName.trim() }),
    });
    const data: Phase = await res.json();
    setPhases((prev) => [data, ...prev]);
    setActiveId(data.id);
    setEditing(data);
    setSaveStatus("idle");
    setNewName("");
    setShowNewForm(false);
    setCreatingNew(false);
  }

  // ── Delete phase ──────────────────────────────────────────────────────────

  async function handleDeletePhase() {
    if (!editing) return;
    if (!confirm(`Delete "${editing.name}"? This cannot be undone.`)) return;
    await fetch(`/api/strength/phases/${editing.id}`, { method: "DELETE" });
    const remaining = phases.filter((p) => p.id !== editing.id);
    setPhases(remaining);
    if (remaining.length > 0) {
      setActiveId(remaining[0].id);
      setEditing(remaining[0]);
    } else {
      setActiveId(null);
      setEditing(null);
    }
    setSaveStatus("idle");
  }

  // ── Block operations ──────────────────────────────────────────────────────

  function addBlock() {
    if (!editing || exercises.length === 0) return;
    const block = emptyBlock(exercises[0]);
    patchEditing({ blocks: [...editing.blocks, block] });
  }

  function updateBlock(blockId: string, updated: Block) {
    if (!editing) return;
    patchEditing({ blocks: editing.blocks.map((b) => b.id === blockId ? updated : b) });
  }

  function removeBlock(blockId: string) {
    if (!editing) return;
    patchEditing({ blocks: editing.blocks.filter((b) => b.id !== blockId) });
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const isLoading = loadingEx || loadingPh;

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-white text-2xl font-bold tracking-tight">Iron Lab</h1>
        <p className="text-gray-400 text-sm mt-0.5 font-mono">DESIGNER · BUILD STRENGTH PHASES</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 size={22} className="animate-spin text-mustang-red" />
        </div>
      ) : (
        <div className="flex gap-5 items-start">

          {/* ── Phase list (left column) ──────────────────────────────── */}
          <div className="w-56 shrink-0 flex flex-col gap-2">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">Phases</p>
              <button
                onClick={() => setShowNewForm((v) => !v)}
                className="w-6 h-6 flex items-center justify-center rounded-lg text-gray-500
                           hover:text-white hover:bg-gray-700 transition-colors"
                title="New Phase"
              >
                <Plus size={14} />
              </button>
            </div>

            {/* New phase form */}
            {showNewForm && (
              <div className="bg-gray-800 border border-mustang-red/40 rounded-xl p-3 flex flex-col gap-2 mb-1">
                <input
                  autoFocus
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); if (e.key === "Escape") setShowNewForm(false); }}
                  placeholder="Phase name…"
                  className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-mustang-red transition-colors w-full"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowNewForm(false)}
                    className="flex-1 py-1.5 rounded-lg border border-gray-700 text-gray-400 text-xs hover:text-white transition-colors"
                  >Cancel</button>
                  <button
                    onClick={handleCreate}
                    disabled={!newName.trim() || creatingNew}
                    className="flex-1 py-1.5 rounded-lg bg-mustang-red hover:bg-mustang-red-dark text-white text-xs font-semibold disabled:opacity-50 transition-colors"
                  >
                    {creatingNew ? <Loader2 size={11} className="animate-spin mx-auto" /> : "Create"}
                  </button>
                </div>
              </div>
            )}

            {/* Phase list items */}
            {phases.length === 0 ? (
              <p className="text-gray-700 font-mono text-[10px] text-center py-4">No phases yet</p>
            ) : (
              phases.map((phase) => (
                <button
                  key={phase.id}
                  onClick={() => selectPhase(phase)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-medium transition-colors flex items-center justify-between gap-2 ${
                    activeId === phase.id
                      ? "bg-mustang-red/15 border border-mustang-red/30 text-white"
                      : "text-gray-400 hover:bg-gray-800 hover:text-white border border-transparent"
                  }`}
                >
                  <span className="truncate">{phase.name}</span>
                  {activeId === phase.id && <ChevronRight size={12} className="text-mustang-red shrink-0" />}
                </button>
              ))
            )}
          </div>

          {/* ── Phase editor (right) ───────────────────────────────────── */}
          {editing ? (
            <div className="flex-1 min-w-0 flex flex-col gap-4">

              {/* Phase header */}
              <div className="bg-gray-800 border border-gray-700 rounded-2xl p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between gap-3">
                  <input
                    type="text"
                    value={editing.name}
                    onChange={(e) => patchEditing({ name: e.target.value })}
                    className="flex-1 bg-transparent text-white font-bold text-lg focus:outline-none
                               border-b border-transparent focus:border-gray-600 transition-colors pb-0.5"
                    placeholder="Phase name"
                  />
                  <div className="flex items-center gap-2 shrink-0">
                    {saveStatus === "saving" && <Loader2 size={13} className="animate-spin text-gray-500" />}
                    {saveStatus === "saved"  && <CheckCircle2 size={13} className="text-emerald-400" />}
                    {saveStatus === "error"  && <AlertCircle  size={13} className="text-mustang-red" />}
                    <span className="text-[10px] font-mono text-gray-600">
                      {saveStatus === "saving" ? "Saving…" : saveStatus === "saved" ? "Saved" : saveStatus === "error" ? "Error" : "Auto-saved"}
                    </span>
                    <button
                      onClick={handleDeletePhase}
                      className="ml-2 text-gray-600 hover:text-mustang-red transition-colors"
                      title="Delete phase"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <input
                  type="text"
                  value={editing.description ?? ""}
                  onChange={(e) => patchEditing({ description: e.target.value || null })}
                  className="bg-transparent text-gray-500 text-sm focus:outline-none
                             border-b border-transparent focus:border-gray-700 transition-colors pb-0.5 w-full"
                  placeholder="Description (optional) — e.g. Summer Strength Block, Week 1"
                />
              </div>

              {/* Blocks */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">
                    Blocks — {editing.blocks.length} exercise{editing.blocks.length !== 1 ? "s" : ""}
                  </p>
                </div>

                {editing.blocks.length === 0 ? (
                  <div className="bg-gray-800/40 border border-dashed border-gray-700 rounded-xl py-10 text-center">
                    <Dumbbell size={18} className="text-gray-700 mx-auto mb-2" />
                    <p className="text-gray-600 font-mono text-xs mb-3">No blocks yet — add your first exercise</p>
                    <button
                      onClick={addBlock}
                      disabled={exercises.length === 0}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gray-700
                                 hover:bg-gray-600 text-white text-xs font-semibold transition-colors disabled:opacity-40"
                    >
                      <Plus size={13} /> Add Block
                    </button>
                  </div>
                ) : (
                  <>
                    {editing.blocks.map((block) => (
                      <BlockRow
                        key={block.id}
                        block={block}
                        exercises={exercises}
                        onChange={(updated) => updateBlock(block.id, updated)}
                        onRemove={() => removeBlock(block.id)}
                      />
                    ))}
                    <button
                      onClick={addBlock}
                      disabled={exercises.length === 0}
                      className="flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl
                                 border border-dashed border-gray-700 text-gray-500 hover:text-white
                                 hover:border-gray-500 text-xs font-semibold transition-colors disabled:opacity-40"
                    >
                      <Plus size={13} /> Add Block
                    </button>
                  </>
                )}
              </div>

              {/* Live preview */}
              <LivePreview blocks={editing.blocks} />
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center py-24">
              <div className="text-center">
                <Dumbbell size={28} className="text-gray-700 mx-auto mb-3" />
                <p className="text-gray-600 font-mono text-xs mb-4">Create a phase to get started</p>
                <button
                  onClick={() => setShowNewForm(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-mustang-red
                             hover:bg-mustang-red-dark text-white text-sm font-semibold transition-colors"
                >
                  <Plus size={14} /> New Phase
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </DashboardLayout>
  );
}
