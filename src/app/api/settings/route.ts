import { NextRequest } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { DEFAULT_SETTINGS } from "@/types/settings";
import { apiError } from "@/lib/api-error";

/** GET /api/settings — fetch the singleton program_settings row */
export async function GET() {
  try {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from("program_settings")
      .select("*")
      .eq("id", "singleton")
      .single();

    if (error) {
      // Row may not exist yet; return defaults
      return Response.json(DEFAULT_SETTINGS);
    }
    return Response.json(data);
  } catch (err: unknown) {
    return apiError(err);
  }
}

/** PUT /api/settings — upsert the singleton program_settings row */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const supabase = getSupabaseServer();

    const { data, error } = await supabase
      .from("program_settings")
      .upsert(
        { id: "singleton", ...body, updated_at: new Date().toISOString() },
        { onConflict: "id" }
      )
      .select()
      .single();

    if (error) throw error;
    return Response.json(data);
  } catch (err: unknown) {
    return apiError(err);
  }
}
