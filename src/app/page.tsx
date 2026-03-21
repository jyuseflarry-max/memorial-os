import DashboardLayout from "@/components/DashboardLayout";
import {
  ClipboardList,
  Activity,
  Zap,
  Clock,
  TrendingUp,
  ShieldCheck,
} from "lucide-react";

// ── Today's Practice card ──────────────────────────────────────────────────

function PracticeCard() {
  const drills = [
    { name: "Warm-Up Shooting", duration: "10 min", intensity: "Low" },
    { name: "3-on-2 Fast Breaks", duration: "20 min", intensity: "High" },
    { name: "Half-Court Sets (Horns)", duration: "25 min", intensity: "Med" },
    { name: "Free Throw Pressure", duration: "10 min", intensity: "Low" },
    { name: "5-on-5 Scrimmage", duration: "30 min", intensity: "High" },
  ];

  const intensityColor: Record<string, string> = {
    Low: "text-green-400 bg-green-400/10",
    Med: "text-yellow-400 bg-yellow-400/10",
    High: "text-red-400 bg-red-400/10",
  };

  return (
    <section className="bg-gray-800 border border-gray-700 rounded-2xl p-6 flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ClipboardList size={20} className="text-mustang-red" />
          <h2 className="text-white font-semibold text-lg">Today&apos;s Practice</h2>
        </div>
        <span className="text-gray-400 text-xs font-mono flex items-center gap-1">
          <Clock size={12} /> 95 min total
        </span>
      </div>

      {/* Meta chips */}
      <div className="flex gap-2 flex-wrap">
        {[
          { icon: Zap, label: "Focus: Transition Offense" },
          { icon: TrendingUp, label: "Phase: Pre-Season" },
          { icon: ShieldCheck, label: "Goal: Execution ≥ 80%" },
        ].map(({ icon: Icon, label }) => (
          <div
            key={label}
            className="flex items-center gap-1.5 bg-gray-700/60 border border-gray-600 rounded-full px-3 py-1 text-xs text-gray-300"
          >
            <Icon size={12} className="text-mustang-red" />
            {label}
          </div>
        ))}
      </div>

      {/* Drill list */}
      <ul className="flex flex-col gap-2">
        {drills.map((drill, idx) => (
          <li
            key={drill.name}
            className="flex items-center justify-between bg-gray-700/40 hover:bg-gray-700/70 transition-colors rounded-lg px-4 py-2.5"
          >
            <div className="flex items-center gap-3">
              <span className="text-gray-600 text-xs font-mono w-4 text-right">
                {String(idx + 1).padStart(2, "0")}
              </span>
              <span className="text-gray-200 text-sm">{drill.name}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-gray-400 text-xs font-mono">
                {drill.duration}
              </span>
              <span
                className={`text-xs font-semibold rounded-full px-2 py-0.5 ${intensityColor[drill.intensity]}`}
              >
                {drill.intensity}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

// ── Team Readiness (Vibe Check) chart placeholder ─────────────────────────

function VibeCheckCard() {
  const players = [
    { name: "J. Wallace", readiness: 92 },
    { name: "D. Okafor", readiness: 78 },
    { name: "M. Torres", readiness: 85 },
    { name: "C. Brown", readiness: 61 },
    { name: "R. Singh", readiness: 95 },
    { name: "T. Park", readiness: 70 },
  ];

  const barColor = (v: number) => {
    if (v >= 85) return "bg-green-500";
    if (v >= 70) return "bg-yellow-400";
    return "bg-red-500";
  };

  const avg = Math.round(
    players.reduce((s, p) => s + p.readiness, 0) / players.length
  );

  return (
    <section className="bg-gray-800 border border-gray-700 rounded-2xl p-6 flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity size={20} className="text-mustang-red" />
          <h2 className="text-white font-semibold text-lg">
            Team Readiness&nbsp;
            <span className="text-gray-400 font-normal text-sm">
              — Vibe Check
            </span>
          </h2>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-white font-mono">{avg}%</p>
          <p className="text-gray-400 text-xs">Squad Avg</p>
        </div>
      </div>

      {/* Bar chart */}
      <ul className="flex flex-col gap-3">
        {players.map((p) => (
          <li key={p.name} className="flex items-center gap-3">
            <span className="text-gray-400 text-xs w-20 shrink-0 font-mono">
              {p.name}
            </span>
            <div className="flex-1 bg-gray-700 rounded-full h-2 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${barColor(p.readiness)}`}
                style={{ width: `${p.readiness}%` }}
              />
            </div>
            <span className="text-gray-300 text-xs w-8 text-right font-mono">
              {p.readiness}
            </span>
          </li>
        ))}
      </ul>

      <p className="text-gray-600 text-xs text-center font-mono border-t border-gray-700 pt-4">
        PLACEHOLDER — live readiness data will stream from player check-in API
      </p>
    </section>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────

export default function CommandCenterPage() {
  return (
    <DashboardLayout>
      {/* Top bar */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-white text-2xl font-bold tracking-tight">
            Command Center
          </h1>
          <p className="text-gray-400 text-sm mt-0.5 font-mono">
            FRI · MAR 20, 2026 · PRE-SEASON BLOCK 3
          </p>
        </div>
        <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/30 rounded-full px-4 py-1.5">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-green-400 text-xs font-mono font-semibold">
            SYSTEMS GO
          </span>
        </div>
      </div>

      {/* Two-column grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <PracticeCard />
        <VibeCheckCard />
      </div>
    </DashboardLayout>
  );
}
