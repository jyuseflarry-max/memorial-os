"use client";

import { useState, useRef } from "react";
import { X, ChevronUp, ChevronDown, Minus, Plus, Users, GripVertical } from "lucide-react";
import { SessionDrill, parseTime, formatTime12 } from "@/types/session";
import { DrillGroup } from "@/types/grouping";
import { DrillCategory } from "@/types/drill";

const CAT_DOT: Record<string, string> = {
  [DrillCategory.Defense]:       "bg-blue-400",
  [DrillCategory.Offense]:       "bg-green-400",
  [DrillCategory.Transition]:    "bg-yellow-400",
  [DrillCategory.SpecialTeams]:  "bg-purple-400",
  [DrillCategory.RestTransition]:"bg-sky-400",
};

interface Props {
  drills: SessionDrill[];
  startTime: string;
  onRemove: (instanceId: string) => void;
  onDurationChange: (instanceId: string, duration: number) => void;
  onReorder: (from: number, to: number) => void;
  onDropDrill: (drillId: string) => void;
  onGroupsClick: (instanceId: string) => void;
}

export default function SessionTimeline({
  drills,
  startTime,
  onRemove,
  onDurationChange,
  onReorder,
  onDropDrill,
  onGroupsClick,
}: Props) {
  // ── Vault → timeline drop ─────────────────────────────────────────────
  const [isDragOver, setIsDragOver] = useState(false);

  // ── Row → row reorder drag ────────────────────────────────────────────
  const dragFromIndex = useRef<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  function handleContainerDragOver(e: React.DragEvent) {
    // Only light up the container for vault drills, not row reorders
    if (e.dataTransfer.types.includes("x-drill-id")) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
      setIsDragOver(true);
    }
  }

  function handleContainerDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(false);
    const drillId = e.dataTransfer.getData("x-drill-id");
    if (drillId) onDropDrill(drillId);
  }

  const totalMin  = drills.reduce((s, d) => s + d.duration, 0);
  const startMin  = parseTime(startTime);
  const endLabel  = formatTime12(startMin + totalMin);
  const startLabel = formatTime12(startMin);

  return (
    <div
      onDragOver={handleContainerDragOver}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleContainerDrop}
      className={`flex flex-col gap-0 min-h-[200px] rounded-2xl border-2 border-dashed transition-colors p-1 ${
        isDragOver
          ? "border-mustang-red bg-mustang-red/5"
          : drills.length === 0
          ? "border-gray-700"
          : "border-transparent"
      }`}
    >
      {/* Empty state */}
      {drills.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center py-16 text-center">
          <div className="w-12 h-12 rounded-2xl border-2 border-dashed border-gray-700 flex items-center justify-center mb-3">
            <Plus size={20} className="text-gray-600" />
          </div>
          <p className="text-gray-500 text-sm font-medium">Drop drills here</p>
          <p className="text-gray-600 text-xs mt-1">Drag from the vault or click +</p>
        </div>
      )}

      {/* Drill rows */}
      {(() => {
        let cursor = startMin;
        return drills.map((sd, i) => {
        const drillStart = cursor;
        cursor += sd.duration;
        const drillEnd   = cursor;
        const blockLabel = `${formatTime12(drillStart)} – ${formatTime12(drillEnd)}`;
        const isRest     = sd.drill.category === DrillCategory.RestTransition;
        const shots      = Math.round(sd.drill.shot_density * sd.duration);
        const isDragging = dragFromIndex.current === i;
        const isTarget   = dragOverIndex === i && dragFromIndex.current !== i;

        return (
          <div key={sd.instanceId}>
            {/* Drop indicator above this row */}
            <div
              className={`h-0.5 mx-2 rounded-full transition-all duration-100 ${
                isTarget && dragFromIndex.current !== null && dragFromIndex.current > i
                  ? "bg-mustang-red scale-y-100 mb-1"
                  : "bg-transparent"
              }`}
            />

            <div
              draggable
              onDragStart={(e) => {
                dragFromIndex.current = i;
                e.dataTransfer.setData("x-row-index", String(i));
                e.dataTransfer.effectAllowed = "move";
              }}
              onDragOver={(e) => {
                if (e.dataTransfer.types.includes("x-row-index")) {
                  e.preventDefault();
                  e.stopPropagation();
                  e.dataTransfer.dropEffect = "move";
                  if (dragOverIndex !== i) setDragOverIndex(i);
                }
              }}
              onDragLeave={(e) => {
                // only clear if leaving the row entirely (not entering a child)
                if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                  setDragOverIndex(null);
                }
              }}
              onDrop={(e) => {
                const fromStr = e.dataTransfer.getData("x-row-index");
                if (!fromStr) return;
                e.preventDefault();
                e.stopPropagation();
                const from = parseInt(fromStr, 10);
                if (from !== i) onReorder(from, i);
                setDragOverIndex(null);
                dragFromIndex.current = null;
              }}
              onDragEnd={() => {
                setDragOverIndex(null);
                dragFromIndex.current = null;
              }}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 group border transition-all duration-100 mb-2 ${
                isDragging
                  ? "opacity-40 scale-[0.98]"
                  : isRest
                  ? "bg-sky-950/40 border-sky-800/50"
                  : "bg-gray-800 border-gray-700"
              } ${isTarget ? "border-mustang-red shadow-[0_0_0_1px_rgba(237,28,36,0.4)]" : ""}`}
            >
              {/* Drag handle */}
              <div className="flex flex-col items-center gap-1 shrink-0 cursor-grab active:cursor-grabbing">
                <GripVertical size={14} className="text-gray-600 group-hover:text-gray-400 transition-colors" />
                <span className={`w-2 h-2 rounded-full ${CAT_DOT[sd.drill.category] ?? "bg-gray-400"}`} />
              </div>

              {/* Row number */}
              <span className="text-gray-600 text-[10px] font-mono w-4 text-center shrink-0 select-none">
                {String(i + 1).padStart(2, "0")}
              </span>

              {/* Drill info */}
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium truncate ${isRest ? "text-sky-300" : "text-white"}`}>
                  {sd.drill.name}
                </p>
                <p className="text-gray-500 text-[10px] font-mono">
                  <span className="text-gray-400">{blockLabel}</span>
                  {" · "}
                  {isRest
                    ? "Non-Activity · 0 shots"
                    : `${sd.drill.sub_category || sd.drill.category} · ${sd.drill.shot_type} · ~${shots} shots`}
                </p>
                {sd.groups && sd.groups.length > 0 && (
                  <p className="text-[10px] font-mono text-purple-400 mt-0.5">
                    {sd.groups.length} groups · {sd.groups.reduce((s: number, g: DrillGroup) => s + g.playerIds.length, 0)} players
                  </p>
                )}
              </div>

              {/* Groups button */}
              {!isRest && (
                <button
                  type="button"
                  title="Assign player groups"
                  onClick={() => onGroupsClick(sd.instanceId)}
                  className={`p-1.5 rounded-lg transition-colors shrink-0 ${
                    sd.groups && sd.groups.length > 0
                      ? "text-purple-400 bg-purple-400/10 hover:bg-purple-400/20"
                      : "text-gray-600 hover:text-purple-400 hover:bg-purple-400/10"
                  }`}
                >
                  <Users size={13} />
                </button>
              )}

              {/* Duration stepper */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => onDurationChange(sd.instanceId, Math.max(1, sd.duration - 1))}
                  className="w-6 h-6 rounded-md bg-gray-700 hover:bg-gray-600 text-gray-400 hover:text-white flex items-center justify-center transition-colors"
                >
                  <Minus size={11} />
                </button>
                <span className="text-white text-xs font-mono w-10 text-center">
                  {sd.duration}m
                </span>
                <button
                  type="button"
                  onClick={() => onDurationChange(sd.instanceId, sd.duration + 1)}
                  className="w-6 h-6 rounded-md bg-gray-700 hover:bg-gray-600 text-gray-400 hover:text-white flex items-center justify-center transition-colors"
                >
                  <Plus size={11} />
                </button>
              </div>

              {/* Reorder arrows */}
              <div className="flex flex-col gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  disabled={i === 0}
                  onClick={() => onReorder(i, i - 1)}
                  className="w-5 h-5 rounded text-gray-500 hover:text-white disabled:opacity-20 flex items-center justify-center"
                >
                  <ChevronUp size={12} />
                </button>
                <button
                  type="button"
                  disabled={i === drills.length - 1}
                  onClick={() => onReorder(i, i + 1)}
                  className="w-5 h-5 rounded text-gray-500 hover:text-white disabled:opacity-20 flex items-center justify-center"
                >
                  <ChevronDown size={12} />
                </button>
              </div>

              {/* Remove */}
              <button
                type="button"
                onClick={() => onRemove(sd.instanceId)}
                className="w-6 h-6 rounded-lg text-gray-600 hover:text-red-400 flex items-center justify-center transition-colors shrink-0"
              >
                <X size={13} />
              </button>
            </div>

            {/* Drop indicator below this row (for dragging upward) */}
            <div
              className={`h-0.5 mx-2 rounded-full transition-all duration-100 ${
                isTarget && dragFromIndex.current !== null && dragFromIndex.current < i
                  ? "bg-mustang-red -mt-1 mb-1"
                  : "bg-transparent"
              }`}
            />
          </div>
        );
        });
      })()}

      {/* Footer total */}
      {drills.length > 0 && (
        <div className="flex items-center justify-between px-3 py-1.5 border-t border-gray-700 mt-1">
          <span className="text-gray-500 text-xs font-mono">{drills.length} DRILLS · {totalMin} MIN</span>
          <span className="text-gray-400 text-xs font-mono font-semibold">
            {startLabel} – {endLabel}
          </span>
        </div>
      )}
    </div>
  );
}
