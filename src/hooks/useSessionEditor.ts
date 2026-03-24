"use client";

import { useState, useEffect, useRef } from "react";
import { QUICK_ACTIONS } from "@/lib/quick-actions";
import { Session, SessionDrill, SessionSummary } from "@/types/session";
import { DrillGroup } from "@/types/grouping";
import { Drill } from "@/types/drill";
import { GeneratedDrill } from "@/components/planner/AIGeneratorPanel";

export type SaveStatus = "idle" | "saving" | "saved" | "unsaved";

interface Params {
  mode:               "new" | "edit";
  initialDate:        string;
  activeLabel:        string;
  teamId:             string | null;
  defaultStartTime:   string;
  vaultDrills:        Drill[];
}

/**
 * Owns all session data concerns for the planner:
 *   - loading a session from the DB (edit mode)
 *   - fetching the day's session list (for the multi-session switcher)
 *   - debounced auto-save (edit mode only)
 *   - every mutation handler (add, remove, reorder, duration, groups, etc.)
 *
 * PlanEditor is left with UI state only (which modals are open).
 */
export function useSessionEditor({
  mode,
  initialDate,
  activeLabel,
  teamId,
  defaultStartTime,
  vaultDrills,
}: Params) {
  const [session,     setSession]     = useState<Session>({ date: initialDate, startTime: defaultStartTime, drills: [] });
  const [saveStatus,  setSaveStatus]  = useState<SaveStatus>("idle");
  const [loadingDate, setLoadingDate] = useState(false);
  const [daySessions, setDaySessions] = useState<SessionSummary[]>([]);

  // Refs keep autoSave free of stale closures — it runs inside a setTimeout
  // so the values it reads must be current at fire time, not capture time.
  const sessionRef    = useRef<Session | null>(null);
  const teamIdRef     = useRef(teamId);
  const labelRef      = useRef(activeLabel);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { sessionRef.current = session; },     [session]);
  useEffect(() => { teamIdRef.current  = teamId; },      [teamId]);
  useEffect(() => { labelRef.current   = activeLabel; }, [activeLabel]);

  // ── DB load ────────────────────────────────────────────────────────────────

  async function loadDate(date: string, label = activeLabel) {
    setLoadingDate(true);
    try {
      const qp = new URLSearchParams({ label });
      if (teamId) qp.set("team_id", teamId);
      const res  = await fetch(`/api/sessions/${date}?${qp}`);
      const data = await res.json();
      if (data && !data.error && data.drills) {
        setSession({ date, startTime: data.start_time, drills: data.drills });
        setSaveStatus("saved");
      } else {
        setSession({ date, startTime: defaultStartTime, drills: [] });
        setSaveStatus("idle");
      }

      // Side-load the day list for the session switcher (fire-and-forget)
      const listQp = teamId ? `?team_id=${teamId}` : "";
      fetch(`/api/sessions/${date}/list${listQp}`)
        .then((r) => r.json())
        .then((d) => { if (Array.isArray(d)) setDaySessions(d); })
        .catch(() => {});
    } catch {
      setSession({ date, startTime: defaultStartTime, drills: [] });
      setSaveStatus("idle");
    } finally {
      setLoadingDate(false);
    }
  }

  // Re-load whenever the team or active label changes (edit mode only)
  useEffect(() => {
    if (mode === "edit") loadDate(session.date, activeLabel);
  // loadDate and session.date are intentionally omitted — this effect is
  // only meant to respond to external context changes, not every render.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId, activeLabel]);

  // ── Auto-save ──────────────────────────────────────────────────────────────

  async function autoSave() {
    // Read from refs so we always use the values current at fire time.
    const s     = sessionRef.current;
    const tid   = teamIdRef.current;
    const label = labelRef.current;
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
          team_id:    tid,
          label,
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

  // ── Core mutation primitive ────────────────────────────────────────────────

  function mutate(updater: (s: Session) => Session) {
    setSession(updater);
    if (mode === "edit") {
      setSaveStatus("unsaved");
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
      autoSaveTimer.current = setTimeout(() => { void autoSave(); }, 2000);
    }
  }

  // ── Public mutation handlers ───────────────────────────────────────────────

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

  return {
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
  };
}
