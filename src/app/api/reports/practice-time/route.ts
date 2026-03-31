import { NextRequest } from "next/server";
import { getDb }       from "@/lib/db";
import { apiError }    from "@/lib/api-error";

export interface SubCategoryRow {
  sub_category: string;   // drill name
  minutes:      number;
  percentage:   number;
  sessions:     number;
}

export interface CategoryRow {
  category:       string;
  minutes:        number;
  percentage:     number;
  sessions:       number;
  sub_categories: SubCategoryRow[];
}

export interface PracticeTimeReport {
  total_minutes:  number;
  total_sessions: number;
  from:           string | null;
  to:             string | null;
  categories:     CategoryRow[];
}

/**
 * GET /api/reports/practice-time
 * Query params: team_id, from (YYYY-MM-DD), to (YYYY-MM-DD)
 *
 * Aggregates practice time by category (from drill_category_assignments).
 * Sub-rows show individual drill contributions within each category.
 * A drill with multiple categories is counted under each.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const teamId = searchParams.get("team_id");
    const from   = searchParams.get("from");
    const to     = searchParams.get("to");

    const db = await getDb();

    // 1. Drills → categories (via junction table) + drill name
    const { data: drillsData, error: drillsError } = await db
      .from("drills")
      .select(`
        id,
        name,
        drill_category_assignments (
          drill_categories ( name )
        )
      `);
    if (drillsError) throw drillsError;

    // Build: drillId → { drillName, categories[] }
    type RawAssignment = { drill_categories: { name: string } | { name: string }[] | null };
    type DrillInfo = { drillName: string; categories: string[] };
    const drillMap = new Map<string, DrillInfo>();

    for (const d of drillsData ?? []) {
      const raw = (d as unknown as { drill_category_assignments: RawAssignment | RawAssignment[] | null })
        .drill_category_assignments;
      const assignments: RawAssignment[] = raw == null ? [] : Array.isArray(raw) ? raw : [raw];

      const categories = assignments
        .flatMap((a) => {
          const dc = a.drill_categories;
          if (!dc) return [];
          return Array.isArray(dc) ? dc.map((x) => x.name) : [dc.name];
        })
        .filter((n): n is string => !!n);

      drillMap.set(d.id as string, { drillName: d.name as string, categories });
    }

    // 2. session_drills with date + team filter
    // session_drills has: session_id, drill_id, date, team_id, duration, tenant_id
    let sdQuery = db
      .from("session_drills")
      .select("duration, date, drill_id")
      .order("date", { ascending: true });

    if (teamId) sdQuery = sdQuery.eq("team_id", teamId);
    if (from)   sdQuery = sdQuery.gte("date", from);
    if (to)     sdQuery = sdQuery.lte("date", to);

    const { data, error } = await sdQuery;
    if (error) throw error;

    // 3. Aggregate by category → drill name
    const catMap = new Map<string, {
      minutes:      number;
      sessionDates: Set<string>;
      drills: Map<string, { minutes: number; sessionDates: Set<string> }>;
    }>();

    let totalMinutes = 0;
    const allSessionDates = new Set<string>();

    for (const row of data ?? []) {
      const info = drillMap.get(row.drill_id as string);
      if (!info || info.categories.length === 0) continue;

      const minutes = Number(row.duration ?? 0);
      const date    = row.date as string;

      totalMinutes += minutes;
      allSessionDates.add(date);

      // Count under every category the drill belongs to
      for (const category of info.categories) {
        if (!catMap.has(category)) {
          catMap.set(category, { minutes: 0, sessionDates: new Set(), drills: new Map() });
        }
        const cat = catMap.get(category)!;
        cat.minutes += minutes;
        cat.sessionDates.add(date);

        const drillKey = info.drillName;
        if (!cat.drills.has(drillKey)) {
          cat.drills.set(drillKey, { minutes: 0, sessionDates: new Set() });
        }
        const d = cat.drills.get(drillKey)!;
        d.minutes += minutes;
        d.sessionDates.add(date);
      }
    }

    const categories: CategoryRow[] = Array.from(catMap.entries())
      .map(([category, { minutes, sessionDates, drills }]) => ({
        category,
        minutes,
        percentage: totalMinutes > 0 ? Math.round((minutes / totalMinutes) * 1000) / 10 : 0,
        sessions:   sessionDates.size,
        sub_categories: Array.from(drills.entries())
          .map(([drillName, s]) => ({
            sub_category: drillName,
            minutes:      s.minutes,
            percentage:   totalMinutes > 0 ? Math.round((s.minutes / totalMinutes) * 1000) / 10 : 0,
            sessions:     s.sessionDates.size,
          }))
          .sort((a, b) => b.minutes - a.minutes),
      }))
      .sort((a, b) => b.minutes - a.minutes);

    return Response.json({
      total_minutes:  totalMinutes,
      total_sessions: allSessionDates.size,
      from,
      to,
      categories,
    } satisfies PracticeTimeReport);
  } catch (err: unknown) {
    return apiError(err);
  }
}
