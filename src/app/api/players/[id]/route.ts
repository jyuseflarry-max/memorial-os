import { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { apiError } from "@/lib/api-error";

/** PATCH /api/players/[id] — partial update, returns updated row */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const db = await getDb();
    const { data, error } = await db
      .update("players", { ...body, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return Response.json(data);
  } catch (err: unknown) {
    return apiError(err);
  }
}

/** DELETE /api/players/[id] — remove player row */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = await getDb();
    const { error } = await db.delete("players").eq("id", id);
    if (error) throw error;
    return new Response(null, { status: 204 });
  } catch (err: unknown) {
    return apiError(err);
  }
}
