"use client";
import { useState, useEffect } from "react";
import { Loader2, Plus, Package } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import type { InventoryItem, InventoryCategory } from "@/types/inventory";

export default function AdminInventoryItemsPage() {
  const [items, setItems]         = useState<InventoryItem[]>([]);
  const [categories, setCategories] = useState<InventoryCategory[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [showForm, setShowForm]   = useState(false);
  const [saving, setSaving]       = useState(false);
  const [form, setForm] = useState({
    name: "", description: "", category_id: "",
    purchase_price: "", useful_life_years: "3", purchased_at: "",
  });

  function loadAll() {
    setLoading(true);
    Promise.all([
      fetch("/api/inventory/items").then(r => r.json()),
      fetch("/api/inventory/categories").then(r => r.json()),
    ])
      .then(([i, c]) => { setItems(i); setCategories(c); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadAll(); }, []);

  async function save() {
    if (!form.name || !form.category_id) return;
    setSaving(true);
    try {
      const res = await fetch("/api/inventory/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name:              form.name,
          description:       form.description || null,
          category_id:       form.category_id,
          purchase_price:    form.purchase_price    ? parseFloat(form.purchase_price)    : null,
          useful_life_years: form.useful_life_years ? parseFloat(form.useful_life_years) : 3,
          purchased_at:      form.purchased_at      || null,
        }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      setForm({ name: "", description: "", category_id: "", purchase_price: "", useful_life_years: "3", purchased_at: "" });
      setShowForm(false);
      loadAll();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <DashboardLayout>
      <div className="max-w-5xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-white text-2xl font-bold tracking-tight">Item Catalog</h1>
            <p className="text-gray-400 text-sm mt-0.5 font-mono">ADMIN — INVENTORY ITEMS</p>
          </div>
          <button
            onClick={() => setShowForm(v => !v)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-coaches-blue text-white text-sm font-semibold hover:bg-coaches-blue/90 transition-colors"
          >
            <Plus size={15} /> New Item
          </button>
        </div>

        {showForm && (
          <div className="mb-6 bg-gray-800/40 border border-gray-700 rounded-2xl p-5 flex flex-col gap-4">
            <h3 className="text-white font-semibold text-sm">Add Item Type</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-mono text-gray-500 uppercase mb-1">Name *</label>
                <input className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gray-500"
                  value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label className="block text-[10px] font-mono text-gray-500 uppercase mb-1">Category *</label>
                <select className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gray-500"
                  value={form.category_id} onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}>
                  <option value="">— Select —</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-mono text-gray-500 uppercase mb-1">Purchase Price ($)</label>
                <input type="number" min="0" step="0.01" className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gray-500"
                  value={form.purchase_price} onChange={e => setForm(f => ({ ...f, purchase_price: e.target.value }))} />
              </div>
              <div>
                <label className="block text-[10px] font-mono text-gray-500 uppercase mb-1">Useful Life (years)</label>
                <input type="number" min="1" className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gray-500"
                  value={form.useful_life_years} onChange={e => setForm(f => ({ ...f, useful_life_years: e.target.value }))} />
              </div>
              <div>
                <label className="block text-[10px] font-mono text-gray-500 uppercase mb-1">Date Purchased</label>
                <input type="date" className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gray-500"
                  value={form.purchased_at} onChange={e => setForm(f => ({ ...f, purchased_at: e.target.value }))} />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[10px] font-mono text-gray-500 uppercase mb-1">Description</label>
                <input className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gray-500"
                  value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-xl border border-gray-700 text-gray-400 text-sm hover:text-white transition-colors">Cancel</button>
              <button onClick={save} disabled={saving || !form.name || !form.category_id}
                className="px-4 py-2 rounded-xl bg-coaches-blue text-white text-sm font-semibold disabled:opacity-40 hover:bg-coaches-blue/90 transition-colors">
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        )}

        {error && <div className="text-xs text-red-400 font-mono bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2 mb-4">{error}</div>}

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 size={28} className="animate-spin text-coaches-red" /></div>
        ) : items.length === 0 ? (
          <div className="text-center py-20">
            <Package size={36} className="text-gray-700 mx-auto mb-3" />
            <p className="text-gray-500 font-mono text-sm">No item types yet. Add one to start tracking.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-left">
                  {["Name","Category","Price","Useful Life","Purchased"].map(h => (
                    <th key={h} className="px-4 py-3 text-[10px] font-mono text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => (
                  <tr key={item.id} className={`border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors ${i % 2 === 0 ? "" : "bg-gray-800/10"}`}>
                    <td className="px-4 py-3">
                      <p className="text-white font-medium">{item.name}</p>
                      {item.description && <p className="text-gray-500 text-[10px] font-mono">{item.description}</p>}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs font-mono">{item.category_name ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-300 text-xs font-mono">
                      {item.purchase_price != null ? `$${item.purchase_price.toFixed(2)}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-300 text-xs font-mono">{item.useful_life_years}y</td>
                    <td className="px-4 py-3 text-gray-400 text-[10px] font-mono">
                      {item.purchased_at ? new Date(item.purchased_at).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}) : "—"}
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
