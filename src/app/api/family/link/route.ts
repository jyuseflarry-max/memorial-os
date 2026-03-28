import { NextRequest } from "next/server";
import { getSupabaseServer, getSupabaseUser } from "@/lib/supabase/server";
import { apiError } from "@/lib/api-error";

/**
 * POST /api/family/link
 *
 * Links an already-authenticated Family user to an additional player.
 * Body: { player_id: string, relationship: string }
 */
export async function POST(request: NextRequest) {
  try {
    const userClient = await getSupabaseUser();
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return apiError("Not authenticated", 401);

    const service = getSupabaseServer();
    const { data: userRecord } = await service
      .from("users")
      .select("role, tenant_id")
      .eq("id", user.id)
      .single();

    if (!userRecord || userRecord.role !== "Family") {
      return apiError("Only Family accounts can use this endpoint", 403);
    }

    const body = await request.json();
    const { player_id, relationship = "Parent" } = body as { player_id: string; relationship?: string };
    if (!player_id) return apiError("player_id is required", 400);

    const { error } = await service.from("family_player_links").insert({
      family_id:        user.id,
      player_id,
      relationship_tag: relationship,
      tenant_id:        userRecord.tenant_id,
    });

    if (error) {
      // Unique violation = already linked — treat as success
      if (error.code === "23505") return Response.json({ ok: true, already_linked: true });
      return apiError(error);
    }

    return Response.json({ ok: true, already_linked: false });
  } catch (err: unknown) {
    return apiError(err);
  }
}
