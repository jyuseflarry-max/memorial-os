import { NextRequest } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";

/** GET /api/teams — all teams ordered by name */
export async function GET() {
  try {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from("teams")
      .select("*")
      .order("name", { ascending: true });
    if (error) throw error;
    return Response.json(data);
  } catch (err: unknown) {
    return Response.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}

/** POST /api/teams — create a team */
export async function POST(request: NextRequest) {
  try {
    const { name } = await request.json();
    if (!name?.trim()) return Response.json({ error: "Name is required" }, { status: 400 });

    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from("teams")
      .insert({ name: name.trim() })
      .select()
      .single();
    if (error) {
      if (error.code === "23505") return Response.json({ error: "A team with that name already exists." }, { status: 409 });
      throw error;
    }
    return Response.json(data, { status: 201 });
  } catch (err: unknown) {
    return Response.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}
