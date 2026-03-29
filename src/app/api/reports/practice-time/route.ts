import { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { apiError } from "@/lib/api-error";

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

    const db = await getDb();

    // 1. Fetch drills lookup (category + sub_category by id)
    const { data: drillsData, error: drillsError } = await db
      .from("drills")
      .select("id, category, sub_category");
    if (drillsError) throw drillsError;

    const drillMap = new Map<string, { category: string; sub_category: string }>();
    for (const d of drillsData ?? []) {
      drillMap.set(d.id, { category: d.category, sub_category: d.sub_category });
    }

    // 2. Fetch session_drills with date/team filters
    let sdQuery = db
      .from("session_drills")
      .select("duration, date, drill_id")
      .order("date", { ascending: true });

    if (teamId) sdQuery = sdQuery.eq("team_id", teamId);
    if (from)   sdQuery = sdQuery.gte("date", from);
    if (to)     sdQuery = sdQuery.lte("date", to);

    const { data, error } = await sdQuery;
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
      const drill = drillMap.get(row.drill_id as string);
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
    return apiError(err);
  }
}
