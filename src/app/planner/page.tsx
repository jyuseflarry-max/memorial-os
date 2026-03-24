"use client";

import { useState, useEffect, useCallback, useRef, Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { Droplets, FileText, Zap, CheckCircle2, Loader2, Plus, MoreVertical, Sparkles } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import SessionTimeline from "@/components/planner/SessionTimeline";
import CoachScript from "@/components/planner/CoachScript";
import MissionProfile from "@/components/planner/MissionProfile";
import DrillGroupingModal from "@/components/planner/DrillGroupingModal";
import DrillForm from "@/components/drill-vault/DrillForm";
import AIGeneratorPanel, { GeneratedDrill } from "@/components/planner/AIGeneratorPanel";
import DrillSheet from "@/components/planner/DrillSheet";
import { useDrills } from "@/hooks/useDrills";
import { useTeam } from "@/context/TeamContext";
import { useTeamPlayers } from "@/hooks/useTeamPlayers";
import { useSettings } from "@/context/SettingsContext";
import { QUICK_ACTIONS } from "@/lib/quick-actions";
import { Session, SessionDrill, totalDuration, totalShots } from "@/types/session";
import { DrillGroup } from "@/types/grouping";

const TODAY = new Date().toISOString().split("T")[0];

type SaveStatus = "idle" | "saving" | "saved" | "unsaved";

function PlannerInner() {
  const searchParams = useSearchParams();
  const initialDate  = searchParams.get("date") ?? TODAY;

  const { drills: vaultDrills, addToCache } = useDrills();
  const { activeTeam, teams, setActiveTeam } = useTeam();
  const { players } = useTeamPlayers();
  const { settings } = useSettings();
  const [groupingDrillId, setGroupingDrillId] = useState<string | null>(null);
  const [showNewDrillForm, setShowNewDrillForm] = useState(false);
  const [showDrillSheet, setShowDrillSheet] = useState(false);
  const [showOverflow, setShowOverflow] = useState(false);
  const [showAI, setShowAI] = useState(false);

  const drillSubCategories = useMemo(
    () => Array.from(new Set(vaultDrills.map((d) => d.sub_category).filter(Boolean))).sort(),
    [vaultDrills]
  );

  // If the URL specifies a team_id (e.g. clicking from the calendar), switch to that team
  const urlTeamId = searchParams.get("team_id");
  useEffect(() => {
    if (!urlTeamId || !teams.length) return;
    const target = teams.find((t) => t.id === urlTeamId);
    if (target && activeTeam?.id !== target.id) setActiveTeam(target);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlTeamId, teams]);

  const [session, setSession] = useState<Session>({ date: initialDate, startTime: settings.default_start_time, drills: [] });
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [loadingDate, setLoadingDate] = useState(false);

  // Keep sessionRef always current for auto-save
  const sessionRef = useRef<Session | null>(null);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => { sessionRef.current = session; }, [session]);

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
        setSession({ date, startTime: settings.default_start_time, drills: [] });
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

  // Auto-print when opened with ?autoprint=1 (e.g. from Practice Plans list)
  const autoPrint = searchParams.get("autoprint") === "1";
  useEffect(() => {
    if (!autoPrint || loadingDate) return;
    const t = setTimeout(() => window.print(), 300);
    return () => clearTimeout(t);
  }, [autoPrint, loadingDate]);

  // ── Date change — warn about unsaved changes ──────────────────────────────

  function handleDateChange(newDate: string) {
    if (saveStatus === "unsaved" && session.drills.length > 0) {
      if (!confirm("You have unsaved changes. Switch dates without saving?")) return;
    }
    loadDate(newDate);
  }

  // ── Auto-save ─────────────────────────────────────────────────────────────

  async function autoSave() {
    const s = sessionRef.current;
    if (!s) return;
    setSaveStatus("saving");
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: s.date, start_time: s.startTime, drills: s.drills, team_id: activeTeam?.id ?? null }),
      });
      if (!res.ok) throw new Error("Save failed");
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 3000);
    } catch {
      setSaveStatus("unsaved");
    }
  }

  // ── Session mutations ────────────────────────────────────────────────────

  function mutate(updater: (s: Session) => Session) {
    setSession(updater);
    setSaveStatus("unsaved");
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => { void autoSave(); }, 2000);
  }

  function addQuickAction(qaId: string) {
    const drill = QUICK_ACTIONS.find((d) => d.id === qaId);
    if (!drill) return;
    mutate((s) => ({ ...s, drills: [...s.drills, { instanceId: crypto.randomUUID(), drill, duration: 2 }] }));
  }

  function addDrill(drillId: string) {
    const drill = vaultDrills.find((d) => d.id === drillId);
    if (!drill) return;
    mutate((s) => ({ ...s, drills: [...s.drills, { instanceId: crypto.randomUUID(), drill, duration: drill.default_duration ?? 10 }] }));
  }

  function removeDrill(instanceId: string) {
    mutate((s) => ({ ...s, drills: s.drills.filter((d) => d.instanceId !== instanceId) }));
  }

  function updateDuration(instanceId: string, duration: number) {
    mutate((s) => ({ ...s, drills: s.drills.map((d) => d.instanceId === instanceId ? { ...d, duration } : d) }));
  }

  function updateGroups(instanceId: string, groups: DrillGroup[]) {
    mutate((s) => ({ ...s, drills: s.drills.map((d) => d.instanceId === instanceId ? { ...d, groups } : d) }));
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

  function loadGeneratedPlan(plan: GeneratedDrill[]) {
    const newDrills: SessionDrill[] = plan.flatMap(({ drill_id, duration }) => {
      const drill = vaultDrills.find((d) => d.id === drill_id);
      if (!drill) return [];
      return [{ instanceId: crypto.randomUUID(), drill, duration }];
    });
    mutate((s) => ({ ...s, drills: newDrills }));
  }

  // ── Derived stats ────────────────────────────────────────────────────────

  const totalMin      = totalDuration(session.drills);
  const totalShotsNum = Math.round(totalShots(session.drills));

  return (
    <DashboardLayout>
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-3 mb-4 print:hidden">
        <div className="min-w-0">
          <h1 className="text-white text-2xl font-bold tracking-tight">Planner</h1>

          {/* Date @ Time — minimal inline inputs */}
          <div className="flex items-center gap-1 mt-1 flex-wrap">
            {activeTeam && (
              <span className="text-gray-500 text-xs font-mono mr-1">{activeTeam.name.toUpperCase()} ·</span>
            )}
            <input
              type="date"
              value={session.date}
              onChange={(e) => handleDateChange(e.target.value)}
              className="bg-transparent text-white text-sm font-medium focus:outline-none cursor-pointer"
            />
            <span className="text-gray-500 text-sm">@</span>
            <input
              type="time"
              value={session.startTime}
              onChange={(e) => handleStartTimeChange(e.target.value)}
              className="bg-transparent text-white text-sm font-medium focus:outline-none cursor-pointer"
            />
          </div>

          {/* Stats */}
          <p className="text-gray-400 text-xs font-mono mt-1">
            {session.drills.length > 0
              ? `${session.drills.length} DRILLS · ${totalMin} MIN · ~${totalShotsNum} SHOTS`
              : loadingDate ? "LOADING…" : "BUILD YOUR PRACTICE PLAN"}
          </p>
        </div>

        {/* Right side: save indicator + overflow menu */}
        <div className="flex items-center gap-2 shrink-0 mt-1">
          {/* Auto-save indicator — subtle, no button */}
          {saveStatus === "saving" && (
            <span className="flex items-center gap-1 text-[11px] font-mono text-gray-500">
              <Loader2 size={11} className="animate-spin" /> Saving…
            </span>
          )}
          {saveStatus === "saved" && (
            <span className="flex items-center gap-1 text-[11px] font-mono text-green-500">
              <CheckCircle2 size={11} /> Saved
            </span>
          )}
          {saveStatus === "unsaved" && (
            <span className="text-[11px] font-mono text-gray-600">Unsaved</span>
          )}

          {/* Overflow menu */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowOverflow((o) => !o)}
              className="p-2 rounded-xl bg-gray-800 border border-gray-700 text-gray-400 hover:text-white transition-colors"
            >
              <MoreVertical size={16} />
            </button>
            {showOverflow && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowOverflow(false)} />
                <div className="absolute right-0 top-full mt-1 z-20 bg-gray-800 border border-gray-700 rounded-xl shadow-xl py-1 w-52 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => { window.print(); setShowOverflow(false); }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-gray-700 transition-colors text-left"
                  >
                    <FileText size={14} /> Print / Export PDF
                  </button>
                  {session.drills.length > 0 && (
                    <button
                      type="button"
                      onClick={() => { setShowAI(true); setShowOverflow(false); }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-gray-700 transition-colors text-left"
                    >
                      <Sparkles size={14} /> AI Generate Practice
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Loading ─────────────────────────────────────────────── */}
      {loadingDate && (
        <div className="flex items-center justify-center py-20 print:hidden">
          <Loader2 size={24} className="text-mustang-red animate-spin" />
        </div>
      )}

      {/* ── Main content ────────────────────────────────────────── */}
      {!loadingDate && (
        <div className="flex flex-col gap-4 print:hidden">

          {/* AI panel — only shown when 0 drills OR when toggled from overflow */}
          {(session.drills.length === 0 || showAI) && (
            <div>
              <AIGeneratorPanel
                playerCount={players.length || 10}
                teamName={activeTeam?.name}
                onLoadPlan={(plan) => { loadGeneratedPlan(plan); setShowAI(false); }}
              />
            </div>
          )}

          {/* Timeline */}
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
              startTime={session.startTime}
              onRemove={removeDrill}
              onDurationChange={updateDuration}
              onReorder={reorderDrills}
              onGroupsClick={(id) => setGroupingDrillId(id)}
            />
          </div>

          {/* + Add Drills button */}
          <button
            type="button"
            onClick={() => setShowDrillSheet(true)}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl border-2 border-dashed border-gray-700 hover:border-mustang-red/50 text-gray-500 hover:text-mustang-red text-sm font-semibold transition-colors"
          >
            <Plus size={16} /> Add Drill
          </button>
        </div>
      )}

      {/* ── Coach's Script ───────────────────────────────────────── */}
      {!loadingDate && <CoachScript session={session} players={players} />}

      {/* ── Live Analytics ───────────────────────────────────────── */}
      {!loadingDate && session.drills.length > 0 && (
        <div className="flex flex-col gap-2 mt-6">
          <p className="text-gray-400 text-xs font-mono uppercase tracking-wider px-1">Live Analytics</p>
          <MissionProfile drills={session.drills} />
        </div>
      )}

      {/* ── New Drill Modal ───────────────────────────────────────── */}
      {showNewDrillForm && (
        <DrillForm
          subCategories={drillSubCategories}
          onSave={(drill) => { addToCache(drill); setShowNewDrillForm(false); }}
          onClose={() => setShowNewDrillForm(false)}
        />
      )}

      {/* ── Drill Sheet ───────────────────────────────────────────── */}
      {showDrillSheet && (
        <DrillSheet
          drills={vaultDrills}
          onAdd={addDrill}
          onNewDrill={() => { setShowDrillSheet(false); setShowNewDrillForm(true); }}
          onClose={() => setShowDrillSheet(false)}
        />
      )}

      {/* ── Player Grouping Modal ─────────────────────────────────── */}
      {groupingDrillId && (() => {
        const sd = session.drills.find((d) => d.instanceId === groupingDrillId);
        if (!sd) return null;
        return (
          <DrillGroupingModal
            drillName={sd.drill.name}
            teamId={activeTeam?.id ?? null}
            players={players}
            initialGroups={sd.groups ?? null}
            onApply={(groups) => { updateGroups(groupingDrillId, groups); setGroupingDrillId(null); }}
            onClose={() => setGroupingDrillId(null)}
          />
        );
      })()}
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
