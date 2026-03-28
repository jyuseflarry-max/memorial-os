"use client";

import { useState, useEffect } from "react";
import {
  Plus, Pencil, Trash2, Copy, Users, X, Shuffle, Save, AlertTriangle,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { useTeam } from "@/context/TeamContext";
import { useTeamPlayers } from "@/hooks/useTeamPlayers";
import { Player, PlayerStatus } from "@/types/player";
import { DrillGroup, PlayerGrouping } from "@/types/grouping";
import { useGroupState } from "@/hooks/useGroupState";
import { PlayerChip, GroupDropZone, playerDisplayName } from "@/components/grouping/GroupingParts";

// ── Editor modal ──────────────────────────────────────────────────────────

function GroupingEditor({
  initial, teamId, activePlayers,
  onSave, onClose,
}: {
  initial: PlayerGrouping | null;
  teamId: string | null;
  activePlayers: Player[];
  onSave: (g: PlayerGrouping) => void;
  onClose: () => void;
}) {
  const [name,   setName]   = useState(initial?.name ?? "");
  const [saving, setSaving] = useState(false);

  const {
    groups, numGroups, setNumGroups,
    dragOverGroup, setDragOverGroup,
    assignedIds, unassigned,
    handleDragStart, handleDropOnGroup, handleDropOnUnassigned,
    handleRemovePlayer, handleNameChange, handleDeleteGroup,
    handleAddGroup, handleCreateStructure, handleRandomize, handleClearAll,
  } = useGroupState({ initialGroups: initial?.groups ?? [], activePlayers });

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      let result: PlayerGrouping;
      if (initial) {
        const res = await fetch(`/api/player-groupings/${initial.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: name.trim(), groups }),
        });
        result = await res.json();
      } else {
        const res = await fetch("/api/player-groupings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: name.trim(), team_id: teamId, groups }),
        });
        result = await res.json();
      }
      onSave(result);
    } catch {}
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 overflow-y-auto p-4" onClick={onClose}>
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-2xl my-4 shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <Users size={18} className="text-coaches-red" />
            <p className="text-white font-semibold">{initial ? "Edit Grouping" : "New Grouping"}</p>
          </div>
          <button type="button" onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-col gap-4 p-5">
          {/* Name */}
          <div>
            <label className="text-xs font-mono text-gray-400 uppercase tracking-wider block mb-1.5">Grouping Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Shooting Groups, Scrimmage Teams…"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-coaches-red transition-colors"
            />
          </div>

          {/* Setup (no groups yet) */}
          {groups.length === 0 && (
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
              <p className="text-gray-400 text-xs font-mono uppercase tracking-wider mb-3">Create Groups</p>
              <div className="flex items-end gap-3 flex-wrap">
                <div>
                  <label className="text-gray-500 text-xs font-mono block mb-1">NUMBER OF GROUPS</label>
                  <input type="number" min={1} max={10} value={numGroups}
                    onChange={(e) => setNumGroups(Math.max(1, Math.min(10, Number(e.target.value))))}
                    className="w-20 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm font-mono focus:outline-none focus:border-coaches-red transition-colors" />
                </div>
                <button type="button" onClick={handleCreateStructure}
                  className="flex items-center gap-2 bg-coaches-red hover:bg-coaches-red-dark text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
                  <Plus size={14} /> Create Groups
                </button>
              </div>
            </div>
          )}

          {/* Groups editor */}
          {groups.length > 0 && (
            <>
              <div className="flex items-center gap-2 flex-wrap">
                <button type="button" onClick={handleRandomize}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 border border-gray-600 text-gray-300 hover:text-white text-xs font-semibold transition-colors">
                  <Shuffle size={13} /> Randomize
                </button>
                <button type="button" onClick={handleClearAll}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 border border-gray-600 text-gray-300 hover:text-white text-xs font-semibold transition-colors">
                  <X size={13} /> Clear All
                </button>
                <button type="button" onClick={handleAddGroup}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 border border-gray-600 text-gray-300 hover:text-white text-xs font-semibold transition-colors">
                  <Plus size={13} /> Add Group
                </button>
                <span className="text-gray-600 text-xs font-mono ml-auto">{assignedIds.size}/{activePlayers.length} assigned</span>
              </div>

              {/* Unassigned pool */}
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOverGroup(-1); }}
                onDrop={(e) => { e.preventDefault(); handleDropOnUnassigned(); }}
                className={`rounded-xl border-2 p-3 transition-colors ${dragOverGroup === -1 ? "border-coaches-red bg-coaches-red/5" : "border-gray-700 bg-gray-800/40"}`}
              >
                <p className="text-gray-500 text-[10px] font-mono uppercase tracking-wider mb-2">Unassigned ({unassigned.length})</p>
                <div className="flex flex-wrap gap-1.5 min-h-[36px]">
                  {unassigned.map((p) => (
                    <PlayerChip key={p.id} player={p} allPlayers={activePlayers} onDragStart={() => handleDragStart(p.id)} />
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
                    key={idx} group={g} index={idx} players={activePlayers}
                    dragOverIdx={dragOverGroup}
                    onDragOver={setDragOverGroup} onDrop={handleDropOnGroup}
                    onNameChange={handleNameChange} onRemovePlayer={handleRemovePlayer}
                    onDeleteGroup={handleDeleteGroup}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-gray-700">
          <button type="button" onClick={onClose}
            className="px-4 py-2 rounded-lg border border-gray-600 text-gray-400 text-sm hover:text-white transition-colors">
            Cancel
          </button>
          <button type="button" onClick={handleSave} disabled={saving || !name.trim() || groups.length === 0}
            className="flex items-center gap-2 bg-coaches-red hover:bg-coaches-red-dark disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold px-5 py-2 rounded-lg transition-colors">
            <Save size={14} />
            {saving ? "Saving…" : "Save Grouping"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Grouping card ─────────────────────────────────────────────────────────

function GroupingCard({
  grouping, players, onEdit, onDuplicate, onDelete,
}: {
  grouping: PlayerGrouping; players: Player[];
  onEdit: () => void; onDuplicate: () => void; onDelete: () => void;
}) {
  const totalPlayers = grouping.groups.reduce((s, g) => s + g.playerIds.length, 0);

  return (
    <div className="bg-gray-800 border border-gray-700 hover:border-gray-500 transition-colors rounded-2xl p-4 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-coaches-red/10 border border-coaches-red/20 flex items-center justify-center shrink-0">
            <Users size={16} className="text-coaches-red" />
          </div>
          <div>
            <p className="text-white font-semibold text-sm leading-tight">{grouping.name}</p>
            <p className="text-gray-500 text-xs font-mono">
              {grouping.groups.length} group{grouping.groups.length !== 1 ? "s" : ""} · {totalPlayers} player{totalPlayers !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button type="button" onClick={onEdit} title="Edit"
            className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-gray-700 transition-colors">
            <Pencil size={14} />
          </button>
          <button type="button" onClick={onDuplicate} title="Duplicate"
            className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-gray-700 transition-colors">
            <Copy size={14} />
          </button>
          <button type="button" onClick={onDelete} title="Delete"
            className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-400/10 transition-colors">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Groups preview */}
      <div className="flex flex-col gap-1.5">
        {grouping.groups.map((g) => {
          const groupPlayers = g.playerIds
            .map((id) => players.find((p) => p.id === id))
            .filter(Boolean) as Player[];
          return (
            <div key={g.name} className="flex items-start gap-2">
              <span className="text-[10px] font-mono text-gray-500 uppercase tracking-wider w-16 shrink-0 pt-0.5">{g.name}</span>
              <div className="flex flex-wrap gap-1">
                {groupPlayers.map((p) => (
                  <span key={p.id} className="text-[10px] font-mono bg-gray-700 border border-gray-600 text-gray-300 px-1.5 py-0.5 rounded">
                    #{p.jersey_number} {playerDisplayName(p, players)}
                  </span>
                ))}
                {groupPlayers.length === 0 && (
                  <span className="text-[10px] font-mono text-gray-600">Empty</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────

export default function PlayerGroupsPage() {
  const { activeTeam } = useTeam();
  const { players }    = useTeamPlayers();
  const activePlayers  = players.filter((p) => p.status === PlayerStatus.Active);

  const [groupings,      setGroupings]      = useState<PlayerGrouping[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [editing,        setEditing]        = useState<PlayerGrouping | null | "new">(null);
  const [selectedIds,    setSelectedIds]    = useState<Set<string>>(new Set());
  const [showBulkDelete, setShowBulkDelete] = useState(false);
  const [bulkDeleting,   setBulkDeleting]   = useState(false);

  useEffect(() => {
    setLoading(true);
    const param = activeTeam ? `?team_id=${activeTeam.id}` : "";
    fetch(`/api/player-groupings${param}`)
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d)) setGroupings(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [activeTeam]);

  function handleSave(saved: PlayerGrouping) {
    setGroupings((prev) => {
      const exists = prev.find((g) => g.id === saved.id);
      return exists
        ? prev.map((g) => g.id === saved.id ? saved : g)
        : [saved, ...prev];
    });
    setEditing(null);
  }

  async function handleDuplicate(grouping: PlayerGrouping) {
    try {
      const res = await fetch("/api/player-groupings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `Copy of ${grouping.name}`,
          team_id: activeTeam?.id ?? null,
          groups: grouping.groups,
        }),
      });
      const data = await res.json();
      if (data.id) setGroupings((prev) => [data, ...prev]);
    } catch {}
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    setGroupings((prev) => prev.filter((g) => g.id !== id));
    fetch(`/api/player-groupings/${id}`, { method: "DELETE" }).catch(() => {});
  }

  async function handleBulkDelete() {
    setBulkDeleting(true);
    await Promise.all([...selectedIds].map((id) =>
      fetch(`/api/player-groupings/${id}`, { method: "DELETE" }).catch(() => {})
    ));
    setGroupings((prev) => prev.filter((g) => !selectedIds.has(g.id)));
    setSelectedIds(new Set());
    setShowBulkDelete(false);
    setBulkDeleting(false);
  }

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-white text-2xl font-bold tracking-tight">Player Groups</h1>
          <p className="text-gray-400 text-sm mt-0.5 font-mono">
            {activeTeam?.name.toUpperCase() ?? "ALL TEAMS"} · {groupings.length} GROUPING{groupings.length !== 1 ? "S" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <button
              type="button"
              onClick={() => setShowBulkDelete(true)}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 transition-colors text-white text-sm font-semibold px-4 py-2.5 rounded-lg"
            >
              <Trash2 size={15} /> Delete Selected ({selectedIds.size})
            </button>
          )}
          <button
            onClick={() => setEditing("new")}
            className="flex items-center gap-2 bg-coaches-red hover:bg-coaches-red-dark transition-colors text-white text-sm font-semibold px-4 py-2.5 rounded-lg"
          >
            <Plus size={16} /> New Grouping
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-16 text-gray-500 font-mono text-xs">LOADING…</div>
      ) : groupings.length === 0 ? (
        <div className="text-center py-16 flex flex-col items-center gap-3">
          <Users size={36} className="text-gray-700" />
          <p className="text-gray-500 text-sm">No groupings saved yet.</p>
          <p className="text-gray-600 text-xs font-mono">Create one with the button above.</p>
        </div>
      ) : (
        <>
          {groupings.length > 0 && (
            <div className="flex items-center gap-3 mb-3">
              <input
                type="checkbox"
                checked={groupings.length > 0 && groupings.every((g) => selectedIds.has(g.id))}
                ref={(el) => { if (el) el.indeterminate = selectedIds.size > 0 && !groupings.every((g) => selectedIds.has(g.id)); }}
                onChange={(e) => setSelectedIds(e.target.checked ? new Set(groupings.map((g) => g.id)) : new Set())}
                className="w-4 h-4 rounded border-gray-600 bg-gray-700 cursor-pointer accent-red-600"
              />
              <span className="text-gray-500 text-xs font-mono">SELECT ALL</span>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {groupings.map((g) => (
              <div key={g.id} className="relative">
                <input
                  type="checkbox"
                  checked={selectedIds.has(g.id)}
                  onChange={(e) => {
                    const next = new Set(selectedIds);
                    e.target.checked ? next.add(g.id) : next.delete(g.id);
                    setSelectedIds(next);
                  }}
                  className="absolute top-3 left-3 z-10 w-4 h-4 rounded border-gray-600 bg-gray-700 cursor-pointer accent-red-600"
                />
                <GroupingCard
                  grouping={g}
                  players={players}
                  onEdit={() => setEditing(g)}
                  onDuplicate={() => handleDuplicate(g)}
                  onDelete={() => handleDelete(g.id, g.name)}
                />
              </div>
            ))}
          </div>
        </>
      )}

      {/* Editor modal */}
      {editing !== null && (
        <GroupingEditor
          initial={editing === "new" ? null : editing}
          teamId={activeTeam?.id ?? null}
          activePlayers={activePlayers}
          onSave={handleSave}
          onClose={() => setEditing(null)}
        />
      )}

      {/* Bulk delete confirmation */}
      {showBulkDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-gray-900 border border-red-800/50 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
                <AlertTriangle size={18} className="text-red-400" />
              </div>
              <div>
                <p className="text-white font-semibold">Delete {selectedIds.size} grouping{selectedIds.size !== 1 ? "s" : ""}?</p>
                <p className="text-gray-400 text-sm">This cannot be undone.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowBulkDelete(false)}
                className="flex-1 py-2.5 rounded-lg border border-gray-600 text-gray-400 text-sm hover:bg-gray-800 transition-colors">
                Cancel
              </button>
              <button type="button" onClick={handleBulkDelete} disabled={bulkDeleting}
                className="flex-1 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-semibold transition-colors">
                {bulkDeleting ? "Deleting…" : "Delete All"}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
