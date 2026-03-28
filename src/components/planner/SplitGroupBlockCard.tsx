"use client";

import { useState, useRef, useEffect } from "react";
import { X, Plus, Minus, Trash2, GripVertical, ChevronUp, ChevronDown, Scissors } from "lucide-react";
import { SplitGroupBlock, SubTrackDrill } from "@/types/session";
import { Drill } from "@/types/drill";

interface AddDrillFormProps {
  vaultDrills: Drill[];
  masterDuration: number;
  timeRemaining: number;
  onAdd: (drill: SubTrackDrill) => void;
  onCancel: () => void;
}

function AddDrillForm({ vaultDrills, masterDuration, timeRemaining, onAdd, onCancel }: AddDrillFormProps) {
  const [query,    setQuery]    = useState("");
  const [duration, setDuration] = useState(Math.min(5, timeRemaining));
  const [selected, setSelected] = useState<Drill | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const filtered = query.trim()
    ? vaultDrills.filter((d) => d.name.toLowerCase().includes(query.toLowerCase()))
    : vaultDrills;

  // The name to submit: either the selected vault drill or whatever was typed
  const submitName = selected?.name ?? query.trim();

  function handleSelect(drill: Drill) {
    setSelected(drill);
    setQuery(drill.name);
  }

  function handleQueryChange(val: string) {
    setQuery(val);
    // Clear vault selection if user edits away from the selected name
    if (selected && val !== selected.name) setSelected(null);
  }

  function handleAdd() {
    if (!submitName || duration < 1) return;
    onAdd({
      instanceId: crypto.randomUUID(),
      name: submitName,
      drillId: selected?.id,
      duration,
    });
  }

  return (
    <div className="mt-2 flex flex-col gap-1.5 bg-gray-900 border border-gray-600 rounded-lg p-2">
      {/* Search input */}
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => handleQueryChange(e.target.value)}
        placeholder="Search or type a drill name…"
        className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-white text-xs placeholder-gray-500 focus:outline-none focus:border-coaches-red"
      />

      {/* Scrollable drill list */}
      {filtered.length > 0 && (
        <div className="max-h-28 overflow-y-auto rounded border border-gray-700 bg-gray-800/60">
          {filtered.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => handleSelect(d)}
              className={`w-full text-left px-2.5 py-1.5 text-xs transition-colors ${
                selected?.id === d.id
                  ? "bg-coaches-red/20 text-white"
                  : "text-gray-300 hover:bg-gray-700 hover:text-white"
              }`}
            >
              {d.name}
            </button>
          ))}
        </div>
      )}

      {/* Duration + actions */}
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => setDuration((v) => Math.max(1, v - 1))}
          className="w-6 h-6 rounded bg-gray-700 hover:bg-gray-600 text-gray-400 hover:text-white flex items-center justify-center"
        >
          <Minus size={10} />
        </button>
        <span className="text-white text-xs font-mono w-8 text-center">{duration}m</span>
        <button
          type="button"
          onClick={() => setDuration((v) => Math.min(masterDuration, v + 1))}
          className="w-6 h-6 rounded bg-gray-700 hover:bg-gray-600 text-gray-400 hover:text-white flex items-center justify-center"
        >
          <Plus size={10} />
        </button>
        <div className="flex-1" />
        <button
          type="button"
          onClick={onCancel}
          className="px-2 py-1 rounded text-gray-500 hover:text-white text-xs"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={!submitName || duration < 1}
          onClick={handleAdd}
          className="px-2.5 py-1 rounded bg-coaches-red hover:bg-coaches-red-dark disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold"
        >
          Add
        </button>
      </div>
    </div>
  );
}

// ── Main card ──────────────────────────────────────────────────────────────

interface Props {
  block: SplitGroupBlock;
  index: number;
  totalItems: number;
  vaultDrills: Drill[];
  isDragging: boolean;
  isTarget: boolean;
  onUpdate: (block: SplitGroupBlock) => void;
  onRemove: () => void;
  onReorder: (from: number, to: number) => void;
}

export default function SplitGroupBlockCard({
  block,
  index,
  totalItems,
  vaultDrills,
  isDragging,
  isTarget,
  onUpdate,
  onRemove,
  onReorder,
}: Props) {
  const [addingToTrack, setAddingToTrack] = useState<number | null>(null);

  function setTitle(title: string) {
    onUpdate({ ...block, title });
  }

  function setMasterDuration(masterDuration: number) {
    onUpdate({ ...block, masterDuration: Math.max(1, masterDuration) });
  }

  function setTrackLabel(trackIdx: number, label: string) {
    const subTracks = block.subTracks.map((t, i) => i === trackIdx ? { ...t, label } : t);
    onUpdate({ ...block, subTracks });
  }

  function addDrillToTrack(trackIdx: number, drill: SubTrackDrill) {
    const subTracks = block.subTracks.map((t, i) =>
      i === trackIdx ? { ...t, drills: [...t.drills, drill] } : t
    );
    onUpdate({ ...block, subTracks });
    setAddingToTrack(null);
  }

  function removeDrillFromTrack(trackIdx: number, instanceId: string) {
    const subTracks = block.subTracks.map((t, i) =>
      i === trackIdx ? { ...t, drills: t.drills.filter((d) => d.instanceId !== instanceId) } : t
    );
    onUpdate({ ...block, subTracks });
  }

  function updateSubDrillDuration(trackIdx: number, instanceId: string, delta: number) {
    const track   = block.subTracks[trackIdx];
    const used    = track.drills.reduce((s, d) => s + d.duration, 0);
    const budget  = block.masterDuration - used; // free minutes in this track
    const subTracks = block.subTracks.map((t, i) =>
      i === trackIdx
        ? {
            ...t,
            drills: t.drills.map((d) => {
              if (d.instanceId !== instanceId) return d;
              const next = d.duration + delta;
              return { ...d, duration: Math.max(1, delta > 0 ? Math.min(next, d.duration + budget) : next) };
            }),
          }
        : t
    );
    onUpdate({ ...block, subTracks });
  }

  return (
    <div
      className={`rounded-xl border-2 transition-all duration-100 mb-2 ${
        isDragging
          ? "opacity-40 scale-[0.98] border-gray-700 bg-gray-800"
          : isTarget
          ? "border-coaches-red shadow-[0_0_0_1px_rgba(237,28,36,0.4)] bg-gray-800"
          : "border-purple-700/50 bg-gray-800/80"
      }`}
    >
      {/* Header bar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-700/60">
        <div className="flex flex-col items-center gap-0.5 shrink-0 cursor-grab active:cursor-grabbing">
          <GripVertical size={14} className="text-gray-600" />
          <div className="w-2 h-2 rounded-full bg-purple-500/60" />
        </div>

        <Scissors size={13} className="text-purple-400 shrink-0" />

        <input
          type="text"
          value={block.title}
          onChange={(e) => setTitle(e.target.value)}
          className="flex-1 bg-transparent text-white text-sm font-semibold focus:outline-none min-w-0"
          placeholder="Split Group"
        />

        <span className="text-gray-500 text-[10px] font-mono shrink-0">
          {block.subTracks.length} tracks
        </span>

        {/* Master duration stepper */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setMasterDuration(block.masterDuration - 1)}
            className="w-5 h-5 rounded bg-gray-700 hover:bg-gray-600 text-gray-400 hover:text-white flex items-center justify-center"
          >
            <Minus size={10} />
          </button>
          <span className="text-white text-xs font-mono w-10 text-center">{block.masterDuration}m</span>
          <button
            type="button"
            onClick={() => setMasterDuration(block.masterDuration + 1)}
            className="w-5 h-5 rounded bg-gray-700 hover:bg-gray-600 text-gray-400 hover:text-white flex items-center justify-center"
          >
            <Plus size={10} />
          </button>
        </div>

        {/* Reorder arrows (desktop) */}
        <div className="hidden sm:flex flex-col gap-0.5 opacity-0 group-hover:opacity-100">
          <button
            type="button"
            disabled={index === 0}
            onClick={() => onReorder(index, index - 1)}
            className="w-5 h-5 rounded text-gray-500 hover:text-white disabled:opacity-20 flex items-center justify-center"
          >
            <ChevronUp size={12} />
          </button>
          <button
            type="button"
            disabled={index === totalItems - 1}
            onClick={() => onReorder(index, index + 1)}
            className="w-5 h-5 rounded text-gray-500 hover:text-white disabled:opacity-20 flex items-center justify-center"
          >
            <ChevronDown size={12} />
          </button>
        </div>

        <button
          type="button"
          onClick={onRemove}
          className="w-6 h-6 rounded-lg text-gray-600 hover:text-red-400 flex items-center justify-center transition-colors shrink-0"
        >
          <X size={13} />
        </button>
      </div>

      {/* Sub-track columns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 p-3">
        {block.subTracks.map((track, tIdx) => {
          const usedMin      = track.drills.reduce((s, d) => s + d.duration, 0);
          const remaining    = block.masterDuration - usedMin;
          const isFull       = remaining <= 0;

          return (
            <div key={track.id} className="bg-gray-900/60 border border-gray-700/60 rounded-lg flex flex-col">
              {/* Track header */}
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 border-b border-gray-700/40">
                <input
                  type="text"
                  value={track.label}
                  onChange={(e) => setTrackLabel(tIdx, e.target.value)}
                  className="flex-1 bg-transparent text-gray-200 text-xs font-semibold focus:outline-none min-w-0"
                  placeholder={`Group ${tIdx + 1}`}
                />
                <span className={`text-[10px] font-mono shrink-0 ${isFull ? "text-red-400" : "text-gray-500"}`}>
                  {isFull ? "FULL" : `${remaining}m left`}
                </span>
              </div>

              {/* Drills in this track */}
              <div className="flex flex-col gap-1 p-2 flex-1">
                {track.drills.map((d) => (
                  <div key={d.instanceId} className="flex items-center gap-1 group/subdrill">
                    <span className="flex-1 text-gray-300 text-[11px] truncate">{d.name}</span>
                    <button
                      type="button"
                      onClick={() => updateSubDrillDuration(tIdx, d.instanceId, -1)}
                      className="w-4 h-4 rounded text-gray-600 hover:text-gray-300 flex items-center justify-center"
                    >
                      <Minus size={8} />
                    </button>
                    <span className="text-gray-500 text-[10px] font-mono w-6 text-center">{d.duration}m</span>
                    <button
                      type="button"
                      onClick={() => updateSubDrillDuration(tIdx, d.instanceId, 1)}
                      className="w-4 h-4 rounded text-gray-600 hover:text-gray-300 flex items-center justify-center"
                    >
                      <Plus size={8} />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeDrillFromTrack(tIdx, d.instanceId)}
                      className="w-4 h-4 rounded text-gray-600 hover:text-red-400 opacity-0 group-hover/subdrill:opacity-100 flex items-center justify-center transition-all"
                    >
                      <Trash2 size={8} />
                    </button>
                  </div>
                ))}

                {track.drills.length === 0 && (
                  <p className="text-gray-700 text-[10px] font-mono text-center py-2">EMPTY</p>
                )}
              </div>

              {/* Add drill */}
              {!isFull && (
                <div className="px-2 pb-2">
                  {addingToTrack === tIdx ? (
                    <AddDrillForm
                      vaultDrills={vaultDrills}
                      masterDuration={block.masterDuration}
                      timeRemaining={remaining}
                      onAdd={(d) => addDrillToTrack(tIdx, d)}
                      onCancel={() => setAddingToTrack(null)}
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => setAddingToTrack(tIdx)}
                      className="w-full flex items-center justify-center gap-1 py-1 rounded border border-dashed border-gray-700 text-gray-600 hover:text-gray-400 hover:border-gray-600 text-[10px] font-mono transition-colors"
                    >
                      <Plus size={9} /> ADD DRILL
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Mobile reorder */}
      <div className="flex items-center justify-end gap-1 px-3 pb-2 sm:hidden">
        <button
          type="button"
          disabled={index === 0}
          onClick={() => onReorder(index, index - 1)}
          className="w-8 h-8 rounded-lg bg-gray-700 text-gray-400 hover:text-white disabled:opacity-20 flex items-center justify-center"
        >
          <ChevronUp size={14} />
        </button>
        <button
          type="button"
          disabled={index === totalItems - 1}
          onClick={() => onReorder(index, index + 1)}
          className="w-8 h-8 rounded-lg bg-gray-700 text-gray-400 hover:text-white disabled:opacity-20 flex items-center justify-center"
        >
          <ChevronDown size={14} />
        </button>
      </div>
    </div>
  );
}
