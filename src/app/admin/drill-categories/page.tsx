"use client";

import { useState } from "react";
import { Plus, Pencil, Check, X, AlertTriangle } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { useDrillCategories } from "@/context/DrillCategoryContext";

export default function DrillCategoriesPage() {
  const { categories, loading, addCategory, updateCategory, removeCategory } = useDrillCategories();
  const [newName, setNewName]     = useState("");
  const [newIsRest, setNewIsRest] = useState(false);
  const [adding, setAdding]       = useState(false);
  const [editing, setEditing]     = useState<{ id: string; name: string } | null>(null);
  const [error, setError]         = useState<string | null>(null);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setAdding(true);
    setError(null);
    try {
      await addCategory(newName.trim(), newIsRest);
      setNewName("");
      setNewIsRest(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add category");
    } finally {
      setAdding(false);
    }
  }

  async function handleRename(id: string) {
    if (!editing) return;
    const current = categories.find((c) => c.id === id)?.name;
    if (editing.name.trim() === current) { setEditing(null); return; }
    setError(null);
    try {
      await updateCategory(id, { name: editing.name.trim() });
      setEditing(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to rename category");
    }
  }

  async function handleColorChange(id: string, color: string) {
    setError(null);
    try { await updateCategory(id, { color }); }
    catch (err) { setError(err instanceof Error ? err.message : "Failed to update color"); }
  }

  async function handleToggleRest(id: string, current: boolean) {
    setError(null);
    try { await updateCategory(id, { is_rest: !current }); }
    catch (err) { setError(err instanceof Error ? err.message : "Failed to update category"); }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete category "${name}"? This cannot be undone.`)) return;
    setError(null);
    try { await removeCategory(id); }
    catch (err) { setError(err instanceof Error ? err.message : "Failed to delete category"); }
  }

  return (
    <DashboardLayout>
      <div className="max-w-xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-white text-2xl font-bold tracking-tight">Drill Categories</h1>
            <p className="text-gray-400 text-sm mt-0.5 font-mono">
              {loading ? "LOADING…" : `${categories.length} CATEGOR${categories.length !== 1 ? "IES" : "Y"}`}
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
                <th className="w-16 px-4 py-3 text-left text-[10px] font-mono text-gray-500 uppercase tracking-wider">Rest</th>
                <th className="w-20 px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={4} className="text-center text-gray-500 font-mono text-xs py-10">Loading…</td>
                </tr>
              )}
              {!loading && categories.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center text-gray-500 font-mono text-xs py-10">
                    NO CATEGORIES — ADD ONE BELOW
                  </td>
                </tr>
              )}
              {categories.map((cat) => (
                <tr
                  key={cat.id}
                  className="border-b border-gray-700/50 last:border-0 hover:bg-gray-700/20 transition-colors"
                >
                  {/* Color swatch / picker */}
                  <td className="px-5 py-3 w-14">
                    <label
                      className="w-7 h-7 rounded-lg border-2 border-gray-600 cursor-pointer block overflow-hidden"
                      style={{ backgroundColor: cat.color }}
                      title="Click to change color"
                    >
                      <input
                        type="color"
                        value={cat.color}
                        onChange={(e) => handleColorChange(cat.id, e.target.value)}
                        className="opacity-0 w-0 h-0"
                      />
                    </label>
                  </td>

                  {/* Name */}
                  <td className="px-4 py-3">
                    {editing?.id === cat.id ? (
                      <input
                        autoFocus
                        value={editing.name}
                        onChange={(e) => setEditing({ id: cat.id, name: e.target.value })}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleRename(cat.id);
                          if (e.key === "Escape") setEditing(null);
                        }}
                        className="bg-gray-700/60 border border-gray-600 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-coaches-red transition-colors w-full"
                      />
                    ) : (
                      <span className="text-white text-sm">{cat.name}</span>
                    )}
                  </td>

                  {/* REST toggle */}
                  <td className="px-4 py-3 w-16">
                    <button
                      type="button"
                      onClick={() => handleToggleRest(cat.id, cat.is_rest)}
                      className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded border transition-colors ${
                        cat.is_rest
                          ? "bg-sky-900/60 border-sky-700/60 text-sky-400"
                          : "border-gray-700 text-gray-600 hover:border-gray-500 hover:text-gray-400"
                      }`}
                      title={cat.is_rest ? "Mark as non-rest" : "Mark as rest day"}
                    >
                      REST
                    </button>
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      {editing?.id === cat.id ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleRename(cat.id)}
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
                            onClick={() => setEditing({ id: cat.id, name: cat.name })}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-gray-700 transition-colors"
                            title="Rename"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(cat.id, cat.name)}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                            title="Delete"
                          >
                            <X size={13} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Add form */}
        <form onSubmit={handleAdd} className="flex gap-2 mt-4">
          <input
            type="text"
            placeholder="New category name…"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="flex-1 bg-gray-700/60 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-coaches-red transition-colors"
          />
          <button
            type="button"
            onClick={() => setNewIsRest((v) => !v)}
            className={`px-3 py-2 rounded-lg border text-xs font-semibold transition-colors shrink-0 ${
              newIsRest
                ? "bg-sky-900/60 border-sky-700/60 text-sky-400"
                : "border-gray-600 text-gray-500 hover:border-gray-500 hover:text-gray-300"
            }`}
            title="Toggle rest day flag"
          >
            REST
          </button>
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
