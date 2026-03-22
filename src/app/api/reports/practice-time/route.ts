import { NextRequest } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";

export interface SubCategoryRow {
  sub_category: string;
  minutes: number;
  percentage: number;
  sessions: number;
}

export interface CategoryRow {
  category: string;
  minutes: number;
  percentage: number;
  sessions: number;
  sub_categories: SubCategoryRow[];
}

export interface PracticeTimeReport {
  total_minutes: number;
  total_sessions: number;
  from: string | null;
  to: string | null;
  categories: CategoryRow[];
}

/**
 * GET /api/reports/practice-time
 * Query params: team_id, from (YYYY-MM-DD), to (YYYY-MM-DD)
 *
 * Joins session_drills → drills to aggregate time by category + sub_category.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const teamId = searchParams.get("team_id");
    const from   = searchParams.get("from");
    const to     = searchParams.get("to");

    const supabase = getSupabaseServer();

    // Pull session_drills joined with drills in one query
    let query = supabase
      .from("session_drills")
      .select("duration, date, drill_id, drills(category, sub_category)")
      .order("date", { ascending: true });

    if (teamId) query = query.eq("team_id", teamId);
    if (from)   query = query.gte("date", from);
    if (to)     query = query.lte("date", to);

    const { data, error } = await query;
    if (error) throw error;

    // Aggregate
    const catMap = new Map<string, {
      minutes: number;
      sessionDates: Set<string>;
      subs: Map<string, { minutes: number; sessionDates: Set<string> }>;
    }>();

    let totalMinutes = 0;
    const allSessionDates = new Set<string>();

    for (const row of data ?? []) {
      const drill = Array.isArray(row.drills) ? row.drills[0] as { category: string; sub_category: string } | undefined : row.drills as { category: string; sub_category: string } | null;
      if (!drill) continue;

      const { category, sub_category } = drill;
      const minutes = Number(row.duration ?? 0);
      const date    = row.date as string;

      totalMinutes += minutes;
      allSessionDates.add(date);

      if (!catMap.has(category)) {
        catMap.set(category, { minutes: 0, sessionDates: new Set(), subs: new Map() });
      }
      const cat = catMap.get(category)!;
      cat.minutes += minutes;
      cat.sessionDates.add(date);

      const subKey = sub_category || "(none)";
      if (!cat.subs.has(subKey)) {
        cat.subs.set(subKey, { minutes: 0, sessionDates: new Set() });
      }
      const sub = cat.subs.get(subKey)!;
      sub.minutes += minutes;
      sub.sessionDates.add(date);
    }

    const categories: CategoryRow[] = Array.from(catMap.entries())
      .map(([category, { minutes, sessionDates, subs }]) => ({
        category,
        minutes,
        percentage: totalMinutes > 0 ? Math.round((minutes / totalMinutes) * 1000) / 10 : 0,
        sessions: sessionDates.size,
        sub_categories: Array.from(subs.entries())
          .map(([sub_category, s]) => ({
            sub_category,
            minutes: s.minutes,
            percentage: totalMinutes > 0 ? Math.round((s.minutes / totalMinutes) * 1000) / 10 : 0,
            sessions: s.sessionDates.size,
          }))
          .sort((a, b) => b.minutes - a.minutes),
      }))
      .sort((a, b) => b.minutes - a.minutes);

    const report: PracticeTimeReport = {
      total_minutes: totalMinutes,
      total_sessions: allSessionDates.size,
      from,
      to,
      categories,
    };

    return Response.json(report);
  } catch (err: unknown) {
    return Response.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}
