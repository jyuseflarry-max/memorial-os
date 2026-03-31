import { NextRequest }            from "next/server";
import { getDb }                  from "@/lib/db";
import { getSupabaseServer }      from "@/lib/supabase/server";
import { apiError }               from "@/lib/api-error";

type Params = { params: Promise<{ id: string }> };

async function categoryIdsByName(names: string[], tenantId: string): Promise<string[]> {
  if (!names.length) return [];
  const sb = getSupabaseServer();
  const { data } = await sb
    .from("drill_categories")
    .select("id")
    .eq("tenant_id", tenantId)
    .in("name", names);
  return (data ?? []).map((r) => r.id);
}

async function objectiveIdsByName(names: string[], tenantId: string): Promise<string[]> {
  if (!names.length) return [];
  const sb = getSupabaseServer();
  const { data } = await sb
    .from("drill_objectives")
    .select("id")
    .eq("tenant_id", tenantId)
    .in("name", names);
  return (data ?? []).map((r) => r.id);
}

/**
 * PATCH /api/drills/[id]
 * Partial update. If categories or objectives are provided, replaces assignments.
 */
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { categories, objectives, ...drillFields } = body as {
      categories?: string[];
      objectives?: string[];
      [key: string]: unknown;
    };

    const db = await getDb();
    const sb = getSupabaseServer();

    // Update scalar drill fields if any were provided
    let updated: Record<string, unknown> = {};
    if (Object.keys(drillFields).length > 0) {
      const { data, error } = await db
        .update("drills", drillFields)
        .eq("id", id)
        .select(`
          *,
          drill_category_assignments ( drill_categories ( name ) ),
          drill_objective_assignments ( drill_objectives ( name ) )
        `)
        .single();
      if (error) throw error;
      updated = data as Record<string, unknown>;
    } else {
      // Fetch current drill to return a complete response
      const { data, error } = await db
        .from("drills")
        .select(`
          *,
          drill_category_assignments ( drill_categories ( name ) ),
          drill_objective_assignments ( drill_objectives ( name ) )
        `)
        .eq("id", id)
        .single();
      if (error) throw error;
      updated = data as Record<string, unknown>;
    }

    // Replace category assignments if provided
    if (categories !== undefined) {
      const catIds = await categoryIdsByName(categories, db.tenantId);
      await sb.from("drill_category_assignments").delete().eq("drill_id", id);
      if (catIds.length) {
        await sb.from("drill_category_assignments").insert(
          catIds.map((cid) => ({ drill_id: id, category_id: cid }))
        );
      }
    }

    // Replace objective assignments if provided
    if (objectives !== undefined) {
      const objIds = await objectiveIdsByName(objectives, db.tenantId);
      await sb.from("drill_objective_assignments").delete().eq("drill_id", id);
      if (objIds.length) {
        await sb.from("drill_objective_assignments").insert(
          objIds.map((oid) => ({ drill_id: id, objective_id: oid }))
        );
      }
    }

    // Build response — use provided arrays or extract from current DB state
    const { drill_category_assignments, drill_objective_assignments, ...rest } =
      updated as {
        drill_category_assignments: { drill_categories: { name: string } | null }[];
        drill_objective_assignments: { drill_objectives: { name: string } | null }[];
        [key: string]: unknown;
      };

    const resolvedCats = categories ?? drill_category_assignments
      .map((a) => a.drill_categories?.name)
      .filter((n): n is string => !!n);

    const resolvedObjs = objectives ?? drill_objective_assignments
      .map((a) => a.drill_objectives?.name)
      .filter((n): n is string => !!n);

    return Response.json({ ...rest, categories: resolvedCats, objectives: resolvedObjs });
  } catch (err: unknown) {
    return apiError(err);
  }
}

/**
 * DELETE /api/drills/[id]
 * Junction rows are removed automatically by CASCADE.
 */
export async function DELETE(_: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const db = await getDb();
    const { error } = await db.delete("drills").eq("id", id);
    if (error) throw error;
    return new Response(null, { status: 204 });
  } catch (err: unknown) {
    return apiError(err);
  }
}
