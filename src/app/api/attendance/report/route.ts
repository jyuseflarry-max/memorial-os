/** GET /api/attendance/report?team_id=&from=YYYY-MM-DD&to=YYYY-MM-DD
 *
 * Returns a "gradebook" structure:
 * {
 *   dates: string[],         // sorted list of practice dates in range
 *   players: PlayerRow[],
 * }
 *
 * PlayerRow: {
 *   player_id, full_name, jersey_number?,
 *   records: { [date]: AttendanceRecord | null }
 *   totals: { excused, unexcused, makeup_required, makeup_done }
 * }
 */
import { NextRequest }                    from "next/server";
import { getSupabaseServer, getSupabaseUser } from "@/lib/supabase/server";
import { apiError }                       from "@/lib/api-error";

export interface AttendanceRecord {
  id:                  string;
  status:              "excused" | "unexcused";
  notes:               string | null;
  makeup_required:     boolean;
  makeup_proof_url:    string | null;
  makeup_proof_name:   string | null;
  makeup_completed_at: string | null;
  reviewed_by:         string | null;
  reviewed_at:         string | null;
}

export interface PlayerAttendanceRow {
  player_id:      string;
  full_name:      string;
  jersey_number:  number | null;
  records:        Record<string, AttendanceRecord>;
  totals: {
    excused:         number;
    unexcused:       number;
    makeup_required: number;
    makeup_done:     number;
  };
}

export interface AttendanceReport {
  dates:   string[];
  players: PlayerAttendanceRow[];
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get("team_id");
    const from   = searchParams.get("from");
    const to     = searchParams.get("to");

    const userClient = await getSupabaseUser();
    const { data: { user: me } } = await userClient.auth.getUser();
    if (!me) return apiError("Not authenticated", 401);

    const service = getSupabaseServer();
    const { data: myRecord } = await service.from("users").select("tenant_id, role").eq("id", me.id).single();
    if (!myRecord) return apiError("User record not found", 403);
    if (!["Admin", "Coach", "Manager"].includes(myRecord.role)) return apiError("Forbidden", 403);

    const tenantId = myRecord.tenant_id;

    // 1. Load all absence records in range
    let q = service
      .from("practice_attendance")
      .select("id, player_id, practice_date, status, notes, makeup_required, makeup_proof_url, makeup_proof_name, makeup_completed_at, reviewed_by, reviewed_at")
      .eq("tenant_id", tenantId)
      .order("practice_date", { ascending: true });

    if (teamId) q = q.eq("team_id", teamId);
    if (from)   q = q.gte("practice_date", from);
    if (to)     q = q.lte("practice_date", to);

    const { data: absences, error: absErr } = await q;
    if (absErr) throw absErr;

    // 2. Load players (for the team if specified, otherwise all)
    let pq = service
      .from("players")
      .select("id, full_name, jersey_number")
      .eq("tenant_id", tenantId)
      .order("full_name");

    if (teamId) pq = pq.eq("team_id", teamId);

    const { data: players, error: pErr } = await pq;
    if (pErr) throw pErr;

    // 3. Build set of distinct practice dates that have at least one absence
    const dateSet = new Set<string>();
    for (const a of absences ?? []) dateSet.add(a.practice_date);
    const dates = [...dateSet].sort();

    // 4. Build player rows
    const absByPlayer: Record<string, typeof absences> = {};
    for (const a of absences ?? []) {
      if (!absByPlayer[a.player_id]) absByPlayer[a.player_id] = [];
      absByPlayer[a.player_id]!.push(a);
    }

    const playerRows: PlayerAttendanceRow[] = (players ?? []).map((p) => {
      const recs = absByPlayer[p.id] ?? [];
      const records: Record<string, AttendanceRecord> = {};
      let excused = 0, unexcused = 0, makeup_required = 0, makeup_done = 0;

      for (const r of recs) {
        records[r.practice_date] = {
          id:                  r.id,
          status:              r.status as "excused" | "unexcused",
          notes:               r.notes,
          makeup_required:     r.makeup_required ?? false,
          makeup_proof_url:    r.makeup_proof_url,
          makeup_proof_name:   r.makeup_proof_name,
          makeup_completed_at: r.makeup_completed_at,
          reviewed_by:         r.reviewed_by,
          reviewed_at:         r.reviewed_at,
        };
        if (r.status === "excused") excused++;
        else unexcused++;
        if (r.makeup_required) {
          makeup_required++;
          if (r.makeup_completed_at) makeup_done++;
        }
      }

      return {
        player_id:     p.id,
        full_name:     p.full_name,
        jersey_number: p.jersey_number ?? null,
        records,
        totals: { excused, unexcused, makeup_required, makeup_done },
      };
    })
    // Only include players with at least one absence (or all if no filter)
    .filter((row) => Object.keys(row.records).length > 0 || !teamId);

    const report: AttendanceReport = { dates, players: playerRows };
    return Response.json(report);
  } catch (err) {
    return apiError(err);
  }
}
