"use server";

import { getSupabaseServer, getSupabaseUser } from "@/lib/supabase/server";

// ── Update profile (full name) ─────────────────────────────────────────────

export async function updateProfile(
  _prev: { error?: string; success?: string } | null,
  formData: FormData
): Promise<{ error?: string; success?: string }> {
  const fullName = (formData.get("full_name") as string).trim();
  if (!fullName) return { error: "Name cannot be empty." };

  const userClient = await getSupabaseUser();
  const { data: { user }, error: authError } = await userClient.auth.getUser();
  if (authError || !user) return { error: "Not authenticated." };

  const { error } = await getSupabaseServer()
    .from("users")
    .update({ full_name: fullName })
    .eq("id", user.id);

  if (error) return { error: error.message };
  return { success: "Name updated." };
}

// ── Update password ────────────────────────────────────────────────────────

export async function updatePassword(
  _prev: { error?: string; success?: string } | null,
  formData: FormData
): Promise<{ error?: string; success?: string }> {
  const password    = formData.get("password")    as string;
  const confirmPass = formData.get("confirm")     as string;

  if (password.length < 8) return { error: "Password must be at least 8 characters." };
  if (password !== confirmPass) return { error: "Passwords do not match." };

  const userClient = await getSupabaseUser();
  const { error } = await userClient.auth.updateUser({ password });

  if (error) return { error: error.message };
  return { success: "Password updated." };
}
