import { getSupabaseServer, getSupabaseUser } from "@/lib/supabase/server";
import { apiError } from "@/lib/api-error";

/**
 * GET /api/auth/me
 *
 * Returns the current user's identity, role, and team scope.
 * Called once on app load by AuthContext to hydrate the session.
 *
 * For Players, also returns their player record's id and team_id so the
 * entire app can be scoped to their team without any further queries.
 */
export async function GET() {
  try {
    const userClient = await getSupabaseUser();
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return apiError("Not authenticated", 401);

    const service = getSupabaseServer();

    // Look up our app-level user record (role, tenant, name)
    const { data: record, error } = await service
      .from("users")
      .select("full_name, role, tenant_id")
      .eq("id", user.id)
      .single();

    if (error || !record) return apiError("User record not found", 404);

    // For players, find their linked player record to get team_id
    let teamId:   string | null = null;
    let playerId: string | null = null;
    let linkedPlayers: Array<{ playerId: string; playerName: string; teamId: string | null; relationship: string }> | null = null;

    if (record.role === "Player") {
      const { data: playerRecord } = await service
        .from("players")
        .select("id, team_id")
        .eq("user_id", user.id)
        .single();

      if (playerRecord) {
        teamId   = playerRecord.team_id ?? null;
        playerId = playerRecord.id;
      }
    }

    if (record.role === "Family") {
      const { data: links } = await service
        .from("family_player_links")
        .select("player_id, relationship_tag, players(id, name, team_id)")
        .eq("family_id", user.id);

      if (links) {
        linkedPlayers = links.map((l: Record<string, unknown>) => {
          const p = l.players as { id: string; name: string; team_id: string | null } | null;
          return {
            playerId:     l.player_id as string,
            playerName:   p?.name ?? "Unknown",
            teamId:       p?.team_id ?? null,
            relationship: l.relationship_tag as string,
          };
        });
      }
    }

    return Response.json({
      id:           user.id,
      email:        user.email ?? null,
      fullName:     record.full_name,
      role:         record.role,
      tenantId:     record.tenant_id,
      teamId,
      playerId,
      linkedPlayers,
    });
  } catch (err: unknown) {
    return apiError(err);
  }
}
