"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ClipboardList, Clock, Zap, TrendingUp, ShieldCheck, ArrowRight } from "lucide-react";
import { SessionDrill, parseTime, formatTime12, totalDuration } from "@/types/session";
import { useTeam } from "@/context/TeamContext";

interface SavedSession {
  date: string;
  start_time: string;
  drills: SessionDrill[];
}

const INTENSITY_LABEL = ["", "Recovery", "Light", "Moderate", "Hard", "All-Out"];
const INTENSITY_COLOR: Record<number, string> = {
  1: "text-green-400 bg-green-400/10",
  2: "text-green-400 bg-green-400/10",
  3: "text-yellow-400 bg-yellow-400/10",
  4: "text-red-400 bg-red-400/10",
  5: "text-red-400 bg-red-400/10",
};

function isoToday(): string {
  return new Date().toISOString().split("T")[0];
}

export default function TodayPracticeCard() {
  const router  = useRouter();
  const today   = isoToday();
  const { activeTeam } = useTeam();
  const [session, setSession] = useState<SavedSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setSession(null);
    const teamParam = activeTeam ? `?team_id=${activeTeam.id}` : "";
    fetch(`/api/sessions/${today}${teamParam}`)
      .then((r) => r.json())
      .then((data) => { if (data && !data.error && data.drills) setSession(data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [today, activeTeam]);

  const dateLabel = new Date(today + "T12:00:00").toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric",
  }).toUpperCase();

  return (
    <section className="bg-gray-800 border border-gray-700 rounded-2xl p-6 flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ClipboardList size={20} className="text-mustang-red" />
          <div>
            <h2 className="text-white font-semibold text-lg">Today&apos;s Practice</h2>
            {activeTeam && <p className="text-gray-500 text-xs font-mono -mt-0.5">{activeTeam.name.toUpperCase()}</p>}
          </div>
        </div>
        {session && (
          <span className="text-gray-400 text-xs font-mono flex items-center gap-1">
            <Clock size={12} />
            {totalDuration(session.drills)} min total
          </span>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <p className="text-gray-500 text-xs font-mono text-center py-6">LOADING…</p>
      )}

      {/* No plan */}
      {!loading && !session && (
        <div className="flex flex-col items-center gap-3 py-6">
          <p className="text-gray-500 text-sm text-center">No practice plan saved for today.</p>
          <button
            type="button"
            onClick={() => router.push("/planner")}
            className="flex items-center gap-2 bg-mustang-red hover:bg-mustang-red-dark text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            Build Today&apos;s Plan <ArrowRight size={14} />
          </button>
        </div>
      )}

      {/* Plan exists */}
      {!loading && session && (
        <>
          {/* Meta chips */}
          <div className="flex gap-2 flex-wrap">
            {[
              { icon: Zap,         label: `Start: ${formatTime12(parseTime(session.start_time))}` },
              { icon: TrendingUp,  label: `${session.drills.length} drills` },
              { icon: ShieldCheck, label: dateLabel },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-1.5 bg-gray-700/60 border border-gray-600 rounded-full px-3 py-1 text-xs text-gray-300">
                <Icon size={12} className="text-mustang-red" />
                {label}
              </div>
            ))}
          </div>

          {/* Drill list */}
          <ul className="flex flex-col gap-2">
            {session.drills.map((sd, idx) => (
              <li key={sd.instanceId}
                className="flex items-center justify-between bg-gray-700/40 hover:bg-gray-700/70 transition-colors rounded-lg px-4 py-2.5">
                <div className="flex items-center gap-3">
                  <span className="text-gray-600 text-xs font-mono w-4 text-right">
                    {String(idx + 1).padStart(2, "0")}
                  </span>
                  <span className="text-gray-200 text-sm">{sd.drill.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-gray-400 text-xs font-mono">{sd.duration} min</span>
                  <span className={`text-xs font-semibold rounded-full px-2 py-0.5 ${INTENSITY_COLOR[sd.drill.intensity] ?? "text-gray-400 bg-gray-700"}`}>
                    {INTENSITY_LABEL[sd.drill.intensity] ?? "—"}
                  </span>
                </div>
              </li>
            ))}
          </ul>

          <button
            type="button"
            onClick={() => router.push(`/planner?date=${today}`)}
            className="flex items-center justify-center gap-2 text-xs font-mono text-gray-500 hover:text-mustang-red transition-colors border-t border-gray-700 pt-4 -mb-1"
          >
            Edit in Planner <ArrowRight size={12} />
          </button>
        </>
      )}
    </section>
  );
}
