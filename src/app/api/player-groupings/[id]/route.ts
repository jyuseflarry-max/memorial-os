import { NextRequest } from "next/server";
import { getDb } from "@/lib/db";

/** PUT /api/player-groupings/[id] */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body    = await request.json();
    const db = await getDb();
    const { data, error } = await db
      .update("player_groupings", { name: body.name, groups: body.groups })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return Response.json(data);
  } catch (err: unknown) {
    return Response.json({ error: err instanceof Error ? err.message : "Unknown" }, { status: 500 });
  }
}

/** DELETE /api/player-groupings/[id] */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = await getDb();
    const { error } = await db.delete("player_groupings").eq("id", id);
    if (error) throw error;
    return new Response(null, { status: 204 });
  } catch (err: unknown) {
    return Response.json({ error: err instanceof Error ? err.message : "Unknown" }, { status: 500 });
  }
}
