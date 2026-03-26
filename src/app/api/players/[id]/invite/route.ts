import { NextRequest } from "next/server";
import { getSupabaseServer, getSupabaseUser } from "@/lib/supabase/server";
import { apiError } from "@/lib/api-error";

/**
 * POST /api/players/[id]/invite
 *
 * Sends (or resends) a Supabase invite email to the player's email address.
 *
 * First invite:
 *   1. Look up the player → verify they have an email and no user_id yet
 *   2. Call supabase.auth.admin.inviteUserByEmail → creates auth.users record
 *   3. Insert a row in our users table (role=Player, tenant_id from caller)
 *   4. Update players.user_id to link their record to their login account
 *
 * Resend:
 *   1. Player already has user_id → just call inviteUserByEmail again
 *   2. Supabase re-sends the magic link email, no DB changes needed
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const service = getSupabaseServer();

    // Get the calling admin's tenant_id so the new user inherits it
    const userClient = await getSupabaseUser();
    const { data: { user: adminUser } } = await userClient.auth.getUser();
    if (!adminUser) return apiError("Not authenticated", 401);

    const { data: adminRecord } = await service
      .from("users")
      .select("tenant_id")
      .eq("id", adminUser.id)
      .single();
    if (!adminRecord) return apiError("Admin record not found", 403);

    // Fetch the player
    const { data: player, error: playerError } = await service
      .from("players")
      .select("id, name, email, user_id")
      .eq("id", id)
      .single();

    if (playerError || !player) return apiError("Player not found", 404);
    if (!player.email)          return apiError("Player has no email address", 400);

    // ── Resend: player already has an account ─────────────────────────────
    if (player.user_id) {
      await service.auth.admin.inviteUserByEmail(player.email);
      return Response.json({ ok: true, resent: true });
    }

    // ── First invite ──────────────────────────────────────────────────────
    const { data: invited, error: inviteError } =
      await service.auth.admin.inviteUserByEmail(player.email, {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
      });

    if (inviteError) {
      console.error("[invite] inviteUserByEmail failed:", inviteError.message);
      // Email failure is non-fatal if a user was still created
      if (!invited?.user) throw inviteError;
    }

    const newUserId = invited!.user!.id;

    // Create the users table record for this player
    const { error: userInsertError } = await service.from("users").insert({
      id:        newUserId,
      tenant_id: adminRecord.tenant_id,
      role:      "Player",
      full_name: player.name,
    });
    if (userInsertError) throw userInsertError;

    // Link the player record to their new login account
    const { error: linkError } = await service
      .from("players")
      .update({ user_id: newUserId, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (linkError) throw linkError;

    return Response.json({ ok: true, resent: false });
  } catch (err: unknown) {
    return apiError(err);
  }
}
