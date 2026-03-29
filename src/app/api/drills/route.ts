import { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { apiError } from "@/lib/api-error";
import { withIdempotency } from "@/lib/idempotency";

/**
 * GET /api/drills
 * Returns all drills ordered by name.
 */
export async function GET() {
  try {
    const db = await getDb();
    const { data, error } = await db.from("drills").select("*").order("name", { ascending: true });
    if (error) throw error;
    return Response.json(data);
  } catch (err: unknown) {
    return apiError(err);
  }
}

/**
 * POST /api/drills
 * Body: { name, categories, shot_density, shot_type, intensity, default_duration, session_position, coaching_notes, video_url, level, space, objectives }
 * Returns the inserted drill row.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, categories, shot_density, shot_type, intensity, default_duration, session_position, coaching_notes, video_url, level, space, objectives } = body;

    if (!name) {
      return Response.json({ error: "name is required" }, { status: 400 });
    }

    const db = await getDb();
    return withIdempotency(request, db.tenantId, async () => {
      const { data, error } = await db
        .insert("drills", {
          name,
          categories: categories ?? [],
          shot_density,
          shot_type,
          intensity,
          default_duration: default_duration ?? 10,
          session_position: session_position ?? null,
          coaching_notes: coaching_notes ?? null,
          video_url: video_url ?? "",
          level: level ?? null,
          space: space ?? null,
          objectives: objectives ?? [],
        })
        .select()
        .single();

      if (error) throw error;
      return Response.json(data, { status: 201 });
    });
  } catch (err: unknown) {
    return apiError(err);
  }
}
