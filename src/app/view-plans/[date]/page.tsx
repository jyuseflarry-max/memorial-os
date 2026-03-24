"use client";

import { useState, useEffect, Suspense } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { Loader2, Pencil, Printer } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import CoachScript from "@/components/planner/CoachScript";
import MissionProfile from "@/components/planner/MissionProfile";
import { useTeam } from "@/context/TeamContext";
import { useTeamPlayers } from "@/hooks/useTeamPlayers";
import { Session } from "@/types/session";

function PlanViewInner() {
  const params       = useParams();
  const searchParams = useSearchParams();
  const date         = params.date as string;
  const teamIdParam  = searchParams.get("team_id");
  const labelParam   = searchParams.get("label") ?? "";

  const router = useRouter();
  const { activeTeam, teams, setActiveTeam } = useTeam();
  const { players } = useTeamPlayers();

  const autoPrint  = searchParams.get("autoprint") === "1";

  const [session,  setSession]  = useState<Session | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [notFound, setNotFound] = useState(false);

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
    const qp = new URLSearchParams({ label: labelParam });
    if (teamIdParam) qp.set("team_id", teamIdParam);
    fetch(`/api/sessions/${date}?${qp}`)
      .then((r) => r.json())
      .then((data) => {
        if (data && !data.error && data.drills) {
          setSession({ date, startTime: data.start_time, drills: data.drills });
        } else {
          setNotFound(true);
        }
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
    const tp = teamIdParam ? `&team_id=${teamIdParam}` : "";
    const lp = labelParam  ? `&label=${encodeURIComponent(labelParam)}` : "";
    router.push(`/planner?date=${date}${tp}${lp}`);
  }

  return (
    <DashboardLayout>
      <div className="flex items-start justify-between gap-3 mb-6 print:hidden">
        <div>
          <h1 className="text-white text-2xl font-bold tracking-tight">{activeTeam?.name ?? "Practice Plan"}</h1>
        </div>
        {session && (
          <div className="flex items-center gap-2 shrink-0 mt-1">
            <button
              type="button"
              onClick={handleEdit}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-mustang-red hover:bg-mustang-red-dark text-white text-xs font-semibold transition-colors"
            >
              <Pencil size={13} /> Edit
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gray-800 border border-gray-700 text-gray-300 hover:text-white text-xs font-semibold transition-colors"
            >
              <Printer size={13} /> Print
            </button>
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
