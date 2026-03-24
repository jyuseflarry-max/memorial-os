import { Session } from "@/types/session";

/**
 * Single source of truth for fetching a session from the API.
 * Returns a Session if found, null if not found, throws on network error.
 * Used by both useSessionEditor (edit mode load) and view-plans/[date]/page.tsx.
 */
export async function fetchSession(
  date: string,
  label: string,
  teamId: string | null,
): Promise<Session | null> {
  const qp = new URLSearchParams({ label });
  if (teamId) qp.set("team_id", teamId);
  const res  = await fetch(`/api/sessions/${date}?${qp}`);
  const data = await res.json();
  if (data && !data.error && data.drills) {
    return { date, startTime: data.start_time, drills: data.drills };
  }
  return null;
}

/**
 * Single source of truth for persisting a session to the API.
 * Used by both useSessionEditor (auto-save) and SaveToPlannerModal (new-mode save).
 */
export async function postSession(
  session: Session,
  teamId: string | null,
  label: string,
): Promise<Response> {
  return fetch("/api/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      date:       session.date,
      start_time: session.startTime,
      drills:     session.drills,
      team_id:    teamId,
      label,
    }),
  });
}
