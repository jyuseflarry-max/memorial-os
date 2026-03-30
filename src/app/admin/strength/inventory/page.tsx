"use client";
import { useState, useEffect } from "react";
import { Loader2, CheckSquare, Square, AlertTriangle, X } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { EQUIPMENT_CATALOG } from "@/lib/strength-utils";
import type { FacilityInventoryItem } from "@/types/strength";

const CATEGORY_LABELS: Record<string, string> = {
  bars:                  "Barbells",
  plates:                "Plates",
  dumbbells_kettlebells: "Dumbbells & Kettlebells",
  machines:              "Machines & Benches",
  accessories:           "Accessories",
};

export default function InventoryPage() {
  const [items, setItems]   = useState<FacilityInventoryItem[]>([]);
  const [loading, setLoad]  = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty]   = useState(false);
  const [error, setError]   = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/strength/inventory")
      .then(r => r.json())
      .then(d => setItems(Array.isArray(d) ? d : []))
      .catch(e => setError(e.message))
      .finally(() => setLoad(false));
  }, []);

  function toggle(key: string) {
    setItems(prev => prev.map(i => i.equipment_key === key ? { ...i, available: !i.available } : i));
    setDirty(true);
  }

  function setQty(key: string, qty: number) {
    setItems(prev => prev.map(i => i.equipment_key === key ? { ...i, quantity: qty } : i));
    setDirty(true);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/strength/inventory", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(items.map(i => ({
          equipment_key: i.equipment_key,
          available: i.available,
          quantity: i.quantity,
        }))),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      setDirty(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  const categories = [...new Set(EQUIPMENT_CATALOG.map(e => e.category))] as string[];

  return (
    <DashboardLayout>
      <div className="max-w-3xl">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-white text-2xl font-bold tracking-tight">Facility Inventory</h1>
            <p className="text-gray-400 text-sm font-mono">TOGGLE AVAILABLE EQUIPMENT</p>
          </div>
          {dirty && (
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 bg-coaches-red hover:bg-coaches-red-dark disabled:opacity-40 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              {saving ? "Saving…" : "Save Changes"}
            </button>
          )}
        </div>

        {error && (
          <div className="flex items-center gap-2 mb-4 text-xs text-red-400 font-mono bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
            <AlertTriangle size={13} className="shrink-0" />
            <span className="flex-1">{error}</span>
            <button type="button" onClick={() => setError(null)}><X size={13} /></button>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 size={24} className="animate-spin text-coaches-red" /></div>
        ) : (
          <div className="flex flex-col gap-6">
            {categories.map(cat => {
              const catItems = items.filter(i => i.category === cat);
              if (!catItems.length) return null;
              return (
                <div key={cat}>
                  <h2 className="text-xs font-mono text-gray-500 uppercase tracking-widest mb-3">{CATEGORY_LABELS[cat] ?? cat}</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {catItems.map(item => (
                      <button
                        key={item.equipment_key}
                        type="button"
                        onClick={() => toggle(item.equipment_key)}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all ${
                          item.available
                            ? "bg-green-500/10 border-green-500/30 text-white"
                            : "bg-gray-800 border-gray-700 text-gray-500 hover:border-gray-500"
                        }`}
                      >
                        {item.available
                          ? <CheckSquare size={16} className="text-green-400 shrink-0" />
                          : <Square      size={16} className="text-gray-600 shrink-0" />
                        }
                        <span className="flex-1 text-sm font-medium">{item.equipment_label}</span>
                        {/* Quantity input for plates */}
                        {cat === "plates" && item.available && (
                          <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                            <input
                              type="number"
                              min={1}
                              max={20}
                              value={item.quantity}
                              onChange={e => setQty(item.equipment_key, Number(e.target.value))}
                              className="w-12 bg-gray-700 border border-gray-600 rounded-md px-1.5 py-0.5 text-xs text-white text-center focus:outline-none"
                            />
                            <span className="text-[10px] text-gray-500">pairs</span>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
