import { NextRequest, NextResponse } from "next/server";
import { getDb }      from "@/lib/db";
import { apiError }   from "@/lib/api-error";
import { ROLE_COACH } from "@/lib/roles";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const db = await getDb();
    const { id } = await params;
    const { data, error } = await db
      .from("strength_programs")
      .select("id, name, description, weeks, phase, blocks, created_at, updated_at")
      .eq("id", id)
      .single();
    if (error) throw error;
    if (!data) return apiError("Not found", 404);
    return NextResponse.json(data);
  } catch (err) {
    return apiError(err);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const db = await getDb();
    if (!ROLE_COACH.includes(db.role)) return apiError("Forbidden", 403);
    const { id } = await params;
    const body = await req.json();
    const { data, error } = await db
      .update("strength_programs", { ...body, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select("id, name, description, weeks, phase, blocks, created_at, updated_at")
      .single();
    if (error) throw error;
    return NextResponse.json(data);
  } catch (err) {
    return apiError(err);
  }
}
