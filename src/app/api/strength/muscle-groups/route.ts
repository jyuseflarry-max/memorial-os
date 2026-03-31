import { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { getSupabaseServer } from "@/lib/supabase/server";
import { apiError } from "@/lib/api-error";
import { ROLE_COACH } from "@/lib/roles";

export async function GET() {
  try {
    const db = await getDb();
    const sb = getSupabaseServer();
    const { data, error } = await sb
      .from("strength_muscle_groups")
      .select("id, tenant_id, name, body_region, created_at")
      .or(`tenant_id.is.null,tenant_id.eq.${db.tenantId}`)
      .order("body_region")
      .order("name");
    if (error) throw error;
    return Response.json(data ?? []);
  } catch (err) { return apiError(err); }
}

export async function POST(req: NextRequest) {
  try {
    const db = await getDb();
    if (!ROLE_COACH.includes(db.role)) return apiError("Forbidden", 403);
    const { name, body_region } = await req.json();
    if (!name?.trim()) return apiError("Name is required", 400);
    const { data, error } = await db
      .insert("strength_muscle_groups", { name: name.trim(), body_region: body_region ?? null })
      .select()
      .single();
    if (error) throw error;
    return Response.json(data, { status: 201 });
  } catch (err) { return apiError(err); }
}
