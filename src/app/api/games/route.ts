import { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { apiError } from "@/lib/api-error";

/** GET /api/games?team_id=xxx — list games ordered by date */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const teamId = searchParams.get("team_id");
    const season  = searchParams.get("season");

    const db = await getDb();
    let query = db.from("games")
      .select("*")
      .order("game_date", { ascending: true })
      .order("game_time", { ascending: true, nullsFirst: true });

    if (teamId) query = query.eq("team_id", teamId);
    if (season)  query = query.eq("season", season);

    const { data, error } = await query;
    if (error) throw error;
    return Response.json(data);
  } catch (err: unknown) {
    return apiError(err);
  }
}

/** POST /api/games — create a new game */
export async function POST(request: NextRequest) {
  try {
    const db   = await getDb();
    const body = await request.json();

    const { data, error } = await db
      .insert("games", { ...body, updated_at: new Date().toISOString() })
      .select()
      .single();

    if (error) throw error;
    return Response.json(data, { status: 201 });
  } catch (err: unknown) {
    return apiError(err);
  }
}
