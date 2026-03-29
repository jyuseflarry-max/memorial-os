import { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { apiError } from "@/lib/api-error";
import { withIdempotency } from "@/lib/idempotency";

/** GET /api/players — list all players ordered by jersey number */
export async function GET() {
  try {
    const db = await getDb();
    const { data, error } = await db.from("players").select("*").order("jersey_number", { ascending: true });
    if (error) throw error;
    return Response.json(data);
  } catch (err: unknown) {
    return apiError(err);
  }
}

/** POST /api/players — insert a single player, return the created row */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const db = await getDb();
    return withIdempotency(request, db.tenantId, async () => {
      const { data, error } = await db
        .insert("players", { ...body, updated_at: new Date().toISOString() })
        .select()
        .single();
      if (error) {
        if ((error as { code?: string }).code === "23505") {
          return Response.json({ error: "That jersey number is already taken on this team. Choose a different number." }, { status: 409 });
        }
        throw error;
      }
      return Response.json(data, { status: 201 });
    });
  } catch (err: unknown) {
    return apiError(err);
  }
}
