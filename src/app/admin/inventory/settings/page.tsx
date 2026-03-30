"use client";
import { useState, useEffect } from "react";
import { Loader2, Save } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import type { InventorySettings, RecoveryValuation } from "@/types/inventory";

const VALUATION_OPTIONS: { value: RecoveryValuation; label: string; desc: string }[] = [
  { value: "original",    label: "Original Cost",       desc: "Charge the original purchase price" },
  { value: "depreciated", label: "Depreciated Value",   desc: "Charge current book value (recommended)" },
  { value: "fixed_pct",   label: "Fixed Percentage",    desc: "Charge a fixed % of original cost" },
];

export default function AdminInventorySettingsPage() {
  const [settings, setSettings] = useState<Partial<InventorySettings>>({
    recovery_valuation:     "depreciated",
    recovery_pct:           100,
    alumni_buyback_enabled: false,
    alumni_buyback_pct:     50,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/inventory/settings")
      .then(r => r.json())
      .then(d => setSettings(d))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  async function save() {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/inventory/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <DashboardLayout>
      <div className="max-w-2xl">
        <div className="mb-6">
          <h1 className="text-white text-2xl font-bold tracking-tight">Inventory Settings</h1>
          <p className="text-gray-400 text-sm mt-0.5 font-mono">RECOVERY &amp; BUYBACK POLICY</p>
        </div>

        {error && <div className="text-xs text-red-400 font-mono bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2 mb-4">{error}</div>}

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 size={28} className="animate-spin text-coaches-red" /></div>
        ) : (
          <div className="flex flex-col gap-6">
            {/* Recovery valuation */}
            <div className="bg-gray-800/40 border border-gray-700 rounded-2xl p-5 flex flex-col gap-4">
              <h3 className="text-white font-semibold text-sm">Equipment Recovery Valuation</h3>
              <p className="text-gray-500 text-xs font-mono">How to calculate the charge when unreturned equipment is recovered from a player.</p>
              <div className="flex flex-col gap-2">
                {VALUATION_OPTIONS.map(opt => (
                  <label key={opt.value} className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                    settings.recovery_valuation === opt.value
                      ? "border-coaches-blue bg-coaches-blue/10"
                      : "border-gray-700 hover:border-gray-600"
                  }`}>
                    <input type="radio" name="valuation" value={opt.value}
                      checked={settings.recovery_valuation === opt.value}
                      onChange={() => setSettings(s => ({ ...s, recovery_valuation: opt.value }))}
                      className="mt-0.5 accent-coaches-blue" />
                    <div>
                      <p className="text-white text-sm font-semibold">{opt.label}</p>
                      <p className="text-gray-500 text-[10px] font-mono">{opt.desc}</p>
                    </div>
                  </label>
                ))}
              </div>

              {settings.recovery_valuation === "fixed_pct" && (
                <div>
                  <label className="block text-[10px] font-mono text-gray-500 uppercase mb-1">Recovery Percentage (%)</label>
                  <input type="number" min="0" max="100" step="1"
                    className="w-32 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gray-500"
                    value={settings.recovery_pct ?? 100}
                    onChange={e => setSettings(s => ({ ...s, recovery_pct: parseFloat(e.target.value) }))} />
                </div>
              )}
            </div>

            {/* Alumni buyback */}
            <div className="bg-gray-800/40 border border-gray-700 rounded-2xl p-5 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-white font-semibold text-sm">Alumni Buyback Program</h3>
                  <p className="text-gray-500 text-xs font-mono mt-0.5">Allow alumni to purchase their assigned equipment at a discounted rate.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer"
                    checked={settings.alumni_buyback_enabled ?? false}
                    onChange={e => setSettings(s => ({ ...s, alumni_buyback_enabled: e.target.checked }))} />
                  <div className="w-10 h-5 bg-gray-700 rounded-full peer peer-checked:bg-coaches-blue after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5" />
                </label>
              </div>
              {settings.alumni_buyback_enabled && (
                <div>
                  <label className="block text-[10px] font-mono text-gray-500 uppercase mb-1">Buyback Percentage of Book Value (%)</label>
                  <input type="number" min="0" max="100" step="1"
                    className="w-32 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gray-500"
                    value={settings.alumni_buyback_pct ?? 50}
                    onChange={e => setSettings(s => ({ ...s, alumni_buyback_pct: parseFloat(e.target.value) }))} />
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 justify-end">
              {saved && <span className="text-green-400 text-xs font-mono">Saved.</span>}
              <button onClick={save} disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-coaches-blue text-white text-sm font-semibold hover:bg-coaches-blue/90 transition-colors disabled:opacity-50">
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                {saving ? "Saving…" : "Save Settings"}
              </button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
