"use client";
import { useState, useEffect } from "react";
import { Plus, Loader2, CalendarDays, ChevronRight } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import type { StrengthProgram } from "@/types/strength";

const PHASE_COLORS: Record<string, string> = {
  accumulation:   "text-blue-400   bg-blue-400/10   border-blue-400/20",
  intensification:"text-orange-400 bg-orange-400/10 border-orange-400/20",
  realization:    "text-red-400    bg-red-400/10    border-red-400/20",
  deload:         "text-green-400  bg-green-400/10  border-green-400/20",
};

export default function ProgramsPage() {
  const [programs, setPrograms] = useState<StrengthProgram[]>([]);
  const [loading, setLoading]   = useState(true);
  const [creating, setCreating] = useState(false);
  const [name, setName]         = useState("");
  const [phase, setPhase]       = useState<string>("accumulation");
  const [weeks, setWeeks]       = useState(4);

  useEffect(() => {
    fetch("/api/strength/programs")
      .then(r => r.json()).then(d => setPrograms(Array.isArray(d) ? d : []))
      .catch(() => {}).finally(() => setLoading(false));
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await fetch("/api/strength/programs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phase, weeks, blocks: [] }),
      });
      if (res.ok) {
        const p = await res.json();
        setPrograms(prev => [p, ...prev]);
        setName("");
      }
    } finally {
      setCreating(false);
    }
  }

  return (
    <DashboardLayout>
      <div className="max-w-3xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
            <CalendarDays size={18} className="text-blue-400" />
          </div>
          <div>
            <h1 className="text-white text-2xl font-bold tracking-tight">S&C Programs</h1>
            <p className="text-gray-400 text-sm font-mono">MICROCYCLE PLANNING</p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 size={24} className="animate-spin text-coaches-red" /></div>
        ) : (
          <div className="flex flex-col gap-3">
            {programs.map(p => (
              <div key={p.id} className="bg-gray-800 border border-gray-700 hover:border-gray-500 rounded-2xl p-5 transition-all flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-white font-semibold text-sm">{p.name}</p>
                    {p.phase && (
                      <span className={`text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded border ${PHASE_COLORS[p.phase] ?? ""}`}>
                        {p.phase}
                      </span>
                    )}
                  </div>
                  <p className="text-gray-500 text-xs font-mono mt-0.5">{p.weeks} weeks &middot; {p.blocks?.length ?? 0} blocks</p>
                  {p.description && <p className="text-gray-400 text-xs mt-1">{p.description}</p>}
                </div>
                <ChevronRight size={14} className="text-gray-600 shrink-0 mt-1" />
              </div>
            ))}

            {programs.length === 0 && (
              <p className="text-center text-gray-500 font-mono text-sm py-12">No programs yet.</p>
            )}
          </div>
        )}

        {/* Create form */}
        <form onSubmit={handleCreate} className="mt-5 bg-gray-800 border border-gray-700 rounded-2xl p-5 flex flex-wrap gap-3 items-end">
          <div className="flex flex-col gap-1 flex-1 min-w-40">
            <label className="text-[10px] font-mono text-gray-500 uppercase">Program Name</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Pre-Season Block 1"
              className="bg-gray-700/60 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-coaches-red" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-mono text-gray-500 uppercase">Phase</label>
            <select value={phase} onChange={e => setPhase(e.target.value)}
              className="bg-gray-700/60 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none">
              {["accumulation","intensification","realization","deload"].map(p => (
                <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-mono text-gray-500 uppercase">Weeks</label>
            <input type="number" value={weeks} min={1} max={16} onChange={e => setWeeks(Number(e.target.value))}
              className="w-20 bg-gray-700/60 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none" />
          </div>
          <button type="submit" disabled={!name.trim() || creating}
            className="flex items-center gap-2 bg-coaches-red hover:bg-coaches-red-dark disabled:opacity-40 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
            <Plus size={14} /> {creating ? "Creating…" : "Create"}
          </button>
        </form>
      </div>
    </DashboardLayout>
  );
}
