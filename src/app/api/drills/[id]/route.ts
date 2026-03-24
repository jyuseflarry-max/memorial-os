import { NextRequest } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { apiError } from "@/lib/api-error";

type Params = { params: Promise<{ id: string }> };

/**
 * PATCH /api/drills/[id]
 * Partial update — only sends changed fields.
 */
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const body = await request.json();
    const supabase = getSupabaseServer();

    const { data, error } = await supabase
      .from("drills")
      .update(body)
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
 * DELETE /api/drills/[id]
 */
export async function DELETE(_: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const supabase = getSupabaseServer();

    const { error } = await supabase.from("drills").delete().eq("id", id);
    if (error) throw error;
    return new Response(null, { status: 204 });
  } catch (err: unknown) {
    return apiError(err);
  }
}
