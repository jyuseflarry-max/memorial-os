/**
 * POST /api/onboarding
 *
 * Creates a fully isolated tenant + admin user in one atomic operation.
 * Accepts multipart/form-data so the logo file can be streamed directly
 * to Supabase Storage without a base64 round-trip.
 *
 * STORAGE NOTE
 * ────────────
 * Requires a `logos` bucket in your Supabase project.
 * Create it at: Storage → New bucket → Name: "logos" → Public: true
 * (Public allows the logo_url to be served without auth tokens.)
 *
 * ROLLBACK STRATEGY
 * ─────────────────
 * Each step is guarded. If step N fails, all previous steps are undone:
 *   1. Create auth user
 *   2. Create tenant row
 *   3. Upload logo            ← non-fatal; failure skips logo, does not abort
 *   4. Seed program_settings  ← non-fatal; user can configure in Settings
 *   5. Insert users row       ← fatal; rolls back 1+2+(3 if uploaded)
 */

import { NextRequest } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { apiError } from "@/lib/api-error";

const LOGO_BUCKET = "logos";
const MAX_LOGO_BYTES = 2 * 1024 * 1024; // 2 MB

export async function POST(request: NextRequest) {
  const sb = getSupabaseServer();

  // Track resources created so we can roll them back on failure
  let userId: string | null = null;
  let tenantId: string | null = null;
  let logoStoragePath: string | null = null;

  try {
    // ── 0. Parse & validate ────────────────────────────────────────────────
    const fd = await request.formData();
    const programName  = (fd.get("program_name")  as string | null)?.trim();
    const fullName     = (fd.get("full_name")      as string | null)?.trim();
    const email        = (fd.get("email")          as string | null)?.trim().toLowerCase();
    const password     = fd.get("password")        as string | null;
    const primaryColor = (fd.get("primary_color")  as string | null)?.trim() ?? "#ED1C24";
    const logoFile     = fd.get("logo")            as File | null;

    if (!programName)                       return error400("Program name is required");
    if (!fullName)                          return error400("Full name is required");
    if (!email || !email.includes("@"))     return error400("A valid email is required");
    if (!password || password.length < 8)   return error400("Password must be at least 8 characters");
    if (!/^#[0-9a-fA-F]{6}$/.test(primaryColor)) return error400("Invalid brand color — use hex format e.g. #ED1C24");
    if (logoFile && logoFile.size > MAX_LOGO_BYTES) return error400("Logo must be under 2 MB");

    // ── 1. Create Supabase Auth user ───────────────────────────────────────
    // Service role required — no session exists yet at registration time.
    const { data: authData, error: authError } = await sb.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // skip confirmation email; admin accounts are trusted
    });
    if (authError) {
      // Surface friendly duplicate-email message instead of Postgres internals
      if (authError.message.includes("already been registered")) {
        return error400("An account with that email already exists.");
      }
      return error400(authError.message);
    }
    userId = authData.user.id;

    // ── 2. Create tenant row ───────────────────────────────────────────────
    const { data: tenant, error: tenantError } = await sb
      .from("tenants")
      .insert({ school_name: programName, subscription_tier: "trial" })
      .select("id")
      .single();

    if (tenantError || !tenant) {
      await rollbackAuth(sb, userId);
      return error500(tenantError?.message ?? "Failed to create tenant");
    }
    tenantId = tenant.id;

    // ── 3. Upload logo (non-fatal) ─────────────────────────────────────────
    // The file is tagged with tenant_id in storage metadata so that storage
    // policies can enforce tenant isolation at the bucket level.
    let logoUrl: string | null = null;

    if (logoFile && logoFile.size > 0) {
      const ext  = (logoFile.name.split(".").pop() ?? "png").toLowerCase();
      const path = `${tenantId}/logo.${ext}`;

      const { error: uploadError } = await sb.storage
        .from(LOGO_BUCKET)
        .upload(path, logoFile, {
          upsert: true,
          contentType: logoFile.type || "image/png",
          // Security: every file is tagged with its owner tenant so a future
          // storage RLS policy can enforce "only this tenant can read/write here"
          metadata: { tenant_id: tenantId },
        });

      if (uploadError) {
        // Non-fatal — the `logos` bucket may not exist yet in dev/staging.
        // The user can upload a logo from Settings after signing in.
        console.warn(`[onboarding] Logo upload skipped: ${uploadError.message}`);
      } else {
        logoStoragePath = path;
        const { data: { publicUrl } } = sb.storage.from(LOGO_BUCKET).getPublicUrl(path);
        logoUrl = publicUrl;
      }
    }

    // ── 4. Seed program_settings (non-fatal) ──────────────────────────────
    // Pre-populates the tenant's settings row so the app is branded from
    // first login. Upsert is safe to re-run if onboarding is retried.
    await sb
      .from("program_settings")
      .upsert(
        {
          tenant_id:          tenantId,
          program_name:       programName,
          primary_color:      primaryColor,
          primary_color_dark: darkenHex(primaryColor),
          logo_url:           logoUrl,
          updated_at:         new Date().toISOString(),
        },
        { onConflict: "tenant_id" }
      )
      .then(({ error }) => {
        if (error) console.warn(`[onboarding] Settings seed failed: ${error.message}`);
      });

    // ── 5. Link user to tenant (fatal if fails) ───────────────────────────
    const { error: userError } = await sb.from("users").insert({
      id:        userId,
      tenant_id: tenantId,
      role:      "Admin",
      full_name: fullName,
    });

    if (userError) {
      await rollbackAuth(sb, userId!);
      await rollbackTenant(sb, tenantId!);
      if (logoStoragePath) await rollbackLogo(sb, logoStoragePath);
      return error500(userError.message);
    }

    // ── Done ───────────────────────────────────────────────────────────────
    return Response.json(
      { success: true, tenantId, programName, primaryColor, logoUrl },
      { status: 201 }
    );

  } catch (err: unknown) {
    // Best-effort cleanup — order matters: users row wasn't created yet at
    // this point (it's the last step), so only auth + tenant + logo need undo.
    const cleanup = getSupabaseServer();
    if (userId)          await cleanup.auth.admin.deleteUser(userId).catch(() => {});
    if (tenantId)        { try { await cleanup.from("tenants").delete().eq("id", tenantId); } catch {} }
    if (logoStoragePath) await cleanup.storage.from(LOGO_BUCKET).remove([logoStoragePath]).catch(() => {});
    return apiError(err);
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────

function error400(message: string) {
  return Response.json({ error: message }, { status: 400 });
}

function error500(message: string) {
  return Response.json({ error: message }, { status: 500 });
}

async function rollbackAuth(sb: ReturnType<typeof getSupabaseServer>, userId: string) {
  await sb.auth.admin.deleteUser(userId).catch(() => {});
}

async function rollbackTenant(sb: ReturnType<typeof getSupabaseServer>, tenantId: string) {
  try { await sb.from("tenants").delete().eq("id", tenantId); } catch {}
}

async function rollbackLogo(sb: ReturnType<typeof getSupabaseServer>, path: string) {
  await sb.storage.from(LOGO_BUCKET).remove([path]).catch(() => {});
}

/**
 * Darken a hex color by ~15% for the primary_color_dark companion field.
 * Used so the hover/pressed state of buttons is pre-computed at onboarding time.
 */
function darkenHex(hex: string): string {
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return "#C01920";
  const r = Math.max(0, parseInt(hex.slice(1, 3), 16) - 38);
  const g = Math.max(0, parseInt(hex.slice(3, 5), 16) - 38);
  const b = Math.max(0, parseInt(hex.slice(5, 7), 16) - 38);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}
