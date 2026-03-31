import { NextRequest }                      from "next/server";
import { getDb }                            from "@/lib/db";
import { getSupabaseServer }               from "@/lib/supabase/server";
import { apiError }                         from "@/lib/api-error";
import { withIdempotency }                  from "@/lib/idempotency";

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Look up category IDs by name within a tenant. */
async function categoryIdsByName(names: string[], tenantId: string): Promise<string[]> {
  if (!names.length) return [];
  const sb = getSupabaseServer();
  const { data } = await sb
    .from("drill_categories")
    .select("id, name")
    .eq("tenant_id", tenantId)
    .in("name", names);
  return (data ?? []).map((r) => r.id);
}

/** Look up objective IDs by name within a tenant. */
async function objectiveIdsByName(names: string[], tenantId: string): Promise<string[]> {
  if (!names.length) return [];
  const sb = getSupabaseServer();
  const { data } = await sb
    .from("drill_objectives")
    .select("id, name")
    .eq("tenant_id", tenantId)
    .in("name", names);
  return (data ?? []).map((r) => r.id);
}

/** Write category assignments for a drill, replacing any existing ones. */
async function setCategoryAssignments(drillId: string, categoryIds: string[]): Promise<void> {
  const sb = getSupabaseServer();
  await sb.from("drill_category_assignments").delete().eq("drill_id", drillId);
  if (categoryIds.length) {
    await sb.from("drill_category_assignments").insert(
      categoryIds.map((cid) => ({ drill_id: drillId, category_id: cid }))
    );
  }
}

/** Write objective assignments for a drill, replacing any existing ones. */
async function setObjectiveAssignments(drillId: string, objectiveIds: string[]): Promise<void> {
  const sb = getSupabaseServer();
  await sb.from("drill_objective_assignments").delete().eq("drill_id", drillId);
  if (objectiveIds.length) {
    await sb.from("drill_objective_assignments").insert(
      objectiveIds.map((oid) => ({ drill_id: drillId, objective_id: oid }))
    );
  }
}

// ── Shape returned by the Supabase join ──────────────────────────────────────

interface DrillRow {
  id: string;
  [key: string]: unknown;
  drill_category_assignments: { drill_categories: { name: string } | null }[];
  drill_objective_assignments: { drill_objectives: { name: string } | null }[];
}

function flattenDrill(d: DrillRow) {
  const { drill_category_assignments, drill_objective_assignments, ...rest } = d;
  return {
    ...rest,
    categories: drill_category_assignments
      .map((a) => a.drill_categories?.name)
      .filter((n): n is string => !!n),
    objectives: drill_objective_assignments
      .map((a) => a.drill_objectives?.name)
      .filter((n): n is string => !!n),
  };
}

// ── Routes ───────────────────────────────────────────────────────────────────

/**
 * GET /api/drills
 * Returns all drills with categories and objectives resolved from junction tables.
 */
export async function GET() {
  try {
    const db = await getDb();
    const { data, error } = await db
      .from("drills")
      .select(`
        *,
        drill_category_assignments ( drill_categories ( name ) ),
        drill_objective_assignments ( drill_objectives ( name ) )
      `)
      .order("name", { ascending: true });

    if (error) throw error;
    return Response.json((data as DrillRow[]).map(flattenDrill));
  } catch (err: unknown) {
    return apiError(err);
  }
}

/**
 * POST /api/drills
 * Creates a drill and writes category/objective assignments to junction tables.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name, categories, shot_density, shot_type, intensity,
      default_duration, session_position, coaching_notes,
      video_url, level, space, objectives,
    } = body;

    if (!name) return Response.json({ error: "name is required" }, { status: 400 });

    const db = await getDb();
    return withIdempotency(request, db.tenantId, async () => {
      // 1. Insert the drill row (no categories/objectives columns)
      const { data: drill, error } = await db
        .insert("drills", {
          name,
          shot_density,
          shot_type,
          intensity,
          default_duration: default_duration ?? 10,
          session_position: session_position ?? null,
          coaching_notes:   coaching_notes   ?? null,
          video_url:        video_url        ?? "",
          level:            level            ?? null,
          space:            space            ?? null,
        })
        .select()
        .single();

      if (error) throw error;

      // 2. Resolve names → IDs and write junction rows
      const [catIds, objIds] = await Promise.all([
        categoryIdsByName(categories ?? [], db.tenantId),
        objectiveIdsByName(objectives ?? [], db.tenantId),
      ]);
      await Promise.all([
        setCategoryAssignments(drill.id, catIds),
        setObjectiveAssignments(drill.id, objIds),
      ]);

      return Response.json(
        { ...drill, categories: categories ?? [], objectives: objectives ?? [] },
        { status: 201 }
      );
    });
  } catch (err: unknown) {
    return apiError(err);
  }
}
