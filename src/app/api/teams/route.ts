import { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { apiError } from "@/lib/api-error";

/** GET /api/teams — all teams ordered by name */
export async function GET() {
  try {
    const db = await getDb();
    const { data, error } = await db.from("teams").select("*").order("name", { ascending: true });
    if (error) throw error;
    return Response.json(data);
  } catch (err: unknown) {
    return apiError(err);
  }
}

/** POST /api/teams — create a team */
export async function POST(request: NextRequest) {
  try {
    const { name } = await request.json();
    if (!name?.trim()) return Response.json({ error: "Name is required" }, { status: 400 });

    const db = await getDb();
    const { data, error } = await db
      .insert("teams", { name: name.trim() })
      .select()
      .single();
    if (error) {
      if (error.code === "23505") return Response.json({ error: "A team with that name already exists." }, { status: 409 });
      throw error;
    }
    return Response.json(data, { status: 201 });
  } catch (err: unknown) {
    return apiError(err);
  }
}
