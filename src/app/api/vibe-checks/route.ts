import { getSupabaseServer } from "@/lib/supabase/server";

/**
 * GET /api/vibe-checks
 * Returns the most recent vibe_check row per player as
 * { [player_id]: VibeCheckRow }
 */
export async function GET() {
  try {
    const supabase = getSupabaseServer();

    const { data, error } = await supabase
      .from("vibe_checks")
      .select("*")
      .order("submitted_at", { ascending: false });

    if (error) throw error;

    // Keep only the latest submission per player
    const latest = new Map<string, (typeof data)[number]>();
    for (const row of data) {
      if (!latest.has(row.player_id)) latest.set(row.player_id, row);
    }

    return Response.json(Object.fromEntries(latest));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
