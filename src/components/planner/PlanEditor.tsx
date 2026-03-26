"use client";

import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Droplets, FileText, Zap, CheckCircle2, Loader2, Plus, MoreVertical, BookmarkPlus,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import SessionTimeline from "@/components/planner/SessionTimeline";
import DrillGroupingModal from "@/components/planner/DrillGroupingModal";
import DrillForm from "@/components/drill-vault/DrillForm";
import DrillSheet from "@/components/planner/DrillSheet";
import SaveToPlannerModal from "@/components/planner/SaveToPlannerModal";
import { useDrills } from "@/hooks/useDrills";
import { useTeam } from "@/context/TeamContext";
import { useTeamPlayers } from "@/hooks/useTeamPlayers";
import { useSettings } from "@/context/SettingsContext";
import { useSessionEditor } from "@/hooks/useSessionEditor";
import { SYSTEM_DRILL_IDS } from "@/lib/quick-actions";
import { totalDuration, totalShots, formatHHMM, GeneratedDrill, SessionDrill } from "@/types/session";

const TODAY = new Date().toISOString().split("T")[0];

export interface PlanEditorProps {
  mode: "new" | "edit";
}

export default function PlanEditor({ mode }: PlanEditorProps) {
  const searchParams = useSearchParams();
  const router       = useRouter();

  const initialDate = mode === "edit" ? (searchParams.get("date") ?? TODAY) : TODAY;
  const activeLabel = mode === "edit" ? (searchParams.get("label") ?? "") : "";

  const { drills: vaultDrills, addToCache } = useDrills();
  const { activeTeam, teams, setActiveTeam } = useTeam();
  const { players }  = useTeamPlayers();
  const { settings } = useSettings();

  // Sync URL team_id param → active team
  const urlTeamId = searchParams.get("team_id");
  useEffect(() => {
    if (!urlTeamId || !teams.length) return;
    const target = teams.find((t) => t.id === urlTeamId);
    if (target && activeTeam?.id !== target.id) setActiveTeam(target);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlTeamId, teams]);

  // All session data and mutation logic lives in the hook
  const {
    session,
    saveStatus,
    loadingDate,
    daySessions,
    addQuickAction,
    addDrill,
    removeDrill,
    updateDuration,
    updateGroups,
    reorderDrills,
    handleStartTimeChange,
    handleDateChange,
    loadGeneratedPlan,
  } = useSessionEditor({
    mode,
    initialDate,
    activeLabel,
    teamId:           activeTeam?.id ?? null,
    defaultStartTime: settings.default_start_time,
  });

  function resolveAndLoadPlan(plan: GeneratedDrill[]) {
    const drills: SessionDrill[] = plan.flatMap(({ drill_id, duration }) => {
      const drill = vaultDrills.find((d) => d.id === drill_id);
      if (!drill) return [];
      return [{ instanceId: crypto.randomUUID(), drill, duration }];
    });
    loadGeneratedPlan(drills);
  }

  // UI-only state — which modals / panels are open
  const [groupingDrillId,  setGroupingDrillId]  = useState<string | null>(null);
  const [showNewDrillForm, setShowNewDrillForm] = useState(false);
  const [showDrillSheet,   setShowDrillSheet]   = useState(false);
  const [showOverflow,     setShowOverflow]     = useState(false);
  const [showSaveModal,    setShowSaveModal]    = useState(false);


  const totalMin      = totalDuration(session.drills);
  const totalShotsNum = Math.round(totalShots(session.drills));
  const title         = mode === "edit" ? "Planner" : "Build a Plan";
  const emptyHint     = mode === "edit" ? "BUILD YOUR PRACTICE PLAN" : "DESCRIBE YOUR PRACTICE OR ADD DRILLS BELOW";

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
              onChange={(e) => {
                const newDate = e.target.value;
                if (mode === "edit" && saveStatus === "unsaved" && session.drills.length > 0) {
                  if (!confirm("You have unsaved changes. Switch dates without saving?")) return;
                }
                handleDateChange(newDate);
              }}
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

          {/* Multi-session switcher — edit mode, days with more than one session */}
          {mode === "edit" && daySessions.length > 1 && (
            <div className="flex items-center gap-1 mt-1.5 flex-wrap">
              {daySessions.map((ds) => (
                <button
                  key={ds.id}
                  type="button"
                  onClick={() => {
                    const qp = new URLSearchParams({ date: session.date });
                    if (activeTeam) qp.set("team_id", activeTeam.id);
                    if (ds.label)   qp.set("label", ds.label);
                    router.push(`/planner?${qp}`);
                  }}
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono border transition-colors ${
                    ds.label === activeLabel
                      ? "bg-coaches-red/20 border-coaches-red/40 text-coaches-red"
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
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-coaches-red hover:bg-coaches-red-dark text-white text-xs font-semibold transition-colors"
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
                        const qp = new URLSearchParams({ autoprint: "1" });
                        if (activeTeam) qp.set("team_id", activeTeam.id);
                        window.open(`/view-plans/${session.date}?${qp}`, "_blank");
                      } else {
                        window.print();
                      }
                      setShowOverflow(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-gray-700 transition-colors text-left"
                  >
                    <FileText size={14} /> Print / Export PDF
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Loading spinner — edit mode only */}
      {mode === "edit" && loadingDate && (
        <div className="flex items-center justify-center py-20 print:hidden">
          <Loader2 size={24} className="text-coaches-red animate-spin" />
        </div>
      )}

      {/* Main content */}
      {(mode === "new" || !loadingDate) && (
        <div className="flex flex-col gap-4 print:hidden">

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
            className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl border-2 border-dashed border-gray-700 hover:border-coaches-red/50 text-gray-500 hover:text-coaches-red text-sm font-semibold transition-colors"
          >
            <Plus size={16} /> Add Drill
          </button>
        </div>
      )}

      {showNewDrillForm && (
        <DrillForm
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
