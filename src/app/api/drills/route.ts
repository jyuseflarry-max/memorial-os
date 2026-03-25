import { NextRequest } from "next/server";
import { getSupabaseServer, getSupabaseUser } from "@/lib/supabase/server";
import { apiError } from "@/lib/api-error";

/**
 * GET /api/drills
 * Returns all drills ordered by name.
 */
export async function GET() {
  try {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from("drills")
      .select("*")
      .order("name", { ascending: true });

    if (error) throw error;
    return Response.json(data);
  } catch (err: unknown) {
    return apiError(err);
  }
}

/**
 * POST /api/drills
 * Body: { name, category, sub_category, shot_density, shot_type, intensity, video_url }
 * Returns the inserted drill row.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, categories, shot_density, shot_type, intensity, default_duration, session_position, coaching_notes, video_url, level, space, objectives } = body;

    if (!name) {
      return Response.json({ error: "name is required" }, { status: 400 });
    }

    const userClient = await getSupabaseUser();
    const { data: { user: me } } = await userClient.auth.getUser();
    if (!me) return apiError("Not authenticated", 401);

    const supabase = getSupabaseServer();

    const { data: myRecord } = await supabase
      .from("users")
      .select("tenant_id")
      .eq("id", me.id)
      .single();
    if (!myRecord) return apiError("User record not found", 403);

    const { data, error } = await supabase
      .from("drills")
      .insert({ name, categories: categories ?? [], shot_density, shot_type, intensity, default_duration: default_duration ?? 10, session_position: session_position ?? null, coaching_notes: coaching_notes ?? null, video_url: video_url ?? "", level: level ?? null, space: space ?? null, objectives: objectives ?? [], tenant_id: myRecord.tenant_id })
      .select()
      .single();

    if (error) throw error;
    return Response.json(data, { status: 201 });
  } catch (err: unknown) {
    return apiError(err);
  }
}
