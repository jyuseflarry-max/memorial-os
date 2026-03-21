import DashboardLayout from "@/components/DashboardLayout";
import TeamReadinessCard from "@/components/TeamReadinessCard";
import TodayPracticeCard from "@/components/TodayPracticeCard";

// ── Page ──────────────────────────────────────────────────────────────────

export default function CommandCenterPage() {
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric", year: "numeric",
  }).toUpperCase();

  return (
    <DashboardLayout>
      {/* Top bar */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-white text-2xl font-bold tracking-tight">Command Center</h1>
          <p className="text-gray-400 text-sm mt-0.5 font-mono">{today}</p>
        </div>
        <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/30 rounded-full px-4 py-1.5">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-green-400 text-xs font-mono font-semibold">SYSTEMS GO</span>
        </div>
      </div>

      {/* Two-column grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <TodayPracticeCard />
        <TeamReadinessCard />
      </div>
    </DashboardLayout>
  );
}
