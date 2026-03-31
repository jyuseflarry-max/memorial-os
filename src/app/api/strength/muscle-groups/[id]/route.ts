import { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { apiError } from "@/lib/api-error";
import { ROLE_COACH } from "@/lib/roles";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const db = await getDb();
    if (!ROLE_COACH.includes(db.role)) return apiError("Forbidden", 403);
    const { id } = await params;
    const body = await req.json();
    const { data, error } = await db.update("strength_muscle_groups", body).eq("id", id).select().single();
    if (error) throw error;
    return Response.json(data);
  } catch (err) { return apiError(err); }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const db = await getDb();
    if (!ROLE_COACH.includes(db.role)) return apiError("Forbidden", 403);
    const { id } = await params;
    const { error } = await db.delete("strength_muscle_groups").eq("id", id);
    if (error) throw error;
    return new Response(null, { status: 204 });
  } catch (err) { return apiError(err); }
}
