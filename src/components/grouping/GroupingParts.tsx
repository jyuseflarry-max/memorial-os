"use client";

import { X, Trash2 } from "lucide-react";
import { Player } from "@/types/player";
import { DrillGroup } from "@/types/grouping";

/**
 * Returns "LastName" normally, or "F. LastName" when another player in
 * `allPlayers` shares the same last name.
 */
export function playerDisplayName(player: Player, allPlayers: Player[]): string {
  const parts    = player.name.trim().split(/\s+/);
  const lastName = parts[parts.length - 1];
  const hasDupe  = allPlayers.some(
    (p) => p.id !== player.id && p.name.trim().split(/\s+/).pop() === lastName
  );
  if (!hasDupe) return lastName;
  return `${parts[0][0]}. ${lastName}`;
}

// ── Player chip ───────────────────────────────────────────────────────────

export function PlayerChip({
  player,
  allPlayers = [],
  dragging = false,
  onDragStart,
}: {
  player: Player;
  allPlayers?: Player[];
  dragging?: boolean;
  onDragStart: () => void;
}) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border text-xs font-medium cursor-grab active:cursor-grabbing select-none transition-opacity ${
        dragging ? "opacity-40" : "opacity-100"
      } bg-gray-700 border-gray-600 text-gray-200 hover:border-gray-500`}
    >
      <span className="w-5 h-5 rounded bg-gray-600 flex items-center justify-center font-mono text-[10px] shrink-0">
        {player.jersey_number}
      </span>
      <span className="truncate max-w-[90px]">{playerDisplayName(player, allPlayers)}</span>
    </div>
  );
}

// ── Drop zone ─────────────────────────────────────────────────────────────

export function GroupDropZone({
  group,
  index,
  players,
  dragOverIdx,
  onDragOver,
  onDrop,
  onNameChange,
  onRemovePlayer,
  onDeleteGroup,
}: {
  group: DrillGroup;
  index: number;
  players: Player[];
  dragOverIdx: number | null;
  onDragOver: (idx: number) => void;
  onDrop: (toGroupIdx: number) => void;
  onNameChange: (idx: number, name: string) => void;
  onRemovePlayer: (groupIdx: number, playerId: string) => void;
  onDeleteGroup: (idx: number) => void;
}) {
  const isOver = dragOverIdx === index;
  return (
    <div
      onDragOver={(e) => { e.preventDefault(); onDragOver(index); }}
      onDrop={(e) => { e.preventDefault(); onDrop(index); }}
      className={`rounded-xl border-2 transition-colors flex flex-col min-h-[120px] ${
        isOver ? "border-coaches-red bg-coaches-red/5" : "border-gray-700 bg-gray-800/60"
      }`}
    >
      <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-700/50">
        <input
          type="text"
          value={group.name}
          onChange={(e) => onNameChange(index, e.target.value)}
          className="flex-1 bg-transparent text-white text-sm font-semibold focus:outline-none"
          placeholder={`Group ${index + 1}`}
        />
        <span className="text-gray-500 text-[10px] font-mono shrink-0">{group.playerIds.length}P</span>
        <button
          type="button"
          onClick={() => onDeleteGroup(index)}
          className="text-gray-600 hover:text-red-400 transition-colors shrink-0"
          title="Remove group"
        >
          <Trash2 size={12} />
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5 p-2 flex-1">
        {group.playerIds.map((pid) => {
          const p = players.find((pl) => pl.id === pid);
          if (!p) return null;
          return (
            <div
              key={pid}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-gray-700 border border-gray-600 text-xs text-gray-200 group/chip"
            >
              <span className="w-4 h-4 rounded bg-gray-600 flex items-center justify-center font-mono text-[9px]">
                {p.jersey_number}
              </span>
              <span className="max-w-[80px] truncate">{playerDisplayName(p, players)}</span>
              <button
                type="button"
                onClick={() => onRemovePlayer(index, pid)}
                className="text-gray-600 hover:text-red-400 opacity-0 group-hover/chip:opacity-100 transition-all ml-0.5"
              >
                <X size={10} />
              </button>
            </div>
          );
        })}
        {group.playerIds.length === 0 && (
          <p className={`text-xs font-mono w-full text-center py-4 ${isOver ? "text-coaches-red" : "text-gray-600"}`}>
            {isOver ? "DROP HERE" : "DRAG PLAYERS HERE"}
          </p>
        )}
      </div>
    </div>
  );
}
