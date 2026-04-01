import { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { getSupabaseServer } from "@/lib/supabase/server";
import { apiError } from "@/lib/api-error";
import { ROLE_COACH } from "@/lib/roles";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const db = await getDb();
    if (!ROLE_COACH.includes(db.role)) return apiError("Forbidden", 403);
    const { id } = await params;
    const body = await req.json();

    const sb = getSupabaseServer();

    // Verify ownership — global exercises (tenant_id IS NULL) cannot be edited
    const { data: existing } = await sb
      .from("strength_exercises")
      .select("tenant_id")
      .eq("id", id)
      .single();
    if (!existing) return apiError("Not found", 404);
    if (existing.tenant_id === null) return apiError("Global exercises cannot be edited — duplicate it first", 403);
    if (existing.tenant_id !== db.tenantId) return apiError("Forbidden", 403);

    const { data, error } = await sb
      .from("strength_exercises")
      .update(body)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return Response.json({ ...data, is_global: false });
  } catch (err) { return apiError(err); }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const db = await getDb();
    if (!ROLE_COACH.includes(db.role)) return apiError("Forbidden", 403);
    const { id } = await params;
    // Can only delete tenant-owned exercises
    const { data: ex } = await db.from("strength_exercises").select("tenant_id").eq("id", id).single();
    if (!ex || ex.tenant_id === null) return apiError("Cannot delete global exercises", 403);
    const { error } = await db.delete("strength_exercises").eq("id", id);
    if (error) throw error;
    return new Response(null, { status: 204 });
  } catch (err) { return apiError(err); }
}
