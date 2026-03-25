"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, Check, X, Users } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { useTeam } from "@/context/TeamContext";
import { usePlayers } from "@/context/PlayerContext";
import { Team } from "@/types/team";

export default function ManageTeamsPage() {
  const { teams, activeTeam, setActiveTeam, refresh } = useTeam();
  const { players } = usePlayers();
  const [newName, setNewName]   = useState("");
  const [adding, setAdding]     = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [editing, setEditing]   = useState<{ id: string; name: string } | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  function playerCount(teamId: string) {
    return players.filter((p) => (p as { team_id?: string }).team_id === teamId).length;
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setAdding(true);
    setAddError(null);
    try {
      const res  = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to add team");
      setNewName("");
      await refresh();
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setAdding(false);
    }
  }

  async function handleRename(team: Team) {
    if (!editing || editing.name.trim() === team.name) { setEditing(null); return; }
    setSaveError(null);
    try {
      const res  = await fetch(`/api/teams/${team.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editing.name.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to rename");
      await refresh();
      setEditing(null);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Unknown error");
    }
  }

  async function handleDelete(team: Team) {
    const count = playerCount(team.id);
    const msg = count > 0
      ? `"${team.name}" has ${count} player${count > 1 ? "s" : ""} assigned. Delete anyway? Players will become unassigned.`
      : `Delete "${team.name}"?`;
    if (!confirm(msg)) return;
    try {
      await fetch(`/api/teams/${team.id}`, { method: "DELETE" });
      if (activeTeam?.id === team.id) {
        const remaining = teams.filter((t) => t.id !== team.id);
        if (remaining[0]) setActiveTeam(remaining[0]);
      }
      await refresh();
    } catch {}
  }

  const inputCls = "bg-gray-700/60 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-coaches-red transition-colors";

  return (
    <DashboardLayout>
      <div className="max-w-xl">
        <div className="mb-6">
          <h1 className="text-white text-2xl font-bold tracking-tight">Manage Teams</h1>
          <p className="text-gray-400 text-sm mt-0.5 font-mono">
            {teams.length} TEAM{teams.length !== 1 ? "S" : ""} IN PROGRAM
          </p>
        </div>

        {/* Team list */}
        <div className="bg-gray-800 border border-gray-700 rounded-2xl overflow-hidden mb-6">
          {teams.length === 0 && (
            <p className="text-center text-gray-500 font-mono text-xs py-10">NO TEAMS YET</p>
          )}
          {teams.map((team, i) => (
            <div
              key={team.id}
              className={`flex items-center gap-3 px-5 py-4 ${i < teams.length - 1 ? "border-b border-gray-700/50" : ""}`}
            >
              {/* Name / edit input */}
              <div className="flex-1 min-w-0">
                {editing?.id === team.id ? (
                  <input
                    autoFocus
                    className={`${inputCls} w-full`}
                    value={editing.name}
                    onChange={(e) => setEditing({ id: team.id, name: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleRename(team);
                      if (e.key === "Escape") setEditing(null);
                    }}
                  />
                ) : (
                  <div>
                    <p className="text-white font-semibold">{team.name}</p>
                    <p className="text-gray-500 text-xs font-mono flex items-center gap-1 mt-0.5">
                      <Users size={10} /> {playerCount(team.id)} PLAYERS
                    </p>
                  </div>
                )}
              </div>

              {/* Actions */}
              {editing?.id === team.id ? (
                <div className="flex items-center gap-1.5">
                  <button onClick={() => handleRename(team)}
                    className="p-1.5 rounded-lg text-green-400 hover:bg-green-400/10 transition-colors">
                    <Check size={15} />
                  </button>
                  <button onClick={() => setEditing(null)}
                    className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-700 transition-colors">
                    <X size={15} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <button onClick={() => setEditing({ id: team.id, name: team.name })}
                    className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-gray-700 transition-colors">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => handleDelete(team)}
                    className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-400/10 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {saveError && (
          <p className="mb-4 text-xs text-red-400 font-mono bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
            {saveError}
          </p>
        )}

        {/* Add team */}
        <form onSubmit={handleAdd} className="flex gap-2">
          <input
            required
            type="text"
            placeholder="New team name (e.g. Sophomore)"
            className={`${inputCls} flex-1`}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <button
            type="submit"
            disabled={adding}
            className="flex items-center gap-2 bg-coaches-red hover:bg-coaches-red-dark disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            <Plus size={15} />
            {adding ? "Adding…" : "Add Team"}
          </button>
        </form>
        {addError && (
          <p className="mt-2 text-xs text-red-400 font-mono">{addError}</p>
        )}
      </div>
    </DashboardLayout>
  );
}
