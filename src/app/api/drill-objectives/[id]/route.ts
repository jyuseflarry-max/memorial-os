import { NextRequest } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { apiError } from "@/lib/api-error";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { name, color } = await request.json();
    const updates: Record<string, unknown> = {};
    if (name  !== undefined) updates.name  = name;
    if (color !== undefined) updates.color = color;
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from("drill_objectives")
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

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = getSupabaseServer();
    const { error } = await supabase.from("drill_objectives").delete().eq("id", id);
    if (error) throw error;
    return Response.json({ ok: true });
  } catch (err: unknown) {
    return apiError(err);
  }
}
