import { getSupabaseServer } from "@/lib/supabase/server";

/** GET /api/strength/exercises — full exercise library ordered by category then name */
export async function GET() {
  try {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from("exercise_library")
      .select("*")
      .order("category", { ascending: true })
      .order("name",     { ascending: true });

    if (error) throw error;
    return Response.json(data ?? []);
  } catch (err: unknown) {
    return Response.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}
