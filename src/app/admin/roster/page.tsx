"use client";

import { useState } from "react";
import {
  UserPlus,
  Pencil,
  Trash2,
  AlertTriangle,
  Upload,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import PlayerForm from "@/components/admin/PlayerForm";
import { NewPlayerData } from "@/context/PlayerContext";
import { useTeamPlayers } from "@/hooks/useTeamPlayers";
import { useTeam } from "@/context/TeamContext";
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

// ── Delete confirmation ───────────────────────────────────────────────────

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
          Remove{" "}
          <span className="text-white font-semibold">
            #{player.jersey_number} {player.name}
          </span>{" "}
          from the roster? Their Vibe Check history will also be removed.
        </p>
        <div className="flex gap-3">
          <button type="button" onClick={onCancel}
            className="flex-1 py-2.5 rounded-lg border border-gray-600 text-gray-400 text-sm hover:bg-gray-800 transition-colors">
            Cancel
          </button>
          <button type="button" onClick={onConfirm}
            className="flex-1 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors">
            Delete Player
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Bulk Import modal ─────────────────────────────────────────────────────

const BULK_PLACEHOLDER = `Jordan Wallace, 1, PG, Junior
Marcus Torres, 11, SF, Sophomore
Isaiah Grant, 14, PG, Senior
Rohan Singh, 34, C, Junior`;

function parseBulkText(text: string): NewPlayerData[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [name, numStr, position, classYear] = line.split(",").map((s) => s.trim());
      return {
        name: name ?? "Unknown",
        jersey_number: parseInt(numStr ?? "0") || 0,
        position: position ?? "PG",
        class_year: classYear ?? "Freshman",
        status: PlayerStatus.Active,
        titan_load: 0,
      };
    })
    .filter((p) => p.name.length > 1);
}

function BulkImportModal({ onImport, onClose, loading }: {
  onImport: (rows: NewPlayerData[]) => Promise<void>;
  onClose: () => void;
  loading: boolean;
}) {
  const [text, setText] = useState("");
  const [result, setResult] = useState<string | null>(null);

  const preview = text.trim() ? parseBulkText(text) : [];

  async function handleSubmit() {
    if (preview.length === 0) return;
    await onImport(preview);
    setResult(`${preview.length} player${preview.length === 1 ? "" : "s"} imported.`);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-gray-900 border border-gray-700 rounded-2xl p-6 shadow-2xl mx-4 flex flex-col gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white font-semibold text-base">Bulk Import</p>
            <p className="text-gray-400 text-xs mt-0.5">
              One player per line: <span className="font-mono text-gray-300">Name, #, Position, Class Year</span>
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <textarea
          rows={8}
          placeholder={BULK_PLACEHOLDER}
          value={text}
          onChange={(e) => { setText(e.target.value); setResult(null); }}
          className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 font-mono focus:outline-none focus:border-mustang-red transition-colors resize-none"
        />

        {/* Preview count */}
        <div className="flex items-center justify-between text-xs font-mono">
          <span className={preview.length > 0 ? "text-mustang-red" : "text-gray-600"}>
            {preview.length > 0
              ? `${preview.length} player${preview.length === 1 ? "" : "s"} ready to import`
              : "Paste names above"}
          </span>
          {result && <span className="text-green-400">{result}</span>}
        </div>

        {/* Preview table */}
        {preview.length > 0 && (
          <div className="bg-gray-800/60 border border-gray-700 rounded-xl overflow-hidden max-h-40 overflow-y-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="px-3 py-2 text-left text-gray-500 font-mono">Name</th>
                  <th className="px-3 py-2 text-left text-gray-500 font-mono">#</th>
                  <th className="px-3 py-2 text-left text-gray-500 font-mono">Pos</th>
                  <th className="px-3 py-2 text-left text-gray-500 font-mono">Class</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((p, i) => (
                  <tr key={i} className="border-b border-gray-700/40 last:border-0">
                    <td className="px-3 py-1.5 text-white">{p.name}</td>
                    <td className="px-3 py-1.5 text-gray-400 font-mono">{p.jersey_number || "—"}</td>
                    <td className="px-3 py-1.5 text-gray-400">{p.position}</td>
                    <td className="px-3 py-1.5 text-gray-400">{p.class_year}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex gap-3">
          <button type="button" onClick={onClose}
            className="flex-1 py-2.5 rounded-lg border border-gray-600 text-gray-400 text-sm hover:bg-gray-800 transition-colors">
            Cancel
          </button>
          <button
            type="button"
            disabled={preview.length === 0 || loading}
            onClick={handleSubmit}
            className="flex-1 py-2.5 rounded-lg bg-mustang-red hover:bg-mustang-red-dark disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors"
          >
            {loading ? "Importing…" : `Import ${preview.length > 0 ? preview.length : ""} Players`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────

export default function RosterPage() {
  const { players, loading, dbConnected, dbError, addPlayer, updatePlayer, deletePlayer, bulkImport } =
    useTeamPlayers();
  const { activeTeam } = useTeam();

  const [showAdd, setShowAdd]         = useState(false);
  const [editing, setEditing]         = useState<Player | null>(null);
  const [deleting, setDeleting]       = useState<Player | null>(null);
  const [showBulk, setShowBulk]       = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  async function handleAdd(data: NewPlayerData) {
    try { await addPlayer(data); setShowAdd(false); }
    catch (e) { setActionError(e instanceof Error ? e.message : "Add failed"); }
  }

  async function handleEdit(data: NewPlayerData) {
    if (!editing) return;
    try { await updatePlayer(editing.id, data); setEditing(null); }
    catch (e) { setActionError(e instanceof Error ? e.message : "Update failed"); }
  }

  async function handleDelete() {
    if (!deleting) return;
    try { await deletePlayer(deleting.id); setDeleting(null); }
    catch (e) { setActionError(e instanceof Error ? e.message : "Delete failed"); }
  }

  async function handleBulk(rows: NewPlayerData[]) {
    try {
      await bulkImport(rows);
      setActionError(null);
      // Keep modal open so user sees the count — they close manually
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Bulk import failed");
      throw e;
    }
  }

  const sorted = [...players].sort((a, b) => a.jersey_number - b.jersey_number);

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-white text-2xl font-bold tracking-tight">Roster Management</h1>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-gray-400 text-sm font-mono">
              {activeTeam?.name.toUpperCase() ?? "ALL TEAMS"} · {players.length} PLAYERS · STAFF ONLY
            </p>
            {/* DB connection indicator */}
            <div className={`flex items-center gap-1.5 text-[10px] font-mono px-2 py-0.5 rounded-full border ${
              dbConnected
                ? "text-green-400 bg-green-400/10 border-green-400/20"
                : "text-gray-500 bg-gray-700/40 border-gray-700"
            }`}>
              {dbConnected ? <Wifi size={10} /> : <WifiOff size={10} />}
              {dbConnected ? "DB CONNECTED" : "OFFLINE / MOCK DATA"}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowBulk(true)}
            className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 border border-gray-600 transition-colors text-gray-300 hover:text-white text-sm font-medium px-4 py-2.5 rounded-lg"
          >
            <Upload size={15} />
            Bulk Import
          </button>
          <button
            type="button"
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 bg-mustang-red hover:bg-mustang-red-dark transition-colors text-white text-sm font-semibold px-4 py-2.5 rounded-lg"
          >
            <UserPlus size={16} />
            Add Player
          </button>
        </div>
      </div>

      {/* DB error banner */}
      {dbError && (
        <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 mb-4">
          <AlertTriangle size={15} className="text-red-400 shrink-0" />
          <p className="text-red-400 text-sm flex-1">
            <span className="font-semibold">Database error:</span> {dbError}
          </p>
        </div>
      )}

      {/* Action error banner */}
      {actionError && (
        <div className="flex items-center justify-between bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 mb-4">
          <p className="text-red-400 text-sm">{actionError}</p>
          <button type="button" onClick={() => setActionError(null)}
            className="text-red-400 hover:text-red-300"><X size={14} /></button>
        </div>
      )}

      {/* Table */}
      <div className="bg-gray-800 border border-gray-700 rounded-2xl overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-700 text-left">
              {["#", "Name", "Status", "Actions"].map((h) => (
                <th key={h} className="px-4 py-3 text-[10px] font-mono text-gray-500 uppercase tracking-wider">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && players.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-12 text-center text-gray-500 font-mono text-xs">
                  LOADING…
                </td>
              </tr>
            )}
            {!loading && sorted.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-12 text-center text-gray-500 font-mono text-xs">
                  ROSTER IS EMPTY — ADD THE FIRST PLAYER
                </td>
              </tr>
            )}
            {sorted.map((player) => (
              <tr key={player.id}
                className="border-b border-gray-700/50 last:border-0 hover:bg-gray-700/20 transition-colors">
                <td className="px-4 py-3 text-gray-400 font-mono text-xs font-bold">
                  {player.jersey_number}
                </td>
                <td className="px-4 py-3">
                  <p className="text-white font-medium">{player.name}</p>
                  {player.email && (
                    <p className="text-gray-600 text-[10px] font-mono mt-0.5">{player.email}</p>
                  )}
                </td>
                <td className="px-4 py-3"><StatusBadge status={player.status} /></td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => setEditing(player)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white text-xs font-medium transition-colors">
                      <Pencil size={11} /> Edit
                    </button>
                    <button type="button" onClick={() => setDeleting(player)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 hover:text-red-300 text-xs font-medium transition-colors">
                      <Trash2 size={11} /> Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modals */}
      {showAdd  && <PlayerForm onSave={handleAdd}  onClose={() => setShowAdd(false)} />}
      {editing  && <PlayerForm player={editing} onSave={handleEdit} onClose={() => setEditing(null)} />}
      {deleting && <DeleteConfirm player={deleting} onConfirm={handleDelete} onCancel={() => setDeleting(null)} />}
      {showBulk && (
        <BulkImportModal
          loading={loading}
          onImport={handleBulk}
          onClose={() => setShowBulk(false)}
        />
      )}
    </DashboardLayout>
  );
}
