import { NextRequest } from "next/server";
import { getSupabaseServer, getSupabaseUser } from "@/lib/supabase/server";
import { apiError } from "@/lib/api-error";

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
    return apiError(err);
  }
}

/** POST /api/teams — create a team */
export async function POST(request: NextRequest) {
  try {
    const { name } = await request.json();
    if (!name?.trim()) return Response.json({ error: "Name is required" }, { status: 400 });

    const userClient = await getSupabaseUser();
    const { data: { user: me } } = await userClient.auth.getUser();
    if (!me) return apiError("Not authenticated", 401);

    const supabase = getSupabaseServer();
    const { data: myRecord } = await supabase.from("users").select("tenant_id").eq("id", me.id).single();
    if (!myRecord) return apiError("User record not found", 403);

    const { data, error } = await supabase
      .from("teams")
      .insert({ name: name.trim(), tenant_id: myRecord.tenant_id })
      .select()
      .single();
    if (error) {
      if (error.code === "23505") return Response.json({ error: "A team with that name already exists." }, { status: 409 });
      throw error;
    }
    return Response.json(data, { status: 201 });
  } catch (err: unknown) {
    return apiError(err);
  }
}
