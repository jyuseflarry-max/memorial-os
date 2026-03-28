"use client";

import { X, Shuffle, Plus, Save, ChevronDown, ChevronUp, Users, Trash2 } from "lucide-react";
import { Player } from "@/types/player";
import { DrillGroup } from "@/types/grouping";
import { useGroupingEditor } from "@/hooks/useGroupingEditor";
import { PlayerChip, GroupDropZone } from "@/components/grouping/GroupingParts";

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
  const {
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
  } = useGroupingEditor({ teamId, players, initialGroups, onApply });

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 overflow-y-auto p-4" onClick={onClose}>
      <div
        className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-2xl my-4 shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <Users size={18} className="text-coaches-red" />
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
                        className="text-xs font-semibold text-coaches-red hover:text-orange-300 transition-colors px-2 py-1 rounded-lg hover:bg-coaches-red/10"
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
                    className="w-20 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm font-mono focus:outline-none focus:border-coaches-red transition-colors"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleCreateStructure}
                  className="flex items-center gap-2 bg-coaches-red hover:bg-coaches-red-dark text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
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
                  dragOverGroup === -1 ? "border-coaches-red bg-coaches-red/5" : "border-gray-700 bg-gray-800/40"
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
                      allPlayers={players}
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
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-coaches-red transition-colors"
                />
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-gray-700">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-gray-600 text-gray-400 text-sm hover:text-white transition-colors"
            >
              Cancel
            </button>
            {initialGroups && initialGroups.length > 0 && (
              <button
                type="button"
                onClick={() => { onApply([]); onClose(); }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-red-800/50 text-red-400 hover:bg-red-500/10 text-sm transition-colors"
              >
                <Trash2 size={13} /> Remove Groups
              </button>
            )}
          </div>
          {groups.length > 0 && (
            <button
              type="button"
              disabled={saving}
              onClick={handleSaveAndApply}
              className="flex items-center gap-2 bg-coaches-red hover:bg-coaches-red-dark disabled:opacity-50 text-white text-sm font-semibold px-5 py-2 rounded-lg transition-colors"
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
