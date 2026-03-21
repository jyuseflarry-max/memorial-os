import { getSupabaseServer } from "@/lib/supabase/server";

/**
 * GET /api/vibe-checks/history
 * Returns ALL vibe_check rows grouped by player_id:
 * { [player_id]: VibeCheckRow[] }  (newest first per player)
 */
export async function GET() {
  try {
    const supabase = getSupabaseServer();

    const { data, error } = await supabase
      .from("vibe_checks")
      .select("*")
      .order("submitted_at", { ascending: false });

    if (error) throw error;

    const grouped: Record<string, typeof data> = {};
    for (const row of data) {
      if (!grouped[row.player_id]) grouped[row.player_id] = [];
      grouped[row.player_id].push(row);
    }

    return Response.json(grouped);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
