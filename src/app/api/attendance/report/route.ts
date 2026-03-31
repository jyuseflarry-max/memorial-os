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
import { NextRequest } from "next/server";
import { getDb }       from "@/lib/db";
import { apiError }    from "@/lib/api-error";
import { ROLE_STAFF }  from "@/lib/roles";

export interface AttendanceRecord {
  id:                  string;
  status:              "excused" | "unexcused" | "school_event";
  event_type:          "practice" | "game";
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
    school_events:   number;
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

    const db = await getDb();
    if (!ROLE_STAFF.includes(db.role)) return apiError("Forbidden", 403);

    // 1. Load all absence records in range
    let q = db
      .from("practice_attendance")
      .select("id, player_id, practice_date, status, event_type, notes, makeup_required, makeup_proof_url, makeup_proof_name, makeup_completed_at, reviewed_by, reviewed_at")
      .order("practice_date", { ascending: true });

    if (teamId) q = q.eq("team_id", teamId);
    if (from)   q = q.gte("practice_date", from);
    if (to)     q = q.lte("practice_date", to);

    const { data: absences, error: absErr } = await q;
    if (absErr) throw absErr;

    // 2. Load players (for the team if specified, otherwise all)
    let pq = db
      .from("players")
      .select("id, name, jersey_number")
      .order("name");

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
      let excused = 0, unexcused = 0, school_events = 0, makeup_required = 0, makeup_done = 0;

      for (const r of recs) {
        records[r.practice_date] = {
          id:                  r.id,
          status:              r.status as "excused" | "unexcused" | "school_event",
          event_type:          (r.event_type ?? "practice") as "practice" | "game",
          notes:               r.notes,
          makeup_required:     r.makeup_required ?? true,
          makeup_proof_url:    r.makeup_proof_url,
          makeup_proof_name:   r.makeup_proof_name,
          makeup_completed_at: r.makeup_completed_at,
          reviewed_by:         r.reviewed_by,
          reviewed_at:         r.reviewed_at,
        };
        if (r.status === "excused") excused++;
        else if (r.status === "school_event") school_events++;
        else unexcused++;
        if (r.makeup_required) {
          makeup_required++;
          if (r.makeup_completed_at) makeup_done++;
        }
      }

      return {
        player_id:     p.id,
        full_name:     p.name,
        jersey_number: p.jersey_number ?? null,
        records,
        totals: { excused, unexcused, school_events, makeup_required, makeup_done },
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
