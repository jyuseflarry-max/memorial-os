import { NextRequest } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { CATEGORY_PALETTE } from "@/lib/category-colors";

/**
 * GET /api/drill-categories
 * Returns all drill categories ordered by name.
 */
export async function GET() {
  try {
    const supabase = getSupabaseServer();
    const { data, error } = await supabase
      .from("drill_categories")
      .select("*")
      .order("name", { ascending: true });

    if (error) throw error;
    return Response.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/drill-categories
 * Body: { name: string, is_rest?: boolean }
 * Auto-assigns a contrasting color from CATEGORY_PALETTE.
 * Returns the inserted row.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, is_rest = false } = body;

    if (!name) {
      return Response.json({ error: "name is required" }, { status: 400 });
    }

    const supabase = getSupabaseServer();

    // Fetch existing colors to avoid duplicates
    const { data: existing, error: fetchError } = await supabase
      .from("drill_categories")
      .select("color");

    if (fetchError) throw fetchError;

    const usedColors = new Set((existing ?? []).map((r: { color: string }) => r.color));

    // Find first unused palette color, fallback to hash
    let color = CATEGORY_PALETTE.find((c) => !usedColors.has(c)) ?? null;

    if (!color) {
      // All palette colors used — deterministic hash fallback
      let h = 0;
      for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
      color = CATEGORY_PALETTE[h % CATEGORY_PALETTE.length];
    }

    const { data, error } = await supabase
      .from("drill_categories")
      .insert({ name, color, is_rest })
      .select()
      .single();

    if (error) throw error;
    return Response.json(data, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
