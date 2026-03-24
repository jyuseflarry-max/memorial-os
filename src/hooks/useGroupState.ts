"use client";

import { useState, useRef } from "react";
import { Player } from "@/types/player";
import { DrillGroup } from "@/types/grouping";
import { distributeEvenly } from "@/lib/grouping-utils";

interface Params {
  initialGroups: DrillGroup[];
  activePlayers: Player[];
}

/**
 * Owns all group-manipulation state shared by both the drill-assignment
 * workflow (DrillGroupingModal / useGroupingEditor) and the saved-groupings
 * CRUD workflow (GroupingEditor in player-groups/page).
 *
 * Covers: group list, drag-and-drop, per-group mutations, randomize/clear.
 * Does NOT cover: saving to the DB, loading saved templates — those differ
 * between the two callers and stay in their respective hooks/components.
 */
export function useGroupState({ initialGroups, activePlayers }: Params) {
  const [groups,       setGroups]       = useState<DrillGroup[]>(initialGroups);
  const [numGroups,    setNumGroups]    = useState(2);
  const draggingId                      = useRef<string | null>(null);
  const [dragOverGroup, setDragOverGroup] = useState<number | null>(null);

  // ── Derived ──────────────────────────────────────────────────────────────
  const assignedIds = new Set(groups.flatMap((g) => g.playerIds));
  const unassigned  = activePlayers.filter((p) => !assignedIds.has(p.id));

  // ── Drag handlers ─────────────────────────────────────────────────────────

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
    setGroups((prev) => prev.map((g) => ({ ...g, playerIds: g.playerIds.filter((id) => id !== pid) })));
  }

  // ── Group mutation handlers ───────────────────────────────────────────────

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
    setGroups(
      Array.from({ length: numGroups }, (_, i) => ({
        name: `Group ${String.fromCharCode(65 + i)}`,
        playerIds: [],
      }))
    );
  }

  function handleRandomize() {
    setGroups(distributeEvenly(activePlayers.map((p) => p.id), groups.length || numGroups));
  }

  function handleClearAll() {
    setGroups((prev) => prev.map((g) => ({ ...g, playerIds: [] })));
  }

  return {
    groups,         setGroups,
    numGroups,      setNumGroups,
    dragOverGroup,  setDragOverGroup,
    assignedIds,
    unassigned,
    handleDragStart,
    handleDropOnGroup,
    handleDropOnUnassigned,
    handleRemovePlayer,
    handleNameChange,
    handleDeleteGroup,
    handleAddGroup,
    handleCreateStructure,
    handleRandomize,
    handleClearAll,
  };
}
