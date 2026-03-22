import { NextRequest } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";

type Params = { params: Promise<{ id: string }> };

/** PATCH /api/teams/[id] — rename a team */
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const body = await request.json();
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from("teams")
      .update({ name: body.name })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return Response.json(data);
  } catch (err: unknown) {
    return Response.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}

/** DELETE /api/teams/[id] */
export async function DELETE(_: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const supabase = getSupabaseServer();
    const { error } = await supabase.from("teams").delete().eq("id", id);
    if (error) throw error;
    return new Response(null, { status: 204 });
  } catch (err: unknown) {
    return Response.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}
