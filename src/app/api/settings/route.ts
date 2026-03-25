import { NextRequest } from "next/server";
import { getSupabaseServer, getSupabaseUser } from "@/lib/supabase/server";
import { DEFAULT_SETTINGS } from "@/types/settings";
import { apiError } from "@/lib/api-error";

async function getTenantId(): Promise<string | null> {
  try {
    const userClient = await getSupabaseUser();
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return null;
    const supabase = getSupabaseServer();
    const { data } = await supabase.from("users").select("tenant_id").eq("id", user.id).single();
    return data?.tenant_id ?? null;
  } catch {
    return null;
  }
}

/** GET /api/settings — fetch the tenant's program_settings row */
export async function GET() {
  try {
    const tenantId = await getTenantId();
    const supabase = getSupabaseServer();

    if (tenantId) {
      const { data, error } = await supabase
        .from("program_settings")
        .select("*")
        .eq("tenant_id", tenantId)
        .single();

      if (!error && data) return Response.json(data);
    }

    // Fallback: try legacy singleton row, then defaults
    const { data } = await supabase
      .from("program_settings")
      .select("*")
      .eq("id", "singleton")
      .single();

    return Response.json(data ?? DEFAULT_SETTINGS);
  } catch (err: unknown) {
    return apiError(err);
  }
}

/** PUT /api/settings — upsert the tenant's program_settings row */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const tenantId = await getTenantId();
    const supabase = getSupabaseServer();

    if (tenantId) {
      const { data, error } = await supabase
        .from("program_settings")
        .upsert(
          { tenant_id: tenantId, ...body, updated_at: new Date().toISOString() },
          { onConflict: "tenant_id" }
        )
        .select()
        .single();

      if (!error) return Response.json(data);
      // If tenant_id column doesn't exist yet, fall through to legacy path
      if (!error.message?.includes("tenant_id")) throw error;
    }

    // Legacy fallback: singleton row (single-tenant installs)
    const { data, error } = await supabase
      .from("program_settings")
      .upsert(
        { id: "singleton", ...body, updated_at: new Date().toISOString() },
        { onConflict: "id" }
      )
      .select()
      .single();

    if (error) throw error;
    return Response.json(data);
  } catch (err: unknown) {
    return apiError(err);
  }
}
