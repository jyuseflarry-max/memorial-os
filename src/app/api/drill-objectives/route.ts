import { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { CATEGORY_PALETTE } from "@/lib/category-colors";
import { apiError } from "@/lib/api-error";

export async function GET() {
  try {
    const db = await getDb();
    const { data, error } = await db.from("drill_objectives").select("*").order("name", { ascending: true });
    if (error) throw error;
    return Response.json(data ?? []);
  } catch {
    return Response.json([]);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name } = await request.json();
    if (!name) return apiError("name is required", 400);

    const db = await getDb();

    const { data: existing } = await db.from("drill_objectives").select("color");
    const used = new Set((existing ?? []).map((r: { color: string }) => r.color));
    let color = CATEGORY_PALETTE.find((c) => !used.has(c)) ?? null;
    if (!color) {
      let h = 0;
      for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
      color = CATEGORY_PALETTE[h % CATEGORY_PALETTE.length];
    }

    const { data, error } = await db.insert("drill_objectives", { name, color }).select().single();
    if (error) throw error;
    return Response.json(data, { status: 201 });
  } catch (err: unknown) {
    return apiError(err);
  }
}
