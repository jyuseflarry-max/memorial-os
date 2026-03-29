import { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { apiError } from "@/lib/api-error";

type Params = { params: Promise<{ id: string }> };

/** PATCH /api/teams/[id] — rename a team */
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const body = await request.json();
    const db = await getDb();
    const { data, error } = await db
      .update("teams", { name: body.name })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return Response.json(data);
  } catch (err: unknown) {
    return apiError(err);
  }
}

/** DELETE /api/teams/[id] */
export async function DELETE(_: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const db = await getDb();
    const { error } = await db.delete("teams").eq("id", id);
    if (error) throw error;
    return new Response(null, { status: 204 });
  } catch (err: unknown) {
    return apiError(err);
  }
}
