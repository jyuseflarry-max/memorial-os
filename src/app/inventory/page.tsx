"use client";
import { useState, useEffect, useMemo } from "react";
import { Loader2, Package, Search, UserCheck, AlertCircle } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { ConditionBadge }      from "@/components/inventory/ConditionBadge";
import { DepreciationBadge }   from "@/components/inventory/DepreciationBadge";
import { useTeam }             from "@/context/TeamContext";

interface InstanceRow {
  id:                   string;
  item_name:            string | null;
  category_name:        string | null;
  instance_number:      string | null;
  size:                 string | null;
  condition:            string;
  team_id:              string | null;
  assigned_player_name: string | null;
  assigned_at:          string | null;
  receipt_confirmed_at: string | null;
  item_purchase_price:  number | null;
  item_useful_life_years: number;
  depreciation_method:  string;
  item_purchased_at:    string | null;
  purchased_at:         string | null;
}

export default function InventoryPage() {
  const [rows, setRows]     = useState<InstanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [teamFilter, setTeamFilter] = useState("all");
  const [showUnconfirmed, setShowUnconfirmed] = useState(false);

  const { teams } = useTeam();

  useEffect(() => {
    const url = showUnconfirmed ? "/api/inventory/instances?unconfirmed=true" : "/api/inventory/instances";
    fetch(url)
      .then(async r => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error ?? "Failed to load");
        setRows(Array.isArray(d) ? d : []);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [showUnconfirmed]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return rows.filter(r => {
      if (teamFilter !== "all" && r.team_id !== teamFilter) return false;
      if (q && !r.item_name?.toLowerCase().includes(q) &&
               !r.assigned_player_name?.toLowerCase().includes(q) &&
               !r.instance_number?.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [rows, teamFilter, search]);

  const unconfirmedCount = rows.filter(r => r.assigned_player_name && !r.receipt_confirmed_at).length;

  return (
    <DashboardLayout>
      <div className="max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div>
            <h1 className="text-white text-2xl font-bold tracking-tight">Inventory</h1>
            <p className="text-gray-400 text-sm mt-0.5 font-mono">EQUIPMENT TRACKING</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {unconfirmedCount > 0 && (
              <button
                onClick={() => setShowUnconfirmed(v => !v)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${
                  showUnconfirmed
                    ? "bg-amber-400/20 border-amber-400/40 text-amber-400"
                    : "bg-gray-800 border-gray-700 text-gray-400 hover:text-white"
                }`}
              >
                <AlertCircle size={12} />
                {unconfirmedCount} Unconfirmed
              </button>
            )}
            <a
              href="/inventory/audit"
              className="px-3 py-1.5 rounded-lg bg-gray-800 border border-gray-700 text-gray-400 text-xs font-semibold hover:text-white transition-colors"
            >
              Full Audit
            </a>
          </div>
        </div>

        {/* Filters */}
        {!loading && (
          <div className="flex flex-wrap gap-4 mb-5">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                placeholder="Search item, player, tag…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-8 pr-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-gray-500"
              />
            </div>
            {/* Team filter */}
            {teams.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-mono text-gray-500 uppercase tracking-wider">Team</span>
                <div className="flex gap-1 flex-wrap">
                  {["all", ...teams.map(t => t.id)].map(id => (
                    <button key={id} onClick={() => setTeamFilter(id)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                        teamFilter === id ? "bg-coaches-blue text-white" : "bg-gray-800 border border-gray-700 text-gray-400 hover:text-white"
                      }`}>
                      {id === "all" ? "All" : teams.find(t => t.id === id)?.name ?? id}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="text-xs text-red-400 font-mono bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2 mb-4">{error}</div>
        )}

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 size={28} className="animate-spin text-coaches-red" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Package size={36} className="text-gray-700 mx-auto mb-3" />
            <p className="text-gray-500 font-mono text-sm">
              {rows.length === 0 ? "No inventory items yet." : "No items match the selected filters."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-left">
                  {["Item", "Tag #", "Size", "Condition", "Assigned To", "Book Value", "Receipt"].map(h => (
                    <th key={h} className="px-4 py-3 text-[10px] font-mono text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => (
                  <tr key={r.id} className={`border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors ${i % 2 === 0 ? "" : "bg-gray-800/10"}`}>
                    <td className="px-4 py-3">
                      <p className="text-white font-medium">{r.item_name ?? "—"}</p>
                      <p className="text-gray-500 text-[10px] font-mono">{r.category_name}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-300 font-mono text-[11px]">{r.instance_number ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-300 font-mono text-[11px]">{r.size ?? "—"}</td>
                    <td className="px-4 py-3"><ConditionBadge condition={r.condition as never} /></td>
                    <td className="px-4 py-3">
                      {r.assigned_player_name ? (
                        <a href={`/inventory/${r.id}`} className="text-coaches-blue hover:underline text-xs font-medium flex items-center gap-1">
                          <UserCheck size={11} />{r.assigned_player_name}
                        </a>
                      ) : (
                        <span className="text-gray-600 text-xs font-mono">Unassigned</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <DepreciationBadge
                        purchasePrice={r.item_purchase_price}
                        usefulLifeYears={r.item_useful_life_years ?? 3}
                        method={r.depreciation_method as never ?? "none"}
                        instancePurchasedAt={r.purchased_at}
                        itemPurchasedAt={r.item_purchased_at}
                      />
                    </td>
                    <td className="px-4 py-3">
                      {r.receipt_confirmed_at ? (
                        <span className="text-green-400 text-[10px] font-mono">Confirmed</span>
                      ) : r.assigned_player_name ? (
                        <span className="text-amber-400 text-[10px] font-mono">Pending</span>
                      ) : (
                        <span className="text-gray-600 text-[10px] font-mono">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <p className="mt-3 text-[10px] font-mono text-gray-600">{filtered.length} items</p>
        )}
      </div>
    </DashboardLayout>
  );
}
