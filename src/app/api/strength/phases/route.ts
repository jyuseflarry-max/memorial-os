import { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { apiError } from "@/lib/api-error";

/** GET /api/strength/phases — all phases ordered by created_at desc */
export async function GET() {
  try {
    const db = await getDb();
    const { data, error } = await db
      .from("strength_phases")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return Response.json(data ?? []);
  } catch (err: unknown) {
    return apiError(err);
  }
}

/** POST /api/strength/phases — create a new phase */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const db = await getDb();

    const { data, error } = await db
      .insert("strength_phases", {
        name:        body.name ?? "New Phase",
        description: body.description ?? null,
        blocks:      [],
        updated_at:  new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return Response.json(data, { status: 201 });
  } catch (err: unknown) {
    return apiError(err);
  }
}
