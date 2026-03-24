"use client";

import { useState, useRef } from "react";
import { X, ChevronUp, ChevronDown, Minus, Plus, Users, GripVertical } from "lucide-react";
import { SessionDrill, parseTime, formatTime12 } from "@/types/session";
import { DrillGroup } from "@/types/grouping";
import { DrillCategory } from "@/types/drill";
import { useDrillCategories } from "@/context/DrillCategoryContext";

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
  const { getCatColor } = useDrillCategories();
  const [isDragOver, setIsDragOver] = useState(false);
  const dragFromIndex = useRef<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  function handleContainerDragOver(e: React.DragEvent) {
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

  const totalMin   = drills.reduce((s, d) => s + d.duration, 0);
  const startMin   = parseTime(startTime);
  const endLabel   = formatTime12(startMin + totalMin);
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
          const subLine    = isRest
            ? "Non-Activity · 0 shots"
            : `${sd.drill.sub_category || sd.drill.category} · ${sd.drill.shot_type} · ~${shots} shots`;

          return (
            <div key={sd.instanceId}>
              {/* Drop indicator above */}
              <div className={`h-0.5 mx-2 rounded-full transition-all duration-100 ${
                isTarget && dragFromIndex.current !== null && dragFromIndex.current > i
                  ? "bg-mustang-red scale-y-100 mb-1" : "bg-transparent"
              }`} />

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
                className={`flex gap-2 sm:gap-3 rounded-xl px-3 py-2.5 group border transition-all duration-100 mb-2 ${
                  isDragging
                    ? "opacity-40 scale-[0.98]"
                    : isRest
                    ? "bg-sky-950/40 border-sky-800/50"
                    : "bg-gray-800 border-gray-700"
                } ${isTarget ? "border-mustang-red shadow-[0_0_0_1px_rgba(237,28,36,0.4)]" : ""}`}
              >
                {/* Drag handle — spans full card height */}
                <div className="flex flex-col items-center gap-1 shrink-0 cursor-grab active:cursor-grabbing self-start pt-0.5">
                  <GripVertical size={14} className="text-gray-600 group-hover:text-gray-400 transition-colors" />
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: getCatColor(sd.drill.category) }} />
                </div>

                {/* ── Card body: 2-row on mobile, 1-row on sm+ ── */}
                <div className="flex-1 min-w-0">

                  {/* Row 1: number + name + (mobile X) */}
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600 text-[10px] font-mono w-4 text-center shrink-0 select-none">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <p className={`text-sm font-medium truncate flex-1 ${isRest ? "text-sky-300" : "text-white"}`}>
                      {sd.drill.name}
                    </p>
                    {/* Remove — mobile only (top-right of name) */}
                    <button
                      type="button"
                      onClick={() => onRemove(sd.instanceId)}
                      className="sm:hidden w-7 h-7 rounded-lg text-gray-600 hover:text-red-400 flex items-center justify-center transition-colors shrink-0"
                    >
                      <X size={14} />
                    </button>
                  </div>

                  {/* Subtitle */}
                  <p className="text-gray-500 text-[10px] font-mono mt-0.5 ml-6">
                    <span className="text-gray-400">{blockLabel}</span>
                    {" · "}
                    {subLine}
                  </p>
                  {sd.groups && sd.groups.length > 0 && (
                    <p className="text-[10px] font-mono text-purple-400 mt-0.5 ml-6">
                      {sd.groups.length} groups · {sd.groups.reduce((s: number, g: DrillGroup) => s + g.playerIds.length, 0)} players
                    </p>
                  )}

                  {/* Mobile controls row */}
                  <div className="flex items-center justify-between mt-2.5 sm:hidden">
                    {/* Groups + duration */}
                    <div className="flex items-center gap-2">
                      {!isRest && (
                        <button
                          type="button"
                          title="Assign player groups"
                          onClick={() => onGroupsClick(sd.instanceId)}
                          className={`p-2 rounded-lg transition-colors ${
                            sd.groups && sd.groups.length > 0
                              ? "text-purple-400 bg-purple-400/10"
                              : "text-gray-600 hover:text-purple-400 hover:bg-purple-400/10"
                          }`}
                        >
                          <Users size={15} />
                        </button>
                      )}
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onDurationChange(sd.instanceId, Math.max(1, sd.duration - 1))}
                          className="w-8 h-8 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white flex items-center justify-center transition-colors"
                        >
                          <Minus size={13} />
                        </button>
                        <span className="text-white text-sm font-mono w-10 text-center">
                          {sd.duration}m
                        </span>
                        <button
                          type="button"
                          onClick={() => onDurationChange(sd.instanceId, sd.duration + 1)}
                          className="w-8 h-8 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white flex items-center justify-center transition-colors"
                        >
                          <Plus size={13} />
                        </button>
                      </div>
                    </div>
                    {/* Reorder */}
                    <div className="flex gap-1">
                      <button
                        type="button"
                        disabled={i === 0}
                        onClick={() => onReorder(i, i - 1)}
                        className="w-8 h-8 rounded-lg bg-gray-700 text-gray-400 hover:text-white disabled:opacity-20 flex items-center justify-center transition-colors"
                      >
                        <ChevronUp size={14} />
                      </button>
                      <button
                        type="button"
                        disabled={i === drills.length - 1}
                        onClick={() => onReorder(i, i + 1)}
                        className="w-8 h-8 rounded-lg bg-gray-700 text-gray-400 hover:text-white disabled:opacity-20 flex items-center justify-center transition-colors"
                      >
                        <ChevronDown size={14} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* ── Desktop-only controls (hidden on mobile) ── */}
                <div className="hidden sm:flex items-center gap-1 shrink-0">
                  {/* Groups button */}
                  {!isRest && (
                    <button
                      type="button"
                      title="Assign player groups"
                      onClick={() => onGroupsClick(sd.instanceId)}
                      className={`p-1.5 rounded-lg transition-colors ${
                        sd.groups && sd.groups.length > 0
                          ? "text-purple-400 bg-purple-400/10 hover:bg-purple-400/20"
                          : "text-gray-600 hover:text-purple-400 hover:bg-purple-400/10"
                      }`}
                    >
                      <Users size={13} />
                    </button>
                  )}

                  {/* Duration stepper */}
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

                  {/* Reorder arrows */}
                  <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
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
                    className="w-6 h-6 rounded-lg text-gray-600 hover:text-red-400 flex items-center justify-center transition-colors"
                  >
                    <X size={13} />
                  </button>
                </div>
              </div>

              {/* Drop indicator below */}
              <div className={`h-0.5 mx-2 rounded-full transition-all duration-100 ${
                isTarget && dragFromIndex.current !== null && dragFromIndex.current < i
                  ? "bg-mustang-red -mt-1 mb-1" : "bg-transparent"
              }`} />
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
