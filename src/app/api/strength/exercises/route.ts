import { getDb } from "@/lib/db";
import { getSupabaseServer } from "@/lib/supabase/server";
import { apiError } from "@/lib/api-error";

/** GET /api/strength/exercises — full exercise library ordered by category then name */
export async function GET() {
  try {
    // Authenticate via DAL; exercise_library is a global table (no tenant_id column)
    await getDb();
    const sb = getSupabaseServer();
    const { data, error } = await sb
      .from("exercise_library")
      .select("*")
      .order("category", { ascending: true })
      .order("name",     { ascending: true });

    if (error) throw error;
    return Response.json(data ?? []);
  } catch (err: unknown) {
    return apiError(err);
  }
}
