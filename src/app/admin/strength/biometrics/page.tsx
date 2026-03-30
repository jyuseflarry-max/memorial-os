"use client";
import { useState, useEffect } from "react";
import { Pencil, Check, X, Loader2, Lock, AlertTriangle } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { calcRecovery } from "@/lib/strength-utils";
import type { StrengthBiometrics } from "@/types/strength";

export default function BiometricsPage() {
  const [rows, setRows]     = useState<StrengthBiometrics[]>([]);
  const [loading, setLoad]  = useState(true);
  const [error, setError]   = useState<string | null>(null);
  const [editing, setEditing] = useState<Record<string, Partial<StrengthBiometrics>>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/strength/biometrics").then(r => r.json()),
      fetch("/api/auth/me").then(r => r.json()),
    ]).then(([bio, me]) => {
      setRows(Array.isArray(bio) ? bio : []);
      setTenantId(me?.tenant_id ?? null);
    }).catch(e => setError(e.message)).finally(() => setLoad(false));
  }, []);

  function startEdit(row: StrengthBiometrics) {
    setEditing(prev => ({ ...prev, [row.player_id]: {
      biological_sex:  row.biological_sex,
      dob:             row.dob,
      body_weight_lbs: row.body_weight_lbs,
    }}));
  }

  async function saveEdit(playerId: string) {
    if (!tenantId) return;
    setSaving(playerId);
    const draft = editing[playerId] ?? {};
    try {
      const res = await fetch("/api/strength/biometrics", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ player_id: playerId, tenant_id: tenantId, ...draft }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      setRows(prev => prev.map(r => r.player_id === playerId
        ? { ...r, ...draft, age_display: draft.dob ? calcAge(draft.dob) : r.age_display }
        : r));
      cancelEdit(playerId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(null);
    }
  }

  function cancelEdit(playerId: string) {
    setEditing(prev => { const n = { ...prev }; delete n[playerId]; return n; });
  }

  function calcAge(dob: string) {
    try {
      const d = new Date(dob); const now = new Date();
      let y = now.getFullYear() - d.getFullYear();
      let m = now.getMonth() - d.getMonth();
      if (m < 0) { y--; m += 12; }
      return `${y}y ${m}m`;
    } catch { return null; }
  }

  return (
    <DashboardLayout>
      <div className="max-w-5xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
            <Lock size={18} className="text-amber-400" />
          </div>
          <div>
            <h1 className="text-white text-2xl font-bold tracking-tight">Player Biometrics</h1>
            <p className="text-gray-400 text-sm font-mono">COACH-ONLY · DOB & BODY WEIGHT ENCRYPTED AT REST</p>
          </div>
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
          <div className="bg-gray-800 border border-gray-700 rounded-2xl overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="border-b border-gray-700/50">
                  {["Player", "Sex", "DOB", "Age", "Body Weight", "Recovery Targets", ""].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-mono text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map(row => {
                  const draft = editing[row.player_id];
                  const isEditing = !!draft;
                  const bw = isEditing ? draft.body_weight_lbs : row.body_weight_lbs;
                  const recovery = bw ? calcRecovery(bw) : null;

                  return (
                    <tr key={row.player_id} className="border-b border-gray-700/40 last:border-0 hover:bg-gray-700/20">
                      <td className="px-4 py-3">
                        <p className="text-white text-sm font-medium">{row.player_name}</p>
                        {row.jersey_number != null && <p className="text-gray-500 text-[10px] font-mono">#{row.jersey_number}</p>}
                      </td>

                      <td className="px-4 py-3">
                        {isEditing ? (
                          <select value={draft.biological_sex ?? ""}
                            onChange={e => setEditing(p => ({ ...p, [row.player_id]: { ...p[row.player_id], biological_sex: e.target.value as "Male"|"Female" || undefined } }))}
                            className="bg-gray-700 border border-gray-600 rounded-lg px-2 py-1 text-xs text-white focus:outline-none w-24">
                            <option value="">—</option>
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                          </select>
                        ) : (
                          <span className="text-sm text-gray-300">{row.biological_sex ?? <span className="text-gray-600">—</span>}</span>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        {isEditing ? (
                          <input type="date" value={draft.dob ?? ""}
                            onChange={e => setEditing(p => ({ ...p, [row.player_id]: { ...p[row.player_id], dob: e.target.value || null } }))}
                            className="bg-gray-700 border border-gray-600 rounded-lg px-2 py-1 text-xs text-white focus:outline-none" />
                        ) : (
                          <span className="text-sm text-gray-300">{row.dob ?? <span className="text-gray-600">—</span>}</span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-sm text-gray-400 font-mono">{row.age_display ?? "—"}</td>

                      <td className="px-4 py-3">
                        {isEditing ? (
                          <div className="flex items-center gap-1">
                            <input type="number" min={0} max={500} step={0.5}
                              value={draft.body_weight_lbs ?? ""}
                              onChange={e => setEditing(p => ({ ...p, [row.player_id]: { ...p[row.player_id], body_weight_lbs: e.target.value ? Number(e.target.value) : null } }))}
                              className="w-20 bg-gray-700 border border-gray-600 rounded-lg px-2 py-1 text-xs text-white focus:outline-none" />
                            <span className="text-gray-500 text-xs">lbs</span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-300">
                            {row.body_weight_lbs != null ? `${row.body_weight_lbs} lbs` : <span className="text-gray-600">—</span>}
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        {recovery ? (
                          <div className="text-[10px] font-mono text-gray-400 space-y-0.5">
                            <p>🥩 <span className="text-white">{recovery.protein_g}g</span> post-workout protein</p>
                            <p>💧 <span className="text-white">{recovery.hydration_oz}oz</span> daily hydration</p>
                          </div>
                        ) : <span className="text-gray-600 text-xs">—</span>}
                      </td>

                      <td className="px-4 py-3">
                        {isEditing ? (
                          <div className="flex items-center gap-1">
                            <button type="button" onClick={() => saveEdit(row.player_id)}
                              disabled={saving === row.player_id}
                              className="p-1.5 rounded-lg text-green-400 hover:bg-green-400/10 transition-colors">
                              {saving === row.player_id ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                            </button>
                            <button type="button" onClick={() => cancelEdit(row.player_id)}
                              className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-700 transition-colors">
                              <X size={13} />
                            </button>
                          </div>
                        ) : (
                          <button type="button" onClick={() => startEdit(row)}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-gray-700 transition-colors">
                            <Pencil size={13} />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {rows.length === 0 && (
                  <tr><td colSpan={7} className="text-center text-gray-500 font-mono text-xs py-12">No players found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-3 flex items-center gap-2 text-[10px] font-mono text-gray-600">
          <Lock size={10} />
          DOB and body weight are AES-256-GCM encrypted before storage. Raw values are never logged.
        </div>
      </div>
    </DashboardLayout>
  );
}
