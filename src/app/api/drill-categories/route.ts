import { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { CATEGORY_PALETTE } from "@/lib/category-colors";
import { apiError } from "@/lib/api-error";

export async function GET() {
  try {
    const db = await getDb();
    const { data, error } = await db.from("drill_categories").select("*").order("name", { ascending: true });
    if (error) throw error;
    return Response.json(data);
  } catch (err: unknown) {
    return apiError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, is_rest = false } = body;
    if (!name) return Response.json({ error: "name is required" }, { status: 400 });

    const db = await getDb();

    const { data: existing, error: fetchError } = await db.from("drill_categories").select("color");
    if (fetchError) throw fetchError;

    const usedColors = new Set((existing ?? []).map((r: { color: string }) => r.color));
    let color = CATEGORY_PALETTE.find((c) => !usedColors.has(c)) ?? null;
    if (!color) {
      let h = 0;
      for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
      color = CATEGORY_PALETTE[h % CATEGORY_PALETTE.length];
    }

    const { data, error } = await db.insert("drill_categories", { name, color, is_rest }).select().single();
    if (error) throw error;
    return Response.json(data, { status: 201 });
  } catch (err: unknown) {
    return apiError(err);
  }
}
