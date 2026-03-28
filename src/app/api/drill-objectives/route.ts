import { NextRequest } from "next/server";
import { getSupabaseServer, getSupabaseUser } from "@/lib/supabase/server";
import { CATEGORY_PALETTE } from "@/lib/category-colors";
import { apiError } from "@/lib/api-error";

export async function GET() {
  try {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from("drill_objectives")
      .select("*")
      .order("name", { ascending: true });
    if (error) throw error;
    return Response.json(data ?? []);
  } catch {
    // Table may not exist yet — return empty array so client falls back to defaults
    return Response.json([]);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name } = await request.json();
    if (!name) return apiError("name is required", 400);

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

    // Pick an unused color
    const { data: existing } = await supabase
      .from("drill_objectives")
      .select("color")
      .eq("tenant_id", myRecord.tenant_id);
    const used = new Set((existing ?? []).map((r: { color: string }) => r.color));
    let color = CATEGORY_PALETTE.find((c) => !used.has(c)) ?? null;
    if (!color) {
      let h = 0;
      for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
      color = CATEGORY_PALETTE[h % CATEGORY_PALETTE.length];
    }

    const { data, error } = await supabase
      .from("drill_objectives")
      .insert({ name, color, tenant_id: myRecord.tenant_id })
      .select()
      .single();
    if (error) throw error;
    return Response.json(data, { status: 201 });
  } catch (err: unknown) {
    return apiError(err);
  }
}
