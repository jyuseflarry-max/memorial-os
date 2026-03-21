"use client";

import { useState } from "react";
import { CalendarDays, Clock, Droplets, FileText, Zap } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import DrillPicker from "@/components/planner/DrillPicker";
import SessionTimeline from "@/components/planner/SessionTimeline";
import MissionProfile from "@/components/planner/MissionProfile";
import CoachScript from "@/components/planner/CoachScript";
import { MOCK_DRILLS } from "@/lib/mock-drills";
import { QUICK_ACTIONS } from "@/lib/quick-actions";
import { Session, SessionDrill, totalDuration, totalShots } from "@/types/session";

const TODAY = new Date().toISOString().split("T")[0];

export default function PlannerPage() {
  const [session, setSession] = useState<Session>({
    date: TODAY,
    startTime: "15:00",
    drills: [],
  });

  // ── Session mutations ────────────────────────────────────────────────────

  function addQuickAction(qaId: string) {
    const drill = QUICK_ACTIONS.find((d) => d.id === qaId);
    if (!drill) return;
    const item: SessionDrill = { instanceId: crypto.randomUUID(), drill, duration: 2 };
    setSession((s) => ({ ...s, drills: [...s.drills, item] }));
  }

  function addDrill(drillId: string) {
    const drill = MOCK_DRILLS.find((d) => d.id === drillId);
    if (!drill) return;
    const item: SessionDrill = {
      instanceId: crypto.randomUUID(),
      drill,
      duration: 10,
    };
    setSession((s) => ({ ...s, drills: [...s.drills, item] }));
  }

  function removeDrill(instanceId: string) {
    setSession((s) => ({
      ...s,
      drills: s.drills.filter((d) => d.instanceId !== instanceId),
    }));
  }

  function updateDuration(instanceId: string, duration: number) {
    setSession((s) => ({
      ...s,
      drills: s.drills.map((d) =>
        d.instanceId === instanceId ? { ...d, duration } : d
      ),
    }));
  }

  function reorderDrills(from: number, to: number) {
    setSession((s) => {
      const drills = [...s.drills];
      const [item] = drills.splice(from, 1);
      drills.splice(to, 0, item);
      return { ...s, drills };
    });
  }

  // ── Derived stats ────────────────────────────────────────────────────────

  const totalMin = totalDuration(session.drills);
  const totalShotsNum = Math.round(totalShots(session.drills));

  return (
    <DashboardLayout>
      {/* ── Page header ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 print:hidden">
        <div>
          <h1 className="text-white text-2xl font-bold tracking-tight">Session Planner</h1>
          <p className="text-gray-400 text-sm mt-0.5 font-mono">
            {session.drills.length > 0
              ? `${session.drills.length} DRILLS · ${totalMin} MIN · ~${totalShotsNum} SHOTS`
              : "BUILD YOUR PRACTICE PLAN"}
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Date */}
          <div className="flex items-center gap-2 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2">
            <CalendarDays size={15} className="text-mustang-red shrink-0" />
            <input
              type="date"
              value={session.date}
              onChange={(e) => setSession((s) => ({ ...s, date: e.target.value }))}
              className="bg-transparent text-white text-sm focus:outline-none font-mono"
            />
          </div>
          {/* Start Time */}
          <div className="flex items-center gap-2 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2">
            <Clock size={15} className="text-mustang-red shrink-0" />
            <input
              type="time"
              value={session.startTime}
              onChange={(e) => setSession((s) => ({ ...s, startTime: e.target.value }))}
              className="bg-transparent text-white text-sm focus:outline-none font-mono"
            />
          </div>
          {/* Generate Script */}
          {session.drills.length > 0 && (
            <button
              type="button"
              onClick={() => window.print()}
              className="flex items-center gap-2 bg-mustang-red hover:bg-mustang-red-dark transition-colors text-white text-sm font-semibold px-4 py-2.5 rounded-xl"
            >
              <FileText size={15} />
              Generate Script
            </button>
          )}
        </div>
      </div>

      {/* ── Main 3-column grid ───────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr_280px] gap-4 print:hidden" style={{ minHeight: "420px" }}>
        {/* Left — Drill Picker */}
        <DrillPicker onAdd={addDrill} />

        {/* Center — Timeline */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between px-1">
            <p className="text-gray-400 text-xs font-mono uppercase tracking-wider">
              Practice Timeline
            </p>
            {/* Quick Actions */}
            <div className="flex items-center gap-1.5">
              <span className="text-gray-600 text-[10px] font-mono hidden sm:inline">QUICK ADD</span>
              <button
                type="button"
                onClick={() => addQuickAction("qa-water-break")}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-950/60 border border-sky-800/60 text-sky-400 text-xs font-medium hover:bg-sky-900/60 transition-colors"
              >
                <Droplets size={12} />
                Water Break
              </button>
              <button
                type="button"
                onClick={() => addQuickAction("qa-transition")}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-950/60 border border-sky-800/60 text-sky-400 text-xs font-medium hover:bg-sky-900/60 transition-colors"
              >
                <Zap size={12} />
                Transition
              </button>
            </div>
          </div>
          <SessionTimeline
            drills={session.drills}
            onRemove={removeDrill}
            onDurationChange={updateDuration}
            onReorder={reorderDrills}
            onDropDrill={addDrill}
          />
        </div>

        {/* Right — Mission Profile */}
        <div className="flex flex-col gap-2">
          <p className="text-gray-400 text-xs font-mono uppercase tracking-wider px-1">
            Live Analytics
          </p>
          <MissionProfile drills={session.drills} />
        </div>
      </div>

      {/* ── Coach's Script ───────────────────────────────────────── */}
      <CoachScript session={session} />
    </DashboardLayout>
  );
}
