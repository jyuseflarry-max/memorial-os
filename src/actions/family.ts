"use server";

import { redirect } from "next/navigation";
import { getSupabaseServer, getSupabaseUser } from "@/lib/supabase/server";

const RELATIONSHIPS = ["Parent", "Guardian", "Grandparent", "Other"] as const;

/** Register a new Family user and link them to a player in one step. */
export async function registerFamily(
  _prev: { error: string } | null,
  formData: FormData
): Promise<{ error: string }> {
  const fullName     = (formData.get("full_name") as string)?.trim();
  const email        = (formData.get("email")     as string)?.trim();
  const password     = formData.get("password")    as string;
  const playerId     = formData.get("player_id")   as string;
  const relationship = (formData.get("relationship") as string) || "Parent";

  if (!fullName || !email || !password || !playerId) {
    return { error: "All fields are required." };
  }
  if (password.length < 6) {
    return { error: "Password must be at least 6 characters." };
  }
  if (!RELATIONSHIPS.includes(relationship as (typeof RELATIONSHIPS)[number])) {
    return { error: "Invalid relationship." };
  }

  const service = getSupabaseServer();

  // Resolve the player's tenant
  const { data: player } = await service
    .from("players")
    .select("id, name, tenant_id")
    .eq("id", playerId)
    .single();

  if (!player)            return { error: "Player not found." };
  if (!player.tenant_id)  return { error: "Player is not associated with a program." };

  // Create Supabase auth user
  const { data: authData, error: authError } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (authError) return { error: authError.message };

  const userId = authData.user.id;

  // Create app-level users row (role = Family)
  const { error: userError } = await service.from("users").insert({
    id:        userId,
    tenant_id: player.tenant_id,
    role:      "Family",
    full_name: fullName,
  });
  if (userError) {
    await service.auth.admin.deleteUser(userId);
    return { error: userError.message };
  }

  // Link to player
  const { error: linkError } = await service.from("family_player_links").insert({
    family_id:        userId,
    player_id:        playerId,
    relationship_tag: relationship,
    tenant_id:        player.tenant_id,
  });
  if (linkError) {
    await service.auth.admin.deleteUser(userId);
    return { error: linkError.message };
  }

  // Auto-sign-in the new family user
  const userClient = await getSupabaseUser();
  const { error: signInError } = await userClient.auth.signInWithPassword({ email, password });
  if (signInError) {
    // Account created but sign-in failed — send them to login
    redirect("/login");
  }

  redirect("/family");
}
