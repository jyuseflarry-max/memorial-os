"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { CalendarDays, Clock, Droplets, FileText, Save, Zap, CheckCircle2, Loader2 } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import DrillPicker from "@/components/planner/DrillPicker";
import SessionTimeline from "@/components/planner/SessionTimeline";
import MissionProfile from "@/components/planner/MissionProfile";
import CoachScript from "@/components/planner/CoachScript";
import { useDrills } from "@/hooks/useDrills";
import { useTeam } from "@/context/TeamContext";
import { QUICK_ACTIONS } from "@/lib/quick-actions";
import { Session, SessionDrill, totalDuration, totalShots } from "@/types/session";

const TODAY = new Date().toISOString().split("T")[0];

type SaveStatus = "idle" | "saving" | "saved" | "unsaved";

function PlannerInner() {
  const searchParams = useSearchParams();
  const initialDate  = searchParams.get("date") ?? TODAY;

  const { drills: vaultDrills } = useDrills();
  const { activeTeam } = useTeam();
  const [session, setSession] = useState<Session>({ date: initialDate, startTime: "15:00", drills: [] });
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [loadingDate, setLoadingDate] = useState(false);

  // ── Load session for a given date ────────────────────────────────────────

  const loadDate = useCallback(async (date: string) => { // eslint-disable-line react-hooks/exhaustive-deps
    setLoadingDate(true);
    try {
      const teamParam = activeTeam ? `?team_id=${activeTeam.id}` : "";
      const res = await fetch(`/api/sessions/${date}${teamParam}`);
      const data = await res.json();
      if (data && !data.error && data.drills) {
        setSession({ date, startTime: data.start_time, drills: data.drills });
        setSaveStatus("saved");
      } else {
        setSession({ date, startTime: "15:00", drills: [] });
        setSaveStatus("idle");
      }
    } catch {
      setSession({ date, startTime: "15:00", drills: [] });
      setSaveStatus("idle");
    } finally {
      setLoadingDate(false);
    }
  }, []);

  // Reload when the date OR active team changes
  useEffect(() => { loadDate(session.date); }, [activeTeam]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Date change — warn about unsaved changes ──────────────────────────────

  function handleDateChange(newDate: string) {
    if (saveStatus === "unsaved" && session.drills.length > 0) {
      if (!confirm("You have unsaved changes. Switch dates without saving?")) return;
    }
    loadDate(newDate);
  }

  // ── Session mutations ────────────────────────────────────────────────────

  function mutate(updater: (s: Session) => Session) {
    setSession(updater);
    setSaveStatus("unsaved");
  }

  function addQuickAction(qaId: string) {
    const drill = QUICK_ACTIONS.find((d) => d.id === qaId);
    if (!drill) return;
    mutate((s) => ({ ...s, drills: [...s.drills, { instanceId: crypto.randomUUID(), drill, duration: 2 }] }));
  }

  function addDrill(drillId: string) {
    const drill = vaultDrills.find((d) => d.id === drillId);
    if (!drill) return;
    mutate((s) => ({ ...s, drills: [...s.drills, { instanceId: crypto.randomUUID(), drill, duration: 10 }] }));
  }

  function removeDrill(instanceId: string) {
    mutate((s) => ({ ...s, drills: s.drills.filter((d) => d.instanceId !== instanceId) }));
  }

  function updateDuration(instanceId: string, duration: number) {
    mutate((s) => ({ ...s, drills: s.drills.map((d) => d.instanceId === instanceId ? { ...d, duration } : d) }));
  }

  function reorderDrills(from: number, to: number) {
    mutate((s) => {
      const drills = [...s.drills];
      const [item] = drills.splice(from, 1);
      drills.splice(to, 0, item);
      return { ...s, drills };
    });
  }

  function handleStartTimeChange(startTime: string) {
    mutate((s) => ({ ...s, startTime }));
  }

  // ── Save ─────────────────────────────────────────────────────────────────

  async function saveSession() {
    setSaveStatus("saving");
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: session.date, start_time: session.startTime, drills: session.drills, team_id: activeTeam?.id ?? null }),
      });
      if (!res.ok) throw new Error("Save failed");
      setSaveStatus("saved");
    } catch {
      setSaveStatus("unsaved");
    }
  }

  // ── Derived stats ────────────────────────────────────────────────────────

  const totalMin      = totalDuration(session.drills);
  const totalShotsNum = Math.round(totalShots(session.drills));

  // ── Save button label ────────────────────────────────────────────────────

  const saveBtn = {
    idle:    { icon: Save,         label: "Save Plan",  cls: "bg-gray-700 hover:bg-gray-600 border border-gray-600 text-gray-300 hover:text-white" },
    unsaved: { icon: Save,         label: "Save Plan",  cls: "bg-mustang-red hover:bg-mustang-red-dark text-white" },
    saving:  { icon: Loader2,      label: "Saving…",    cls: "bg-gray-700 border border-gray-600 text-gray-400 cursor-not-allowed opacity-60" },
    saved:   { icon: CheckCircle2, label: "Saved",      cls: "bg-green-600/20 border border-green-600/40 text-green-400 cursor-default" },
  }[saveStatus];

  const SaveIcon = saveBtn.icon;

  return (
    <DashboardLayout>
      {/* ── Page header ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 print:hidden">
        <div>
          <h1 className="text-white text-2xl font-bold tracking-tight">Session Planner</h1>
          <p className="text-gray-400 text-sm mt-0.5 font-mono">
            {activeTeam ? `${activeTeam.name.toUpperCase()} · ` : ""}
            {session.drills.length > 0
              ? `${session.drills.length} DRILLS · ${totalMin} MIN · ~${totalShotsNum} SHOTS`
              : loadingDate ? "LOADING…" : "BUILD YOUR PRACTICE PLAN"}
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Date */}
          <div className="flex items-center gap-2 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2">
            <CalendarDays size={15} className="text-mustang-red shrink-0" />
            <input
              type="date"
              value={session.date}
              onChange={(e) => handleDateChange(e.target.value)}
              className="bg-transparent text-white text-sm focus:outline-none font-mono"
            />
          </div>
          {/* Start time */}
          <div className="flex items-center gap-2 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2">
            <Clock size={15} className="text-mustang-red shrink-0" />
            <input
              type="time"
              value={session.startTime}
              onChange={(e) => handleStartTimeChange(e.target.value)}
              className="bg-transparent text-white text-sm focus:outline-none font-mono"
            />
          </div>
          {/* Save */}
          <button
            type="button"
            onClick={saveStatus === "saving" || saveStatus === "saved" ? undefined : saveSession}
            className={`flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors ${saveBtn.cls}`}
          >
            <SaveIcon size={15} className={saveStatus === "saving" ? "animate-spin" : ""} />
            {saveBtn.label}
          </button>
          {/* Generate Script */}
          {session.drills.length > 0 && (
            <button
              type="button"
              onClick={() => window.print()}
              className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 border border-gray-600 transition-colors text-gray-300 hover:text-white text-sm font-medium px-4 py-2.5 rounded-xl"
            >
              <FileText size={15} />
              Generate Script
            </button>
          )}
        </div>
      </div>

      {/* ── Loading overlay ──────────────────────────────────────── */}
      {loadingDate && (
        <div className="flex items-center justify-center py-20 print:hidden">
          <Loader2 size={24} className="text-mustang-red animate-spin" />
        </div>
      )}

      {/* ── Main 3-column grid ───────────────────────────────────── */}
      {!loadingDate && (
        <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr_280px] gap-4 print:hidden" style={{ minHeight: "420px" }}>
          {/* Left — Drill Picker */}
          <DrillPicker drills={vaultDrills} onAdd={addDrill} />

          {/* Center — Timeline */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between px-1">
              <p className="text-gray-400 text-xs font-mono uppercase tracking-wider">Practice Timeline</p>
              <div className="flex items-center gap-1.5">
                <span className="text-gray-600 text-[10px] font-mono hidden sm:inline">QUICK ADD</span>
                <button type="button" onClick={() => addQuickAction("qa-water-break")}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-950/60 border border-sky-800/60 text-sky-400 text-xs font-medium hover:bg-sky-900/60 transition-colors">
                  <Droplets size={12} /> Water Break
                </button>
                <button type="button" onClick={() => addQuickAction("qa-transition")}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-950/60 border border-sky-800/60 text-sky-400 text-xs font-medium hover:bg-sky-900/60 transition-colors">
                  <Zap size={12} /> Transition
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
            <p className="text-gray-400 text-xs font-mono uppercase tracking-wider px-1">Live Analytics</p>
            <MissionProfile drills={session.drills} />
          </div>
        </div>
      )}

      {/* ── Coach's Script ───────────────────────────────────────── */}
      {!loadingDate && <CoachScript session={session} />}
    </DashboardLayout>
  );
}

export default function PlannerPage() {
  return (
    <Suspense fallback={null}>
      <PlannerInner />
    </Suspense>
  );
}
