"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Droplets, FileText, Zap, CheckCircle2, Loader2, Plus, MoreVertical, Sparkles, BookmarkPlus,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import SessionTimeline from "@/components/planner/SessionTimeline";
import DrillGroupingModal from "@/components/planner/DrillGroupingModal";
import DrillForm from "@/components/drill-vault/DrillForm";
import AIGeneratorPanel, { GeneratedDrill } from "@/components/planner/AIGeneratorPanel";
import DrillSheet from "@/components/planner/DrillSheet";
import SaveToPlannerModal from "@/components/planner/SaveToPlannerModal";
import { useDrills } from "@/hooks/useDrills";
import { useTeam } from "@/context/TeamContext";
import { useTeamPlayers } from "@/hooks/useTeamPlayers";
import { useSettings } from "@/context/SettingsContext";
import { QUICK_ACTIONS, SYSTEM_DRILL_IDS } from "@/lib/quick-actions";
import { Session, SessionDrill, SessionSummary, totalDuration, totalShots, formatHHMM } from "@/types/session";
import { DrillGroup } from "@/types/grouping";

const TODAY = new Date().toISOString().split("T")[0];

type SaveStatus = "idle" | "saving" | "saved" | "unsaved";

export interface PlanEditorProps {
  mode: "new" | "edit";
}

export default function PlanEditor({ mode }: PlanEditorProps) {
  const searchParams = useSearchParams();
  const router       = useRouter();

  const initialDate  = mode === "edit" ? (searchParams.get("date") ?? TODAY) : TODAY;
  const activeLabel  = mode === "edit" ? (searchParams.get("label") ?? "") : "";

  const { drills: vaultDrills, addToCache } = useDrills();
  const { activeTeam, teams, setActiveTeam } = useTeam();
  const { players } = useTeamPlayers();
  const { settings } = useSettings();

  const [groupingDrillId,  setGroupingDrillId]  = useState<string | null>(null);
  const [showNewDrillForm, setShowNewDrillForm] = useState(false);
  const [showDrillSheet,   setShowDrillSheet]   = useState(false);
  const [showOverflow,     setShowOverflow]     = useState(false);
  const [showAI,           setShowAI]           = useState(false);
  const [showSaveModal,    setShowSaveModal]    = useState(false);
  const [daySessions,      setDaySessions]      = useState<SessionSummary[]>([]);

  const drillSubCategories = useMemo(
    () => Array.from(new Set(vaultDrills.map((d) => d.sub_category).filter(Boolean))).sort(),
    [vaultDrills],
  );

  const urlTeamId = searchParams.get("team_id");
  useEffect(() => {
    if (!urlTeamId || !teams.length) return;
    const target = teams.find((t) => t.id === urlTeamId);
    if (target && activeTeam?.id !== target.id) setActiveTeam(target);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlTeamId, teams]);

  const [session, setSession] = useState<Session>({
    date: initialDate,
    startTime: settings.default_start_time,
    drills: [],
  });
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [loadingDate, setLoadingDate] = useState(false);

  const sessionRef = useRef<Session | null>(null);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => { sessionRef.current = session; }, [session]);

  // ── DB load (edit mode only) ───────────────────────────────────────────────

  async function loadDate(date: string, label = activeLabel) {
    setLoadingDate(true);
    try {
      const qp = new URLSearchParams({ label });
      if (activeTeam) qp.set("team_id", activeTeam.id);
      const res  = await fetch(`/api/sessions/${date}?${qp}`);
      const data = await res.json();
      if (data && !data.error && data.drills) {
        setSession({ date, startTime: data.start_time, drills: data.drills });
        setSaveStatus("saved");
      } else {
        setSession({ date, startTime: settings.default_start_time, drills: [] });
        setSaveStatus("idle");
      }

      // Load session list for the day switcher
      const listQp = activeTeam ? `?team_id=${activeTeam.id}` : "";
      fetch(`/api/sessions/${date}/list${listQp}`)
        .then((r) => r.json())
        .then((d) => { if (Array.isArray(d)) setDaySessions(d); })
        .catch(() => {});
    } catch {
      setSession({ date, startTime: "15:00", drills: [] });
      setSaveStatus("idle");
    } finally {
      setLoadingDate(false);
    }
  }

  useEffect(() => {
    if (mode === "edit") loadDate(session.date, activeLabel);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTeam, activeLabel]);

  // Auto-print when ?autoprint=1 (edit mode only)
  const autoPrint = mode === "edit" && searchParams.get("autoprint") === "1";
  useEffect(() => {
    if (!autoPrint || loadingDate) return;
    const t = setTimeout(() => window.print(), 300);
    return () => clearTimeout(t);
  }, [autoPrint, loadingDate]);

  // ── Auto-save ──────────────────────────────────────────────────────────────

  async function autoSave() {
    const s = sessionRef.current;
    if (!s) return;
    setSaveStatus("saving");
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date:       s.date,
          start_time: s.startTime,
          drills:     s.drills,
          team_id:    activeTeam?.id ?? null,
          label:      activeLabel,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        console.error("Auto-save failed:", body.error ?? res.status);
        throw new Error("Save failed");
      }
      setSaveStatus("saved");
    } catch (err) {
      console.error("Auto-save error:", err);
      setSaveStatus("unsaved");
    }
  }

  // ── Session mutations ──────────────────────────────────────────────────────

  function mutate(updater: (s: Session) => Session) {
    setSession(updater);
    if (mode === "edit") {
      setSaveStatus("unsaved");
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
      autoSaveTimer.current = setTimeout(() => { void autoSave(); }, 2000);
    }
  }

  function addQuickAction(qaId: string) {
    const drill = QUICK_ACTIONS.find((d) => d.id === qaId);
    if (!drill) return;
    mutate((s) => ({ ...s, drills: [...s.drills, { instanceId: crypto.randomUUID(), drill, duration: 2 }] }));
  }

  function addDrill(drillId: string) {
    const drill = vaultDrills.find((d) => d.id === drillId);
    if (!drill) return;
    mutate((s) => ({
      ...s,
      drills: [...s.drills, { instanceId: crypto.randomUUID(), drill, duration: drill.default_duration ?? 10 }],
    }));
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

  function handleDateChange(newDate: string) {
    if (mode === "edit") {
      if (saveStatus === "unsaved" && session.drills.length > 0) {
        if (!confirm("You have unsaved changes. Switch dates without saving?")) return;
      }
      loadDate(newDate);
    } else {
      mutate((s) => ({ ...s, date: newDate }));
    }
  }

  function loadGeneratedPlan(plan: GeneratedDrill[]) {
    const newDrills: SessionDrill[] = plan.flatMap(({ drill_id, duration }) => {
      const drill = vaultDrills.find((d) => d.id === drill_id);
      if (!drill) return [];
      return [{ instanceId: crypto.randomUUID(), drill, duration }];
    });
    mutate((s) => ({ ...s, drills: newDrills }));
  }

  // ── Derived ───────────────────────────────────────────────────────────────

  const totalMin      = totalDuration(session.drills);
  const totalShotsNum = Math.round(totalShots(session.drills));
  const title         = mode === "edit" ? "Planner" : "Build a Plan";
  const emptyHint     = mode === "edit" ? "BUILD YOUR PRACTICE PLAN" : "DESCRIBE YOUR PRACTICE OR ADD DRILLS BELOW";

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4 print:hidden">
        <div className="min-w-0">
          <h1 className="text-white text-2xl font-bold tracking-tight">{title}</h1>

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
            <label className="relative inline-flex items-center cursor-pointer">
              <span className="text-white text-sm font-medium pointer-events-none">
                {formatHHMM(session.startTime)}
              </span>
              <input
                type="time"
                value={session.startTime}
                onChange={(e) => handleStartTimeChange(e.target.value)}
                className="absolute inset-0 opacity-0 cursor-pointer w-full"
              />
            </label>
          </div>

          {/* Multi-session switcher — edit mode only */}
          {mode === "edit" && daySessions.length > 1 && (
            <div className="flex items-center gap-1 mt-1.5 flex-wrap">
              {daySessions.map((ds) => (
                <button
                  key={ds.id}
                  type="button"
                  onClick={() => {
                    const tp = activeTeam ? `&team_id=${activeTeam.id}` : "";
                    const lp = ds.label ? `&label=${encodeURIComponent(ds.label)}` : "";
                    router.push(`/planner?date=${session.date}${tp}${lp}`);
                  }}
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono border transition-colors ${
                    ds.label === activeLabel
                      ? "bg-mustang-red/20 border-mustang-red/40 text-mustang-red"
                      : "bg-gray-700/50 border-gray-600 text-gray-400 hover:text-white"
                  }`}
                >
                  {ds.label || "MAIN"}
                </button>
              ))}
            </div>
          )}

          <p className="text-gray-400 text-xs font-mono mt-1">
            {session.drills.length > 0
              ? `${session.drills.length} DRILLS · ${totalMin} MIN · ~${totalShotsNum} SHOTS`
              : mode === "edit" && loadingDate ? "LOADING…" : emptyHint}
          </p>
        </div>

        {/* Save indicator + overflow menu */}
        <div className="flex items-center gap-2 shrink-0 mt-1">
          {mode === "new" && session.drills.length > 0 && (
            <button
              type="button"
              onClick={() => setShowSaveModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-mustang-red hover:bg-mustang-red-dark text-white text-xs font-semibold transition-colors"
            >
              <BookmarkPlus size={13} /> Save to Planner
            </button>
          )}
          {mode === "edit" && saveStatus === "saving" && (
            <span className="flex items-center gap-1 text-[11px] font-mono text-gray-500">
              <Loader2 size={11} className="animate-spin" /> Saving…
            </span>
          )}
          {mode === "edit" && saveStatus === "saved" && (
            <span className="flex items-center gap-1 text-[11px] font-mono text-green-500">
              <CheckCircle2 size={11} /> Saved
            </span>
          )}
          {mode === "edit" && saveStatus === "unsaved" && (
            <span className="text-[11px] font-mono text-gray-600">Unsaved</span>
          )}

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
                  {mode === "new" && session.drills.length > 0 && (
                    <button
                      type="button"
                      onClick={() => { setShowSaveModal(true); setShowOverflow(false); }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-gray-700 transition-colors text-left"
                    >
                      <BookmarkPlus size={14} /> Save to Planner
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      if (mode === "edit") {
                        const tp = activeTeam ? `&team_id=${activeTeam.id}` : "";
                        window.open(`/view-plans/${session.date}?autoprint=1${tp}`, "_blank");
                      } else {
                        window.print();
                      }
                      setShowOverflow(false);
                    }}
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

      {/* Loading spinner — edit mode only */}
      {mode === "edit" && loadingDate && (
        <div className="flex items-center justify-center py-20 print:hidden">
          <Loader2 size={24} className="text-mustang-red animate-spin" />
        </div>
      )}

      {/* Main content */}
      {(mode === "new" || !loadingDate) && (
        <div className="flex flex-col gap-4 print:hidden">

          {(session.drills.length === 0 || showAI) && (
            <AIGeneratorPanel
              playerCount={players.length || 10}
              teamName={activeTeam?.name}
              onLoadPlan={(plan) => { loadGeneratedPlan(plan); setShowAI(false); }}
            />
          )}

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between px-1">
              <p className="text-gray-400 text-xs font-mono uppercase tracking-wider">Practice Timeline</p>
              <div className="flex items-center gap-1.5">
                <span className="text-gray-600 text-[10px] font-mono hidden sm:inline">QUICK ADD</span>
                <button type="button" onClick={() => addQuickAction(SYSTEM_DRILL_IDS.WATER_BREAK)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-950/60 border border-sky-800/60 text-sky-400 text-xs font-medium hover:bg-sky-900/60 transition-colors">
                  <Droplets size={12} /> Water Break
                </button>
                <button type="button" onClick={() => addQuickAction(SYSTEM_DRILL_IDS.TRANSITION)}
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

          <button
            type="button"
            onClick={() => setShowDrillSheet(true)}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl border-2 border-dashed border-gray-700 hover:border-mustang-red/50 text-gray-500 hover:text-mustang-red text-sm font-semibold transition-colors"
          >
            <Plus size={16} /> Add Drill
          </button>
        </div>
      )}

      {showNewDrillForm && (
        <DrillForm
          subCategories={drillSubCategories}
          onSave={(drill) => { addToCache(drill); setShowNewDrillForm(false); }}
          onClose={() => setShowNewDrillForm(false)}
        />
      )}

      {showDrillSheet && (
        <DrillSheet
          drills={vaultDrills}
          onAdd={addDrill}
          onNewDrill={() => { setShowDrillSheet(false); setShowNewDrillForm(true); }}
          onClose={() => setShowDrillSheet(false)}
        />
      )}

      {showSaveModal && (
        <SaveToPlannerModal
          session={session}
          teamId={activeTeam?.id ?? null}
          onClose={() => setShowSaveModal(false)}
        />
      )}

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
