"use server";

import { redirect } from "next/navigation";
import { getSupabaseServer, getSupabaseUser } from "@/lib/supabase/server";

// ── Login ──────────────────────────────────────────────────────────────────

export async function login(
  _prev: { error: string } | null,
  formData: FormData
): Promise<{ error: string }> {
  const email    = formData.get("email")    as string;
  const password = formData.get("password") as string;

  const supabase = await getSupabaseUser();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) return { error: error.message };

  redirect("/");
}

// ── Logout ─────────────────────────────────────────────────────────────────

export async function logout() {
  const supabase = await getSupabaseUser();
  await supabase.auth.signOut();
  redirect("/login");
}

// ── Register (creates tenant + admin user atomically) ─────────────────────

export async function register(
  _prev: { error: string } | null,
  formData: FormData
): Promise<{ error: string }> {
  const schoolName = formData.get("school_name")        as string;
  const tier       = formData.get("subscription_tier")  as string;
  const fullName   = formData.get("full_name")          as string;
  const email      = formData.get("email")              as string;
  const password   = formData.get("password")           as string;

  // Service role required — creating users and linking them to a tenant
  // must bypass RLS since no session exists yet at registration time.
  const serviceClient = getSupabaseServer();

  // 1. Create the Supabase Auth user
  const { data: authData, error: authError } =
    await serviceClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
  if (authError) return { error: authError.message };

  const userId = authData.user.id;

  // 2. Create the tenant (school)
  const { data: tenant, error: tenantError } = await serviceClient
    .from("tenants")
    .insert({ school_name: schoolName, subscription_tier: tier })
    .select("id")
    .single();

  if (tenantError) {
    await serviceClient.auth.admin.deleteUser(userId);
    return { error: tenantError.message };
  }

  // 3. Link the user to the tenant as Admin
  const { error: userError } = await serviceClient.from("users").insert({
    id:        userId,
    tenant_id: tenant.id,
    role:      "Admin",
    full_name: fullName,
  });

  if (userError) {
    await serviceClient.auth.admin.deleteUser(userId);
    await serviceClient.from("tenants").delete().eq("id", tenant.id);
    return { error: userError.message };
  }

  redirect("/login");
}
