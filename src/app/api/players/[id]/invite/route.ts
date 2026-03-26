import { NextRequest } from "next/server";
import { getSupabaseServer, getSupabaseUser } from "@/lib/supabase/server";
import { apiError } from "@/lib/api-error";

/**
 * POST /api/players/[id]/invite
 *
 * Creates (or re-sends) a "Set your password" email to the player.
 *
 * First send:
 *   1. Look up the player → verify they have an email and no user_id yet
 *   2. Create auth.users record via admin.createUser (email_confirm: true)
 *   3. Insert a row in our users table (role=Player, tenant_id from caller)
 *   4. Update players.user_id to link their record
 *   5. Generate a password-recovery link → Supabase sends "Reset password" email
 *
 * Resend:
 *   1. Player already has user_id → generate a new recovery link to resend
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

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

    // ── Resend: player already has an account — send a new recovery link ───
    if (player.user_id) {
      const { error: linkError } = await service.auth.admin.generateLink({
        type:       "recovery",
        email:      player.email,
        options:    { redirectTo: `${siteUrl}/auth/callback` },
      });
      if (linkError) {
        console.error("[invite resend] generateLink failed:", linkError.message);
        throw linkError;
      }
      return Response.json({ ok: true, resent: true });
    }

    // ── First send: create account then send recovery (set-password) link ──
    const { data: created, error: createError } = await service.auth.admin.createUser({
      email:          player.email,
      email_confirm:  true,
      user_metadata:  { full_name: player.name },
    });

    if (createError || !created?.user) {
      console.error("[invite] createUser failed:", createError?.message);
      throw createError ?? new Error("Failed to create user");
    }

    const newUserId = created.user.id;

    // Create the users table record
    const { error: userInsertError } = await service.from("users").insert({
      id:        newUserId,
      tenant_id: adminRecord.tenant_id,
      role:      "Player",
      full_name: player.name,
    });
    if (userInsertError) throw userInsertError;

    // Link the player record to their new login account
    const { error: linkPlayerError } = await service
      .from("players")
      .update({ user_id: newUserId, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (linkPlayerError) throw linkPlayerError;

    // Send "Set your password" email via Supabase recovery link
    const { error: recoveryError } = await service.auth.admin.generateLink({
      type:    "recovery",
      email:   player.email,
      options: { redirectTo: `${siteUrl}/auth/callback` },
    });
    if (recoveryError) {
      // Non-fatal — account is created, admin can use Set Password instead
      console.error("[invite] generateLink recovery failed:", recoveryError.message);
    }

    console.log("[invite] created user and sent recovery link for", player.email);
    return Response.json({ ok: true, resent: false });
  } catch (err: unknown) {
    return apiError(err);
  }
}
