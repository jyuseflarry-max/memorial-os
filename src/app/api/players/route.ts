import { NextRequest } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { apiError } from "@/lib/api-error";

/** GET /api/players — list all players ordered by jersey number */
export async function GET() {
  try {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from("players")
      .select("*")
      .order("jersey_number", { ascending: true });

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
    const supabase = getSupabaseServer();

    const { data, error } = await supabase
      .from("players")
      .insert([{ ...body, updated_at: new Date().toISOString() }])
      .select()
      .single();

    if (error) throw error;
    return Response.json(data, { status: 201 });
  } catch (err: unknown) {
    if (typeof err === "object" && err !== null && (err as Record<string, unknown>).code === "23505") {
      return Response.json({ error: "That jersey number is already taken on this team. Choose a different number." }, { status: 409 });
    }
    return apiError(err);
  }
}
