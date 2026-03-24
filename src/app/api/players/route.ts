import { NextRequest } from "next/server";
import { getSupabaseServer, getSupabaseUser } from "@/lib/supabase/server";
import { apiError } from "@/lib/api-error";

/** GET /api/players — list all players ordered by jersey number */
export async function GET() {
  try {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from("players")
      .select("*")
      .order("jersey_number", { ascending: true });

    if (error) throw error;
    return Response.json(data);
  } catch (err: unknown) {
    return apiError(err);
  }
}

/** POST /api/players — insert a single player, return the created row */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const userClient = await getSupabaseUser();
    const { data: { user: me } } = await userClient.auth.getUser();
    if (!me) return apiError("Not authenticated", 401);

    const supabase = getSupabaseServer();
    const { data: myRecord } = await supabase.from("users").select("tenant_id").eq("id", me.id).single();
    if (!myRecord) return apiError("User record not found", 403);

    const { data, error } = await supabase
      .from("players")
      .insert([{ ...body, tenant_id: myRecord.tenant_id, updated_at: new Date().toISOString() }])
      .select()
      .single();

    if (error) throw error;
    return Response.json(data, { status: 201 });
  } catch (err: unknown) {
    if (typeof err === "object" && err !== null && (err as Record<string, unknown>).code === "23505") {
      return Response.json({ error: "That jersey number is already taken on this team. Choose a different number." }, { status: 409 });
    }
    return apiError(err);
  }
}
