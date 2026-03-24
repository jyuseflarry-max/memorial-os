"use client";

import { useState, useEffect, Suspense } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { Loader2, Pencil, Printer, Trash2 } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import CoachScript from "@/components/planner/CoachScript";
import MissionProfile from "@/components/planner/MissionProfile";
import { useTeam } from "@/context/TeamContext";
import { useTeamPlayers } from "@/hooks/useTeamPlayers";
import { useAuth } from "@/context/AuthContext";
import { Session } from "@/types/session";
import { fetchSession } from "@/lib/session-api";

function PlanViewInner() {
  const params       = useParams();
  const searchParams = useSearchParams();
  const date         = params.date as string;
  const teamIdParam  = searchParams.get("team_id");
  const labelParam   = searchParams.get("label") ?? "";

  const router = useRouter();
  const { activeTeam, teams, setActiveTeam } = useTeam();
  const { players } = useTeamPlayers();
  const { isPlayer } = useAuth();

  const autoPrint  = searchParams.get("autoprint") === "1";

  const [session,        setSession]        = useState<Session | null>(null);
  const [loading,        setLoading]        = useState(true);
  const [notFound,       setNotFound]       = useState(false);
  const [confirmDelete,  setConfirmDelete]  = useState(false);
  const [deleting,       setDeleting]       = useState(false);

  // If a team_id was passed in the URL, activate that team
  useEffect(() => {
    if (!teamIdParam || !teams.length) return;
    const target = teams.find((t) => t.id === teamIdParam);
    if (target && activeTeam?.id !== target.id) setActiveTeam(target);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamIdParam, teams]);

  useEffect(() => {
    if (!date) return;
    setLoading(true);
    fetchSession(date, labelParam, teamIdParam)
      .then((data) => {
        if (data) setSession(data);
        else setNotFound(true);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [date, teamIdParam, labelParam]);

  useEffect(() => {
    if (!autoPrint || loading) return;
    const t = setTimeout(() => window.print(), 300);
    return () => clearTimeout(t);
  }, [autoPrint, loading]);

  function handleEdit() {
    const qp = new URLSearchParams({ date });
    if (teamIdParam) qp.set("team_id", teamIdParam);
    if (labelParam)  qp.set("label", labelParam);
    router.push(`/planner?${qp}`);
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const qp = new URLSearchParams({ label: labelParam });
      if (teamIdParam) qp.set("team_id", teamIdParam);
      await fetch(`/api/sessions/${date}?${qp}`, { method: "DELETE" });
      router.push("/view-plans");
    } catch {
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  return (
    <DashboardLayout>
      <div className="flex items-start justify-between gap-3 mb-6 print:hidden">
        <div>
          <h1 className="text-white text-2xl font-bold tracking-tight">{activeTeam?.name ?? "Practice Plan"}</h1>
        </div>
        {session && (
          <div className="flex items-center gap-2 shrink-0 mt-1">
            {/* Edit and Delete are staff-only — players can view but not modify */}
            {!isPlayer && (
              <button
                type="button"
                onClick={handleEdit}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-mustang-red hover:bg-mustang-red-dark text-white text-xs font-semibold transition-colors"
              >
                <Pencil size={13} /> Edit
              </button>
            )}
            <button
              type="button"
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gray-800 border border-gray-700 text-gray-300 hover:text-white text-xs font-semibold transition-colors"
            >
              <Printer size={13} /> Print
            </button>

            {!isPlayer && (
              !confirmDelete ? (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 text-xs font-semibold transition-colors"
                >
                  <Trash2 size={13} /> Delete
                </button>
              ) : (
                <div className="flex items-center gap-1.5">
                  <span className="text-gray-400 text-xs font-mono">Delete plan?</span>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={deleting}
                    className="flex items-center gap-1 px-3 py-2 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-semibold transition-colors"
                  >
                    {deleting ? <Loader2 size={12} className="animate-spin" /> : null}
                    Yes, delete
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="px-3 py-2 rounded-xl bg-gray-800 border border-gray-700 text-gray-400 hover:text-white text-xs font-semibold transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              )
            )}
          </div>
        )}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="text-mustang-red animate-spin" />
        </div>
      )}

      {!loading && notFound && (
        <div className="flex flex-col items-center gap-2 py-20">
          <p className="text-gray-400 text-sm">No practice plan found for this date.</p>
        </div>
      )}

      {!loading && session && (
        <div className="flex flex-col gap-6">
          <CoachScript session={session} players={players} />

          {session.drills.length > 0 && (
            <div className="flex flex-col gap-2 print:hidden">
              <p className="text-gray-400 text-xs font-mono uppercase tracking-wider px-1">Live Analytics</p>
              <MissionProfile drills={session.drills} />
            </div>
          )}
        </div>
      )}
    </DashboardLayout>
  );
}

export default function PlanViewPage() {
  return (
    <Suspense fallback={null}>
      <PlanViewInner />
    </Suspense>
  );
}
