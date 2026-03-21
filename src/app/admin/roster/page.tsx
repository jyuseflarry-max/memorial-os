"use client";

import { useState } from "react";
import { UserPlus, Pencil, Trash2, AlertTriangle } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import PlayerForm from "@/components/admin/PlayerForm";
import { usePlayers, NewPlayerData } from "@/context/PlayerContext";
import { Player, PlayerStatus } from "@/types/player";

// ── Status badge ──────────────────────────────────────────────────────────

const STATUS_STYLE: Record<PlayerStatus, string> = {
  [PlayerStatus.Active]:     "text-green-400  bg-green-400/10  border-green-400/20",
  [PlayerStatus.Out]:        "text-red-400    bg-red-400/10    border-red-400/20",
  [PlayerStatus.Restricted]: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
};

function StatusBadge({ status }: { status: PlayerStatus }) {
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${STATUS_STYLE[status]}`}>
      {status}
    </span>
  );
}

// ── Delete confirmation modal ─────────────────────────────────────────────

function DeleteConfirm({ player, onConfirm, onCancel }: {
  player: Player;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm bg-gray-900 border border-red-800/50 rounded-2xl p-6 shadow-2xl mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
            <AlertTriangle size={18} className="text-red-400" />
          </div>
          <div>
            <p className="text-white font-semibold">Delete Player</p>
            <p className="text-gray-400 text-sm">This cannot be undone.</p>
          </div>
        </div>

        <p className="text-gray-300 text-sm mb-6">
          Remove <span className="text-white font-semibold">#{player.jersey_number} {player.name}</span> from the roster?
          Their Vibe Check history will also be removed.
        </p>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-lg border border-gray-600 text-gray-400 text-sm hover:bg-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors"
          >
            Delete Player
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────

export default function RosterPage() {
  const { players, addPlayer, updatePlayer, deletePlayer } = usePlayers();

  const [showAdd, setShowAdd]   = useState(false);
  const [editing, setEditing]   = useState<Player | null>(null);
  const [deleting, setDeleting] = useState<Player | null>(null);

  function handleAdd(data: NewPlayerData) {
    addPlayer(data);
  }

  function handleEdit(data: NewPlayerData) {
    if (!editing) return;
    updatePlayer(editing.id, data);
    setEditing(null);
  }

  function handleDelete() {
    if (!deleting) return;
    deletePlayer(deleting.id);
    setDeleting(null);
  }

  const sorted = [...players].sort((a, b) => a.jersey_number - b.jersey_number);

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-white text-2xl font-bold tracking-tight">Roster Management</h1>
          <p className="text-gray-400 text-sm mt-0.5 font-mono">
            {players.length} PLAYERS · STAFF ONLY
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 transition-colors text-white text-sm font-semibold px-4 py-2.5 rounded-lg"
        >
          <UserPlus size={16} />
          Add Player
        </button>
      </div>

      {/* Table */}
      <div className="bg-gray-800 border border-gray-700 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-700 text-left">
              {["#", "Name", "Pos", "Class", "Status", "Titan Load", "Vibe", "Actions"].map((h) => (
                <th
                  key={h}
                  className="px-4 py-3 text-[10px] font-mono text-gray-500 uppercase tracking-wider"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-gray-500 font-mono text-xs">
                  ROSTER IS EMPTY — ADD THE FIRST PLAYER
                </td>
              </tr>
            )}
            {sorted.map((player) => (
              <tr
                key={player.id}
                className="border-b border-gray-700/50 last:border-0 hover:bg-gray-700/20 transition-colors"
              >
                <td className="px-4 py-3 text-gray-400 font-mono text-xs font-bold">
                  {player.jersey_number}
                </td>
                <td className="px-4 py-3">
                  <p className="text-white font-medium">{player.name}</p>
                </td>
                <td className="px-4 py-3 text-gray-400 font-mono text-xs">
                  {player.position}
                </td>
                <td className="px-4 py-3 text-gray-400 text-xs">
                  {player.class_year ?? "—"}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={player.status} />
                </td>
                <td className="px-4 py-3 text-gray-300 font-mono text-xs">
                  {player.titan_load}
                  <span className="text-gray-600 ml-1">AU</span>
                </td>
                <td className="px-4 py-3 text-gray-300 font-mono text-xs font-bold">
                  {player.latest_vibe_score.toFixed(1)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setEditing(player)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white text-xs font-medium transition-colors"
                    >
                      <Pencil size={11} />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleting(player)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 hover:text-red-300 text-xs font-medium transition-colors"
                    >
                      <Trash2 size={11} />
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modals */}
      {showAdd && (
        <PlayerForm
          onSave={handleAdd}
          onClose={() => setShowAdd(false)}
        />
      )}
      {editing && (
        <PlayerForm
          player={editing}
          onSave={handleEdit}
          onClose={() => setEditing(null)}
        />
      )}
      {deleting && (
        <DeleteConfirm
          player={deleting}
          onConfirm={handleDelete}
          onCancel={() => setDeleting(null)}
        />
      )}
    </DashboardLayout>
  );
}
