"use client";

import { useState } from "react";
import { Plus, Pencil, Check, X, AlertTriangle } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { useStatImpacts } from "@/context/StatImpactsContext";
import type { StatImpact } from "@/types/stat-impact";

export default function StatImpactsPage() {
  const { statImpacts, loading, addStatImpact, updateStatImpact, removeStatImpact } = useStatImpacts();
  const [newName, setNewName]   = useState("");
  const [adding, setAdding]     = useState(false);
  const [editing, setEditing]   = useState<{ id: string; name: string } | null>(null);
  const [error, setError]       = useState<string | null>(null);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setAdding(true);
    setError(null);
    try {
      const res = await fetch("/api/stat-impacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), color: "#60a5fa" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to add stat impact");
      addStatImpact(data as StatImpact);
      setNewName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add stat impact");
    } finally {
      setAdding(false);
    }
  }

  async function handleRename(id: string) {
    if (!editing) return;
    const current = statImpacts.find((s) => s.id === id);
    if (!current || editing.name.trim() === current.name) { setEditing(null); return; }
    setError(null);
    try {
      const res = await fetch(`/api/stat-impacts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editing.name.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to rename");
      updateStatImpact(data as StatImpact);
      setEditing(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to rename stat impact");
    }
  }

  async function handleColorChange(stat: StatImpact, color: string) {
    setError(null);
    try {
      const res = await fetch(`/api/stat-impacts/${stat.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ color }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to update color");
      updateStatImpact(data as StatImpact);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update color");
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete stat impact "${name}"? This cannot be undone.`)) return;
    setError(null);
    try {
      const res = await fetch(`/api/stat-impacts/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? "Failed to delete");
      }
      removeStatImpact(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete stat impact");
    }
  }

  const isDefault = (id: string) => id.startsWith("default-");

  return (
    <DashboardLayout>
      <div className="max-w-xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-white text-2xl font-bold tracking-tight">Stat Impacts</h1>
            <p className="text-gray-400 text-sm mt-0.5 font-mono">
              {loading ? "LOADING…" : `${statImpacts.length} STAT${statImpacts.length !== 1 ? "S" : ""}`}
            </p>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 mb-4 text-xs text-red-400 font-mono bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
            <AlertTriangle size={13} className="shrink-0" />
            <span className="flex-1">{error}</span>
            <button type="button" onClick={() => setError(null)} className="shrink-0 hover:text-red-300 transition-colors">
              <X size={13} />
            </button>
          </div>
        )}

        <div className="bg-gray-800 border border-gray-700 rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700/50">
                <th className="w-14 px-5 py-3 text-left text-[10px] font-mono text-gray-500 uppercase tracking-wider">Color</th>
                <th className="px-4 py-3 text-left text-[10px] font-mono text-gray-500 uppercase tracking-wider">Name</th>
                <th className="w-20 px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={3} className="text-center text-gray-500 font-mono text-xs py-10">Loading…</td>
                </tr>
              )}
              {!loading && statImpacts.length === 0 && (
                <tr>
                  <td colSpan={3} className="text-center text-gray-500 font-mono text-xs py-10">
                    NO STAT IMPACTS — ADD ONE BELOW
                  </td>
                </tr>
              )}
              {statImpacts.map((stat) => {
                const def = isDefault(stat.id);
                return (
                  <tr
                    key={stat.id}
                    className="border-b border-gray-700/50 last:border-0 hover:bg-gray-700/20 transition-colors"
                  >
                    {/* Color swatch / picker */}
                    <td className="px-5 py-3 w-14">
                      {def ? (
                        <div className="w-7 h-7 rounded-lg border-2 border-gray-600" style={{ backgroundColor: stat.color }} />
                      ) : (
                        <label
                          className="w-7 h-7 rounded-lg border-2 border-gray-600 cursor-pointer block overflow-hidden"
                          style={{ backgroundColor: stat.color }}
                          title="Click to change color"
                        >
                          <input
                            type="color"
                            value={stat.color}
                            onChange={(e) => handleColorChange(stat, e.target.value)}
                            className="opacity-0 w-0 h-0"
                          />
                        </label>
                      )}
                    </td>
                    {/* Name */}
                    <td className="px-4 py-3">
                      {editing?.id === stat.id ? (
                        <input
                          autoFocus
                          value={editing.name}
                          onChange={(e) => setEditing({ id: stat.id, name: e.target.value })}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleRename(stat.id);
                            if (e.key === "Escape") setEditing(null);
                          }}
                          className="bg-gray-700/60 border border-gray-600 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-coaches-red transition-colors w-full"
                        />
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-white text-sm">{stat.name}</span>
                          {def && (
                            <span className="text-[9px] font-mono font-semibold px-1.5 py-px rounded bg-gray-700 text-gray-400 border border-gray-600">
                              DEFAULT
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        {editing?.id === stat.id ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handleRename(stat.id)}
                              className="p-1.5 rounded-lg text-green-400 hover:bg-green-400/10 transition-colors"
                            >
                              <Check size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditing(null)}
                              className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-700 transition-colors"
                            >
                              <X size={14} />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              disabled={def}
                              onClick={() => setEditing({ id: stat.id, name: stat.name })}
                              className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                              title={def ? "Add a real stat to enable editing" : "Rename"}
                            >
                              <Pencil size={13} />
                            </button>
                            <button
                              type="button"
                              disabled={def}
                              onClick={() => handleDelete(stat.id, stat.name)}
                              className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-400/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                              title={def ? "Add a real stat to enable deletion" : "Delete"}
                            >
                              <X size={13} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Add form */}
        <form onSubmit={handleAdd} className="flex gap-2 mt-4">
          <input
            type="text"
            placeholder="New stat impact name…"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="flex-1 bg-gray-700/60 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-coaches-red transition-colors"
          />
          <button
            type="submit"
            disabled={!newName.trim() || adding}
            className="flex items-center gap-2 bg-coaches-red hover:bg-coaches-red-dark disabled:opacity-40 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            <Plus size={14} />
            {adding ? "Adding…" : "Add"}
          </button>
        </form>
      </div>
    </DashboardLayout>
  );
}
