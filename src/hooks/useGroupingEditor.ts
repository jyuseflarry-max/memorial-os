"use client";

import { useState, useEffect } from "react";
import { Player, PlayerStatus } from "@/types/player";
import { DrillGroup, PlayerGrouping } from "@/types/grouping";
import { useGroupState } from "@/hooks/useGroupState";

interface Params {
  teamId:        string | null;
  players:       Player[];
  initialGroups: DrillGroup[] | null;
  onApply:       (groups: DrillGroup[], savedGroupingId?: string) => void;
}

/**
 * Owns all grouping editor logic:
 *   - loading saved grouping templates from the DB
 *   - working group state (via useGroupState)
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

  // ── Group manipulation (shared logic) ─────────────────────────────────────
  const groupState = useGroupState({ initialGroups: initialGroups ?? [], activePlayers });

  // ── Grouping name + save state ─────────────────────────────────────────────
  const [groupingName, setGroupingName] = useState("");
  const [saving,       setSaving]       = useState(false);

  // ── Load saved ────────────────────────────────────────────────────────────

  function handleLoadSaved(sg: PlayerGrouping) {
    groupState.setGroups(sg.groups);
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
          body: JSON.stringify({ name: groupingName.trim(), team_id: teamId, groups: groupState.groups }),
        });
        const data = await res.json();
        if (data.id) {
          savedId = data.id;
          setSavedGroupings((prev) => [data, ...prev]);
        }
      } catch {}
    }
    setSaving(false);
    onApply(groupState.groups, savedId);
  }

  return {
    activePlayers,
    savedGroupings,
    showSaved,      setShowSaved,
    groupingName,   setGroupingName,
    saving,
    handleLoadSaved,
    handleSaveAndApply,
    ...groupState,
  };
}
