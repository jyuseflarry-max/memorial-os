"use client";
import { useState, useEffect } from "react";
import { Loader2, Plus } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import type { InventoryCategory, DepreciationMethod } from "@/types/inventory";

const DEP_METHODS: { value: DepreciationMethod; label: string }[] = [
  { value: "straight_line",     label: "Straight Line" },
  { value: "declining_balance", label: "Declining Balance" },
  { value: "none",              label: "None" },
];

export default function AdminInventoryCategoriesPage() {
  const [cats, setCats]       = useState<InventoryCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving]   = useState(false);
  const [form, setForm] = useState({
    name: "", useful_life_years: "3", depreciation_method: "straight_line" as DepreciationMethod,
  });

  function load() {
    setLoading(true);
    fetch("/api/inventory/categories")
      .then(r => r.json())
      .then(d => setCats(Array.isArray(d) ? d : []))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function save() {
    if (!form.name) return;
    setSaving(true);
    try {
      const res = await fetch("/api/inventory/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      setForm({ name: "", useful_life_years: "3", depreciation_method: "straight_line" });
      setShowForm(false);
      load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <DashboardLayout>
      <div className="max-w-3xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-white text-2xl font-bold tracking-tight">Categories</h1>
            <p className="text-gray-400 text-sm mt-0.5 font-mono">ADMIN — INVENTORY CATEGORIES</p>
          </div>
          <button onClick={() => setShowForm(v => !v)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-coaches-blue text-white text-sm font-semibold hover:bg-coaches-blue/90 transition-colors">
            <Plus size={15} /> New Category
          </button>
        </div>

        {showForm && (
          <div className="mb-6 bg-gray-800/40 border border-gray-700 rounded-2xl p-5 flex flex-col gap-4">
            <h3 className="text-white font-semibold text-sm">Add Category</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] font-mono text-gray-500 uppercase mb-1">Name *</label>
                <input className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gray-500"
                  value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label className="block text-[10px] font-mono text-gray-500 uppercase mb-1">Useful Life (yrs)</label>
                <input type="number" min="1" className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gray-500"
                  value={form.useful_life_years} onChange={e => setForm(f => ({ ...f, useful_life_years: e.target.value }))} />
              </div>
              <div>
                <label className="block text-[10px] font-mono text-gray-500 uppercase mb-1">Depreciation</label>
                <select className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gray-500"
                  value={form.depreciation_method} onChange={e => setForm(f => ({ ...f, depreciation_method: e.target.value as DepreciationMethod }))}>
                  {DEP_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-xl border border-gray-700 text-gray-400 text-sm hover:text-white transition-colors">Cancel</button>
              <button onClick={save} disabled={saving || !form.name}
                className="px-4 py-2 rounded-xl bg-coaches-blue text-white text-sm font-semibold disabled:opacity-40 hover:bg-coaches-blue/90 transition-colors">
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        )}

        {error && <div className="text-xs text-red-400 font-mono bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2 mb-4">{error}</div>}

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 size={28} className="animate-spin text-coaches-red" /></div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-left">
                  {["Name","Useful Life","Depreciation Method","Scope"].map(h => (
                    <th key={h} className="px-4 py-3 text-[10px] font-mono text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cats.map((c, i) => (
                  <tr key={c.id} className={`border-b border-gray-800/50 ${i % 2 === 0 ? "" : "bg-gray-800/10"}`}>
                    <td className="px-4 py-3 text-white font-medium">{c.name}</td>
                    <td className="px-4 py-3 text-gray-300 font-mono text-xs">{c.useful_life_years}y</td>
                    <td className="px-4 py-3 text-gray-300 font-mono text-xs capitalize">{c.depreciation_method.replace("_"," ")}</td>
                    <td className="px-4 py-3">
                      {c.tenant_id === null
                        ? <span className="text-[10px] font-mono text-blue-400 bg-blue-400/10 border border-blue-400/20 px-2 py-0.5 rounded-full">Global</span>
                        : <span className="text-[10px] font-mono text-gray-500">Custom</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
