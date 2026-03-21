import { NextRequest } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";

/** GET /api/sessions/[date] — fetch one session by date (YYYY-MM-DD) */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ date: string }> }
) {
  try {
    const { date } = await params;
    const supabase = getSupabaseServer();

    const { data, error } = await supabase
      .from("sessions")
      .select("*")
      .eq("date", date)
      .single();

    if (error) {
      // PGRST116 = no rows found — not a server error
      if ((error as { code?: string }).code === "PGRST116") {
        return Response.json(null);
      }
      throw error;
    }
    return Response.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}

/** DELETE /api/sessions/[date] — remove a saved session */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ date: string }> }
) {
  try {
    const { date } = await params;
    const supabase = getSupabaseServer();

    const { error } = await supabase.from("sessions").delete().eq("date", date);
    if (error) throw error;
    return new Response(null, { status: 204 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
