import { NextRequest } from "next/server";
import { getDb }       from "@/lib/db";
import { apiError }    from "@/lib/api-error";
import { ROLE_STAFF }  from "@/lib/roles";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { name, sort_order } = await request.json();
    if (!name?.trim()) return apiError("name is required", 400);

    const db = await getDb();
    if (!ROLE_STAFF.includes(db.role)) return apiError("Forbidden", 403);

    const updates: Record<string, unknown> = { name: name.trim() };
    if (sort_order !== undefined) updates.sort_order = sort_order;

    const { data, error } = await db
      .update("facilities", updates)
      .eq("id", id)
      .select("id, tenant_id, name, sort_order, created_at")
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

    const db = await getDb();
    if (!ROLE_STAFF.includes(db.role)) return apiError("Forbidden", 403);

    const { error } = await db.delete("facilities").eq("id", id);

    if (error) throw error;
    return Response.json({ ok: true });
  } catch (err) {
    return apiError(err);
  }
}
