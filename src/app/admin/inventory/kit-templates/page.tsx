"use client";
import { useState, useEffect } from "react";
import { Loader2, Plus, Package, Trash2 } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { useTeam }     from "@/context/TeamContext";
import type { KitTemplate, InventoryItem } from "@/types/inventory";

export default function AdminKitTemplatesPage() {
  const [templates, setTemplates] = useState<KitTemplate[]>([]);
  const [items, setItems]         = useState<InventoryItem[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [showForm, setShowForm]   = useState(false);
  const [saving, setSaving]       = useState(false);
  const [name, setName]           = useState("");
  const [teamId, setTeamId]       = useState("");
  const [selectedItems, setSelectedItems] = useState<{ item_id: string; size: string }[]>([]);

  const { teams } = useTeam();

  function load() {
    setLoading(true);
    Promise.all([
      fetch("/api/inventory/kit-templates").then(r => r.json()),
      fetch("/api/inventory/items").then(r => r.json()),
    ])
      .then(([t, i]) => { setTemplates(t); setItems(i); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  function addItem() {
    setSelectedItems(prev => [...prev, { item_id: "", size: "" }]);
  }

  function removeItem(idx: number) {
    setSelectedItems(prev => prev.filter((_, i) => i !== idx));
  }

  async function save() {
    if (!name) return;
    setSaving(true);
    try {
      const res = await fetch("/api/inventory/kit-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          team_id: teamId || null,
          items: selectedItems.filter(i => i.item_id).map(i => ({
            item_id: i.item_id,
            ...(i.size ? { size: i.size } : {}),
          })),
        }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      setName(""); setTeamId(""); setSelectedItems([]); setShowForm(false);
      load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  async function deleteTemplate(id: string) {
    const res = await fetch(`/api/inventory/kit-templates/${id}`, { method: "DELETE" });
    if (res.ok) load();
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-white text-2xl font-bold tracking-tight">Kit Templates</h1>
            <p className="text-gray-400 text-sm mt-0.5 font-mono">ADMIN — EQUIPMENT KITS</p>
          </div>
          <button onClick={() => setShowForm(v => !v)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-coaches-blue text-white text-sm font-semibold hover:bg-coaches-blue/90 transition-colors">
            <Plus size={15} /> New Kit
          </button>
        </div>

        {showForm && (
          <div className="mb-6 bg-gray-800/40 border border-gray-700 rounded-2xl p-5 flex flex-col gap-4">
            <h3 className="text-white font-semibold text-sm">New Kit Template</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-mono text-gray-500 uppercase mb-1">Kit Name *</label>
                <input className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gray-500"
                  value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Varsity Game Kit" />
              </div>
              <div>
                <label className="block text-[10px] font-mono text-gray-500 uppercase mb-1">Team (optional)</label>
                <select className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gray-500"
                  value={teamId} onChange={e => setTeamId(e.target.value)}>
                  <option value="">All teams</option>
                  {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
            </div>

            {/* Items in kit */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[10px] font-mono text-gray-500 uppercase">Items</label>
                <button onClick={addItem} className="text-xs text-coaches-blue hover:underline flex items-center gap-1">
                  <Plus size={11} /> Add item
                </button>
              </div>
              <div className="flex flex-col gap-2">
                {selectedItems.map((si, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <select className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gray-500"
                      value={si.item_id} onChange={e => setSelectedItems(prev => prev.map((x, i) => i === idx ? { ...x, item_id: e.target.value } : x))}>
                      <option value="">— Select item —</option>
                      {items.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
                    </select>
                    <input className="w-24 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gray-500"
                      placeholder="Size" value={si.size} onChange={e => setSelectedItems(prev => prev.map((x, i) => i === idx ? { ...x, size: e.target.value } : x))} />
                    <button onClick={() => removeItem(idx)} className="text-gray-600 hover:text-red-400 transition-colors"><Trash2 size={14} /></button>
                  </div>
                ))}
                {selectedItems.length === 0 && <p className="text-gray-600 text-xs font-mono">No items added yet.</p>}
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-xl border border-gray-700 text-gray-400 text-sm hover:text-white transition-colors">Cancel</button>
              <button onClick={save} disabled={saving || !name}
                className="px-4 py-2 rounded-xl bg-coaches-blue text-white text-sm font-semibold disabled:opacity-40 hover:bg-coaches-blue/90 transition-colors">
                {saving ? "Saving…" : "Save Kit"}
              </button>
            </div>
          </div>
        )}

        {error && <div className="text-xs text-red-400 font-mono bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2 mb-4">{error}</div>}

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 size={28} className="animate-spin text-coaches-red" /></div>
        ) : templates.length === 0 ? (
          <div className="text-center py-20">
            <Package size={36} className="text-gray-700 mx-auto mb-3" />
            <p className="text-gray-500 font-mono text-sm">No kit templates yet.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {templates.map(tpl => {
              const team = teams.find(t => t.id === tpl.team_id);
              return (
                <div key={tpl.id} className="bg-gray-800/40 border border-gray-700 rounded-xl p-4 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-white font-semibold">{tpl.name}</p>
                    <p className="text-gray-500 text-[10px] font-mono mt-0.5">
                      {team ? team.name : "All teams"} · {tpl.items.length} item{tpl.items.length !== 1 ? "s" : ""}
                    </p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {tpl.items.map((item, i) => {
                        const found = items.find(it => it.id === item.item_id);
                        return (
                          <span key={i} className="text-[10px] font-mono bg-gray-700/50 border border-gray-700 rounded px-1.5 py-0.5 text-gray-300">
                            {found?.name ?? item.item_id}{item.size ? ` (${item.size})` : ""}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                  <button onClick={() => deleteTemplate(tpl.id)} className="text-gray-600 hover:text-red-400 transition-colors shrink-0 mt-1">
                    <Trash2 size={15} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
