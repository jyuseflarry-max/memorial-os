"use client";
import { useState, useEffect } from "react";
import { Loader2, Package, ArrowLeft } from "lucide-react";
import { useParams } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import { PlayerInventoryCard } from "@/components/inventory/PlayerInventoryCard";
import type { PlayerLockerItem } from "@/types/inventory";

export default function PlayerLockerPage() {
  const { playerId } = useParams<{ playerId: string }>();
  const [items, setItems]   = useState<PlayerLockerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState<string | null>(null);

  function load() {
    setLoading(true);
    fetch(`/api/inventory/locker-tag/${playerId}`)
      .then(async r => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error ?? "Failed to load");
        setItems(Array.isArray(d) ? d : []);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, [playerId]);

  const totalValue = items.reduce((sum, i) => sum + (i.book_value ?? 0), 0);
  const unconfirmed = items.filter(i => !i.receipt_confirmed_at).length;

  return (
    <DashboardLayout>
      <div className="max-w-4xl">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <a href="/inventory" className="text-gray-500 hover:text-white transition-colors">
            <ArrowLeft size={18} />
          </a>
          <div>
            <h1 className="text-white text-2xl font-bold tracking-tight">Player Locker</h1>
            <p className="text-gray-400 text-sm mt-0.5 font-mono">ASSIGNED EQUIPMENT</p>
          </div>
        </div>

        {/* Summary strip */}
        {!loading && items.length > 0 && (
          <div className="flex gap-4 mb-6 flex-wrap">
            <div className="bg-gray-800/40 border border-gray-700 rounded-xl px-4 py-2 flex flex-col items-center min-w-[90px]">
              <span className="text-white font-bold text-lg font-mono">{items.length}</span>
              <span className="text-[10px] font-mono text-gray-500 uppercase">Items</span>
            </div>
            <div className="bg-gray-800/40 border border-gray-700 rounded-xl px-4 py-2 flex flex-col items-center min-w-[90px]">
              <span className="text-white font-bold text-lg font-mono">${totalValue.toFixed(0)}</span>
              <span className="text-[10px] font-mono text-gray-500 uppercase">Book Value</span>
            </div>
            {unconfirmed > 0 && (
              <div className="bg-amber-400/10 border border-amber-400/30 rounded-xl px-4 py-2 flex flex-col items-center min-w-[90px]">
                <span className="text-amber-400 font-bold text-lg font-mono">{unconfirmed}</span>
                <span className="text-[10px] font-mono text-amber-500 uppercase">Unconfirmed</span>
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="text-xs text-red-400 font-mono bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2 mb-4">{error}</div>
        )}

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 size={28} className="animate-spin text-coaches-red" /></div>
        ) : items.length === 0 ? (
          <div className="text-center py-20">
            <Package size={36} className="text-gray-700 mx-auto mb-3" />
            <p className="text-gray-500 font-mono text-sm">No equipment assigned.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {items.map(item => (
              <PlayerInventoryCard
                key={item.instance_id}
                item={item}
                showReceipt={true}
                onReceiptConfirmed={load}
              />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
