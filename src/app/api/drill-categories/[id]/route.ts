import { NextRequest } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { apiError } from "@/lib/api-error";

/**
 * PATCH /api/drill-categories/[id]
 * Body: partial { name?, color?, is_rest? }
 * Returns the updated row.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, color, is_rest } = body;

    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name;
    if (color !== undefined) updates.color = color;
    if (is_rest !== undefined) updates.is_rest = is_rest;

    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from("drill_categories")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return Response.json(data);
  } catch (err: unknown) {
    return apiError(err);
  }
}

/**
 * DELETE /api/drill-categories/[id]
 * Returns { ok: true }.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const supabase = getSupabaseServer();
    const { error } = await supabase
      .from("drill_categories")
      .delete()
      .eq("id", id);

    if (error) throw error;
    return Response.json({ ok: true });
  } catch (err: unknown) {
    return apiError(err);
  }
}
