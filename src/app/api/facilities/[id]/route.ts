import { NextRequest } from "next/server";
import { getSupabaseServer, getSupabaseUser } from "@/lib/supabase/server";
import { apiError } from "@/lib/api-error";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { name, sort_order } = await request.json();
    if (!name?.trim()) return apiError("name is required", 400);

    const userClient = await getSupabaseUser();
    const { data: { user: me } } = await userClient.auth.getUser();
    if (!me) return apiError("Not authenticated", 401);

    const service = getSupabaseServer();
    const { data: myRecord } = await service.from("users").select("tenant_id, role").eq("id", me.id).single();
    if (!myRecord) return apiError("User record not found", 403);
    if (!["Admin", "Coach", "Manager"].includes(myRecord.role)) return apiError("Forbidden", 403);

    const updates: Record<string, unknown> = { name: name.trim() };
    if (sort_order !== undefined) updates.sort_order = sort_order;

    const { data, error } = await service
      .from("facilities")
      .update(updates)
      .eq("id", id)
      .eq("tenant_id", myRecord.tenant_id)
      .select("*")
      .single();

    if (error) throw error;
    return Response.json(data);
  } catch (err) {
    return apiError(err);
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const userClient = await getSupabaseUser();
    const { data: { user: me } } = await userClient.auth.getUser();
    if (!me) return apiError("Not authenticated", 401);

    const service = getSupabaseServer();
    const { data: myRecord } = await service.from("users").select("tenant_id, role").eq("id", me.id).single();
    if (!myRecord) return apiError("User record not found", 403);
    if (!["Admin", "Coach", "Manager"].includes(myRecord.role)) return apiError("Forbidden", 403);

    const { error } = await service
      .from("facilities")
      .delete()
      .eq("id", id)
      .eq("tenant_id", myRecord.tenant_id);

    if (error) throw error;
    return Response.json({ ok: true });
  } catch (err) {
    return apiError(err);
  }
}
