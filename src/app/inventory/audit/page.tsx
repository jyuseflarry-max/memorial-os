"use client";
import { useState, useEffect, useMemo } from "react";
import { Loader2, Download } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { ConditionBadge }    from "@/components/inventory/ConditionBadge";
import { DepreciationBadge } from "@/components/inventory/DepreciationBadge";
import { useTeam }           from "@/context/TeamContext";
import type { AuditRow }     from "@/types/inventory";

export default function InventoryAuditPage() {
  const [rows, setRows]     = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState<string | null>(null);
  const [teamFilter, setTeamFilter] = useState("all");

  const { teams } = useTeam();

  useEffect(() => {
    const url = teamFilter === "all" ? "/api/inventory/audit" : `/api/inventory/audit?team_id=${teamFilter}`;
    setLoading(true);
    fetch(url)
      .then(async r => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error ?? "Failed to load");
        setRows(Array.isArray(d) ? d : []);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [teamFilter]);

  const totals = useMemo(() => ({
    items:      rows.length,
    totalCost:  rows.reduce((s, r) => s + (r.purchase_price ?? 0), 0),
    totalBook:  rows.reduce((s, r) => s + (r.book_value    ?? 0), 0),
    unconfirmed: rows.filter(r => r.assigned_player_name && !r.receipt_confirmed_at).length,
  }), [rows]);

  function downloadCsv() {
    const headers = ["Item","Category","Tag #","Size","Condition","Player","Team","Assigned","Receipt","Purchase Price","Book Value"];
    const csvRows = rows.map(r => [
      r.item_name, r.category_name, r.instance_number ?? "", r.size ?? "",
      r.condition, r.assigned_player_name ?? "", r.team_name ?? "",
      r.assigned_at ? new Date(r.assigned_at).toLocaleDateString() : "",
      r.receipt_confirmed_at ? new Date(r.receipt_confirmed_at).toLocaleDateString() : "",
      r.purchase_price ?? "", r.book_value ?? "",
    ].map(v => `"${String(v ?? "").replace(/"/g, '""')}"`).join(","));
    const csv = [headers.join(","), ...csvRows].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "inventory-audit.csv";
    a.click();
  }

  return (
    <DashboardLayout>
      <div className="max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div>
            <h1 className="text-white text-2xl font-bold tracking-tight">Inventory Audit</h1>
            <p className="text-gray-400 text-sm mt-0.5 font-mono">FULL EQUIPMENT REPORT</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={downloadCsv}
              disabled={loading || rows.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-800 border border-gray-700 text-gray-400 text-xs font-semibold hover:text-white transition-colors disabled:opacity-40"
            >
              <Download size={12} /> Export CSV
            </button>
          </div>
        </div>

        {/* Summary strip */}
        {!loading && (
          <div className="flex gap-4 mb-6 flex-wrap">
            {[
              { label: "Items",       value: totals.items },
              { label: "Total Cost",  value: `$${totals.totalCost.toFixed(0)}` },
              { label: "Book Value",  value: `$${totals.totalBook.toFixed(0)}` },
              { label: "Unconfirmed", value: totals.unconfirmed, warn: totals.unconfirmed > 0 },
            ].map(s => (
              <div key={s.label} className={`rounded-xl border px-4 py-2 flex flex-col items-center min-w-[90px] ${s.warn ? "bg-amber-400/10 border-amber-400/30" : "bg-gray-800/40 border-gray-700"}`}>
                <span className={`font-bold text-lg font-mono ${s.warn ? "text-amber-400" : "text-white"}`}>{s.value}</span>
                <span className={`text-[10px] font-mono uppercase ${s.warn ? "text-amber-500" : "text-gray-500"}`}>{s.label}</span>
              </div>
            ))}
          </div>
        )}

        {/* Team filter */}
        {teams.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap mb-5">
            <span className="text-[10px] font-mono text-gray-500 uppercase tracking-wider">Team</span>
            {["all", ...teams.map(t => t.id)].map(id => (
              <button key={id} onClick={() => setTeamFilter(id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                  teamFilter === id ? "bg-coaches-blue text-white" : "bg-gray-800 border border-gray-700 text-gray-400 hover:text-white"
                }`}>
                {id === "all" ? "All" : teams.find(t => t.id === id)?.name ?? id}
              </button>
            ))}
          </div>
        )}

        {error && (
          <div className="text-xs text-red-400 font-mono bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2 mb-4">{error}</div>
        )}

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 size={28} className="animate-spin text-coaches-red" /></div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-left">
                  {["Item","Category","Tag #","Size","Condition","Player","Assigned","Receipt","Cost","Book Value"].map(h => (
                    <th key={h} className="px-3 py-3 text-[10px] font-mono text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.instance_id} className={`border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors ${i % 2 === 0 ? "" : "bg-gray-800/10"}`}>
                    <td className="px-3 py-2.5 text-white font-medium text-xs">{r.item_name}</td>
                    <td className="px-3 py-2.5 text-gray-400 text-[10px] font-mono">{r.category_name}</td>
                    <td className="px-3 py-2.5 text-gray-300 font-mono text-[10px]">{r.instance_number ?? "—"}</td>
                    <td className="px-3 py-2.5 text-gray-300 font-mono text-[10px]">{r.size ?? "—"}</td>
                    <td className="px-3 py-2.5"><ConditionBadge condition={r.condition} /></td>
                    <td className="px-3 py-2.5 text-gray-300 text-xs">{r.assigned_player_name ?? <span className="text-gray-600 text-[10px] font-mono">Unassigned</span>}</td>
                    <td className="px-3 py-2.5 text-gray-400 text-[10px] font-mono whitespace-nowrap">
                      {r.assigned_at ? new Date(r.assigned_at).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"}) : "—"}
                    </td>
                    <td className="px-3 py-2.5">
                      {r.receipt_confirmed_at
                        ? <span className="text-green-400 text-[10px] font-mono">Confirmed</span>
                        : r.assigned_player_name
                          ? <span className="text-amber-400 text-[10px] font-mono">Pending</span>
                          : <span className="text-gray-600 text-[10px] font-mono">—</span>
                      }
                    </td>
                    <td className="px-3 py-2.5 text-gray-300 text-[10px] font-mono">
                      {r.purchase_price != null ? `$${r.purchase_price.toFixed(2)}` : "—"}
                    </td>
                    <td className="px-3 py-2.5">
                      <DepreciationBadge
                        purchasePrice={r.purchase_price}
                        usefulLifeYears={r.useful_life_years}
                        method={r.depreciation_method}
                        instancePurchasedAt={null}
                        itemPurchasedAt={r.effective_purchased_at}
                      />
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
