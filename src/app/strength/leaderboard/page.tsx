"use client";
import { useState, useEffect } from "react";
import { Trophy, ShieldCheck, Loader2 } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import type { LeaderboardEntry } from "@/types/strength";

interface BoardData {
  entries: (LeaderboardEntry & { exercise_id: string; exercise_name: string })[];
  exercises: { id: string; name: string }[];
}

export default function LeaderboardPage() {
  const [data, setData]         = useState<BoardData | null>(null);
  const [exerciseId, setExId]   = useState<string>("");
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const url = exerciseId ? `/api/strength/leaderboard?exercise_id=${exerciseId}` : "/api/strength/leaderboard";
    fetch(url)
      .then(async r => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error ?? "Failed to load leaderboard");
        setData(d);
        if (!exerciseId && d.exercises?.length) setExId(d.exercises[0].id);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [exerciseId]);

  const filtered = data?.entries.filter(e => !exerciseId || e.exercise_id === exerciseId) ?? [];

  return (
    <DashboardLayout>
      <div className="max-w-2xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center shrink-0">
            <Trophy size={18} className="text-yellow-400" />
          </div>
          <div>
            <h1 className="text-white text-2xl font-bold tracking-tight">SWR Leaderboard</h1>
            <p className="text-gray-400 text-sm mt-0.5 font-mono">STRENGTH-TO-WEIGHT RATIO RANKINGS</p>
          </div>
        </div>

        {/* Exercise filter */}
        {data?.exercises && data.exercises.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-5">
            {data.exercises.map(ex => (
              <button
                key={ex.id}
                type="button"
                onClick={() => setExId(ex.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  exerciseId === ex.id
                    ? "bg-coaches-blue text-white"
                    : "bg-gray-800 border border-gray-700 text-gray-400 hover:text-white"
                }`}
              >
                {ex.name}
              </button>
            ))}
          </div>
        )}

        {error && <p className="text-red-400 text-xs font-mono mb-4">{error}</p>}

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 size={24} className="animate-spin text-coaches-red" /></div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-gray-500 font-mono text-sm py-16">No lift data yet for this exercise.</p>
        ) : (
          <div className="bg-gray-800 border border-gray-700 rounded-2xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700/50">
                  <th className="w-12 px-4 py-3 text-left text-[10px] font-mono text-gray-500 uppercase">Rank</th>
                  <th className="px-4 py-3 text-left text-[10px] font-mono text-gray-500 uppercase">Athlete</th>
                  <th className="px-4 py-3 text-right text-[10px] font-mono text-gray-500 uppercase">Best 1RM</th>
                  <th className="px-4 py-3 text-right text-[10px] font-mono text-gray-500 uppercase">SWR</th>
                  <th className="w-10 px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map(entry => (
                  <tr key={entry.player_id} className="border-b border-gray-700/40 last:border-0 hover:bg-gray-700/20">
                    <td className="px-4 py-3">
                      <span className={`text-sm font-bold font-mono ${entry.rank <= 3 ? "text-yellow-400" : "text-gray-500"}`}>
                        #{entry.rank}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-white text-sm font-medium">{entry.player_name}</td>
                    <td className="px-4 py-3 text-right text-white text-sm font-semibold">
                      {entry.best_1rm} <span className="text-gray-500 text-xs font-normal">lbs</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {entry.swr != null
                        ? <span className="text-coaches-blue font-bold font-mono">{entry.swr.toFixed(2)}</span>
                        : <span className="text-gray-600 text-xs font-mono">—</span>
                      }
                    </td>
                    <td className="px-3 py-3">
                      {entry.is_verified && (
                        <span title="Verified 1RM"><ShieldCheck size={13} className="text-green-400" /></span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="text-[10px] font-mono text-gray-600 mt-3 text-center">
          SWR = Lift Weight ÷ Body Weight &nbsp;·&nbsp; Body weight is never displayed publicly
        </p>
      </div>
    </DashboardLayout>
  );
}
