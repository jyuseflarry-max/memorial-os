import { NextRequest } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";

/** GET /api/sessions — list all saved sessions (date + drill count only) */
export async function GET() {
  try {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from("sessions")
      .select("id, date, start_time, drills")
      .order("date", { ascending: true });

    if (error) throw error;
    return Response.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}

/** POST /api/sessions — upsert a session by date */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { date, start_time, drills } = body;

    if (!date) return Response.json({ error: "date is required" }, { status: 400 });

    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from("sessions")
      .upsert({ date, start_time, drills, updated_at: new Date().toISOString() }, { onConflict: "date" })
      .select()
      .single();

    if (error) throw error;
    return Response.json(data, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
