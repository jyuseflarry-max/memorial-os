import { NextRequest } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";

/** GET /api/strength/phases — all phases ordered by created_at desc */
export async function GET() {
  try {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from("strength_phases")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return Response.json(data ?? []);
  } catch (err: unknown) {
    return Response.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}

/** POST /api/strength/phases — create a new phase */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const supabase = getSupabaseServer();

    const { data, error } = await supabase
      .from("strength_phases")
      .insert({
        name:        body.name ?? "New Phase",
        description: body.description ?? null,
        blocks:      [],
        updated_at:  new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return Response.json(data, { status: 201 });
  } catch (err: unknown) {
    return Response.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}
