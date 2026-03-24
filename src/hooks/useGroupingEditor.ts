"use client";

import { useState, useEffect, useRef } from "react";
import { Player, PlayerStatus } from "@/types/player";
import { DrillGroup, PlayerGrouping } from "@/types/grouping";
import { distributeEvenly } from "@/lib/grouping-utils";

interface Params {
  teamId:        string | null;
  players:       Player[];
  initialGroups: DrillGroup[] | null;
  onApply:       (groups: DrillGroup[], savedGroupingId?: string) => void;
}

/**
 * Owns all grouping editor logic:
 *   - loading saved grouping templates from the DB
 *   - working group state (create, delete, rename, drag-drop, clear)
 *   - saving a grouping template and calling onApply
 *
 * DrillGroupingModal is left with sub-components (PlayerChip, GroupDropZone)
 * and JSX rendering only.
 */
export function useGroupingEditor({ teamId, players, initialGroups, onApply }: Params) {
  const activePlayers = players.filter((p) => p.status === PlayerStatus.Active);

  // ── Saved grouping templates ───────────────────────────────────────────────
  const [savedGroupings, setSavedGroupings] = useState<PlayerGrouping[]>([]);
  const [showSaved,      setShowSaved]      = useState(true);

  useEffect(() => {
    const param = teamId ? `?team_id=${teamId}` : "";
    fetch(`/api/player-groupings${param}`)
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d)) setSavedGroupings(d); })
      .catch(() => {});
  }, [teamId]);

  // ── Working state ──────────────────────────────────────────────────────────
  const [groups,       setGroups]       = useState<DrillGroup[]>(initialGroups ?? []);
  const [groupingName, setGroupingName] = useState("");
  const [numGroups,    setNumGroups]    = useState(2);
  const [saving,       setSaving]       = useState(false);

  // ── Drag state ─────────────────────────────────────────────────────────────
  const draggingId = useRef<string | null>(null);
  const [dragOverGroup, setDragOverGroup] = useState<number | null>(null);

  // ── Derived ────────────────────────────────────────────────────────────────
  const assignedIds = new Set(groups.flatMap((g) => g.playerIds));
  const unassigned  = activePlayers.filter((p) => !assignedIds.has(p.id));

  // ── Drag handlers ──────────────────────────────────────────────────────────

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

  // ── Group mutation handlers ────────────────────────────────────────────────

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

  function handleLoadSaved(sg: PlayerGrouping) {
    setGroups(sg.groups);
    setGroupingName(sg.name);
    setShowSaved(false);
  }

  // ── Save + apply ───────────────────────────────────────────────────────────

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

  return {
    activePlayers,
    savedGroupings,
    showSaved,      setShowSaved,
    groups,
    groupingName,   setGroupingName,
    numGroups,      setNumGroups,
    saving,
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
    handleLoadSaved,
    handleSaveAndApply,
  };
}
