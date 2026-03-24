"use client";

import { useState, useEffect, useRef } from "react";
import { X, Shuffle, Plus, Trash2, Save, ChevronDown, ChevronUp, Users } from "lucide-react";
import { Player, PlayerStatus } from "@/types/player";
import { DrillGroup, PlayerGrouping } from "@/types/grouping";
import { shuffle, distributeEvenly } from "@/lib/grouping-utils";

// ── Player chip ───────────────────────────────────────────────────────────

function PlayerChip({
  player,
  dragging,
  onDragStart,
}: {
  player: Player;
  dragging: boolean;
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
      <span className="truncate max-w-[90px]">{player.name.split(" ").slice(-1)[0]}</span>
    </div>
  );
}

// ── Drop zone ─────────────────────────────────────────────────────────────

function GroupDropZone({
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
        isOver ? "border-mustang-red bg-mustang-red/5" : "border-gray-700 bg-gray-800/60"
      }`}
    >
      {/* Group header */}
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

      {/* Players in group */}
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
              <span className="max-w-[80px] truncate">{p.name.split(" ").slice(-1)[0]}</span>
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
          <p className={`text-xs font-mono w-full text-center py-4 ${isOver ? "text-mustang-red" : "text-gray-600"}`}>
            {isOver ? "DROP HERE" : "DRAG PLAYERS HERE"}
          </p>
        )}
      </div>
    </div>
  );
}

// ── Main modal ────────────────────────────────────────────────────────────

interface Props {
  drillName: string;
  teamId: string | null;
  players: Player[];
  initialGroups: DrillGroup[] | null;
  onApply: (groups: DrillGroup[], savedGroupingId?: string) => void;
  onClose: () => void;
}

export default function DrillGroupingModal({
  drillName,
  teamId,
  players,
  initialGroups,
  onApply,
  onClose,
}: Props) {
  const activePlayers = players.filter((p) => p.status === PlayerStatus.Active);

  // ── Saved groupings ───────────────────────────────────────────────────
  const [savedGroupings, setSavedGroupings] = useState<PlayerGrouping[]>([]);
  const [showSaved, setShowSaved] = useState(true);

  useEffect(() => {
    const param = teamId ? `?team_id=${teamId}` : "";
    fetch(`/api/player-groupings${param}`)
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d)) setSavedGroupings(d); })
      .catch(() => {});
  }, [teamId]);

  // ── Working state ─────────────────────────────────────────────────────
  const [groups, setGroups] = useState<DrillGroup[]>(
    initialGroups ?? []
  );
  const [groupingName, setGroupingName] = useState("");
  const [numGroups, setNumGroups] = useState(2);
  const [saving, setSaving] = useState(false);

  // Unassigned = active players not in any group
  const assignedIds = new Set(groups.flatMap((g) => g.playerIds));
  const unassigned  = activePlayers.filter((p) => !assignedIds.has(p.id));

  // ── Drag state ────────────────────────────────────────────────────────
  const draggingId  = useRef<string | null>(null);
  const [dragOverGroup, setDragOverGroup] = useState<number | null>(null); // -1 = unassigned pool

  function handleDragStart(playerId: string) {
    draggingId.current = playerId;
  }

  function handleDropOnGroup(toGroupIdx: number) {
    const pid = draggingId.current;
    draggingId.current = null;
    setDragOverGroup(null);
    if (!pid) return;

    setGroups((prev) => {
      const next = prev.map((g) => ({ ...g, playerIds: g.playerIds.filter((id) => id !== pid) }));
      next[toGroupIdx] = { ...next[toGroupIdx], playerIds: [...next[toGroupIdx].playerIds, pid] };
      return next;
    });
  }

  function handleDropOnUnassigned() {
    const pid = draggingId.current;
    draggingId.current = null;
    setDragOverGroup(null);
    if (!pid) return;
    // Remove from any group (player goes back to unassigned)
    setGroups((prev) => prev.map((g) => ({ ...g, playerIds: g.playerIds.filter((id) => id !== pid) })));
  }

  function handleRemovePlayer(groupIdx: number, playerId: string) {
    setGroups((prev) => prev.map((g, i) =>
      i === groupIdx ? { ...g, playerIds: g.playerIds.filter((id) => id !== playerId) } : g
    ));
  }

  function handleNameChange(idx: number, name: string) {
    setGroups((prev) => prev.map((g, i) => (i === idx ? { ...g, name } : g)));
  }

  function handleDeleteGroup(idx: number) {
    setGroups((prev) => prev.filter((_, i) => i !== idx));
  }

  function handleAddGroup() {
    const letter = String.fromCharCode(65 + groups.length);
    setGroups((prev) => [...prev, { name: `Group ${letter}`, playerIds: [] }]);
  }

  function handleCreateStructure() {
    const newGroups: DrillGroup[] = Array.from({ length: numGroups }, (_, i) => ({
      name: `Group ${String.fromCharCode(65 + i)}`,
      playerIds: [],
    }));
    setGroups(newGroups);
  }

  function handleRandomize() {
    const allIds = activePlayers.map((p) => p.id);
    setGroups(distributeEvenly(allIds, groups.length || numGroups));
  }

  function handleClearAll() {
    setGroups((prev) => prev.map((g) => ({ ...g, playerIds: [] })));
  }

  function handleLoadSaved(sg: PlayerGrouping) {
    setGroups(sg.groups);
    setGroupingName(sg.name);
    setShowSaved(false);
  }

  async function handleSaveAndApply() {
    setSaving(true);
    let savedId: string | undefined;
    if (groupingName.trim()) {
      try {
        const res = await fetch("/api/player-groupings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: groupingName.trim(), team_id: teamId, groups }),
        });
        const data = await res.json();
        if (data.id) {
          savedId = data.id;
          setSavedGroupings((prev) => [data, ...prev]);
        }
      } catch {}
    }
    setSaving(false);
    onApply(groups, savedId);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 overflow-y-auto p-4" onClick={onClose}>
      <div
        className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-2xl my-4 shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <Users size={18} className="text-mustang-red" />
            <div>
              <p className="text-white font-semibold">Player Groups</p>
              <p className="text-gray-500 text-xs font-mono">{drillName}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-col gap-4 p-5">

          {/* ── Saved groupings ─────────────────────────────────────── */}
          {savedGroupings.length > 0 && (
            <div className="bg-gray-800 rounded-xl border border-gray-700">
              <button
                type="button"
                onClick={() => setShowSaved((v) => !v)}
                className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-gray-300 hover:text-white transition-colors"
              >
                <span>Previous Groupings ({savedGroupings.length})</span>
                {showSaved ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
              {showSaved && (
                <div className="border-t border-gray-700 divide-y divide-gray-700/50 max-h-48 overflow-y-auto">
                  {savedGroupings.map((sg) => (
                    <div key={sg.id} className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-700/30 transition-colors">
                      <div>
                        <p className="text-white text-sm">{sg.name}</p>
                        <p className="text-gray-500 text-xs font-mono">
                          {sg.groups.length} groups · {sg.groups.reduce((s, g) => s + g.playerIds.length, 0)} players
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleLoadSaved(sg)}
                        className="text-xs font-semibold text-mustang-red hover:text-orange-300 transition-colors px-2 py-1 rounded-lg hover:bg-mustang-red/10"
                      >
                        Use
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Setup ───────────────────────────────────────────────── */}
          {groups.length === 0 && (
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
              <p className="text-gray-400 text-xs font-mono uppercase tracking-wider mb-3">New Grouping</p>
              <div className="flex items-end gap-3 flex-wrap">
                <div>
                  <label className="text-gray-500 text-xs font-mono block mb-1">NUMBER OF GROUPS</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={numGroups}
                    onChange={(e) => setNumGroups(Math.max(1, Math.min(10, Number(e.target.value))))}
                    className="w-20 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm font-mono focus:outline-none focus:border-mustang-red transition-colors"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleCreateStructure}
                  className="flex items-center gap-2 bg-mustang-red hover:bg-mustang-red-dark text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
                >
                  <Plus size={14} /> Create Groups
                </button>
              </div>
            </div>
          )}

          {/* ── Groups + unassigned pool ─────────────────────────── */}
          {groups.length > 0 && (
            <>
              {/* Toolbar */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleRandomize}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 border border-gray-600 text-gray-300 hover:text-white text-xs font-semibold transition-colors"
                >
                  <Shuffle size={13} /> Randomize
                </button>
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 border border-gray-600 text-gray-300 hover:text-white text-xs font-semibold transition-colors"
                >
                  <X size={13} /> Clear All
                </button>
                <button
                  type="button"
                  onClick={handleAddGroup}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 border border-gray-600 text-gray-300 hover:text-white text-xs font-semibold transition-colors"
                >
                  <Plus size={13} /> Add Group
                </button>
                <span className="text-gray-600 text-xs font-mono ml-auto">
                  {assignedIds.size}/{activePlayers.length} assigned
                </span>
              </div>

              {/* Unassigned pool */}
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOverGroup(-1); }}
                onDrop={(e) => { e.preventDefault(); handleDropOnUnassigned(); }}
                className={`rounded-xl border-2 p-3 transition-colors ${
                  dragOverGroup === -1 ? "border-mustang-red bg-mustang-red/5" : "border-gray-700 bg-gray-800/40"
                }`}
              >
                <p className="text-gray-500 text-[10px] font-mono uppercase tracking-wider mb-2">
                  Unassigned ({unassigned.length})
                </p>
                <div className="flex flex-wrap gap-1.5 min-h-[36px]">
                  {unassigned.map((p) => (
                    <PlayerChip
                      key={p.id}
                      player={p}
                      dragging={false}
                      onDragStart={() => handleDragStart(p.id)}
                    />
                  ))}
                  {unassigned.length === 0 && (
                    <p className="text-gray-600 text-xs font-mono w-full text-center py-1">
                      {dragOverGroup === -1 ? "DROP HERE TO UNASSIGN" : "ALL PLAYERS ASSIGNED"}
                    </p>
                  )}
                </div>
              </div>

              {/* Group columns */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {groups.map((g, idx) => (
                  <GroupDropZone
                    key={idx}
                    group={g}
                    index={idx}
                    players={activePlayers}
                    dragOverIdx={dragOverGroup}
                    onDragOver={setDragOverGroup}
                    onDrop={handleDropOnGroup}
                    onNameChange={handleNameChange}
                    onRemovePlayer={handleRemovePlayer}
                    onDeleteGroup={handleDeleteGroup}
                  />
                ))}
              </div>

              {/* Save name */}
              <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
                <p className="text-gray-400 text-xs font-mono uppercase tracking-wider mb-2">
                  Save grouping for reuse (optional)
                </p>
                <input
                  type="text"
                  placeholder="e.g. Shooting Groups, Scrimmage Teams…"
                  value={groupingName}
                  onChange={(e) => setGroupingName(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-mustang-red transition-colors"
                />
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-gray-700">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-gray-600 text-gray-400 text-sm hover:text-white transition-colors"
          >
            Cancel
          </button>
          {groups.length > 0 && (
            <button
              type="button"
              disabled={saving}
              onClick={handleSaveAndApply}
              className="flex items-center gap-2 bg-mustang-red hover:bg-mustang-red-dark disabled:opacity-50 text-white text-sm font-semibold px-5 py-2 rounded-lg transition-colors"
            >
              <Save size={14} />
              {saving ? "Saving…" : "Apply to Drill"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
