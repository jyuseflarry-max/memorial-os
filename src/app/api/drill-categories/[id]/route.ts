import { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { apiError } from "@/lib/api-error";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, color, is_rest } = body;

    const updates: Record<string, unknown> = {};
    if (name    !== undefined) updates.name    = name;
    if (color   !== undefined) updates.color   = color;
    if (is_rest !== undefined) updates.is_rest = is_rest;

    const db = await getDb();
    const { data, error } = await db.update("drill_categories", updates).eq("id", id).select().single();
    if (error) throw error;
    return Response.json(data);
  } catch (err: unknown) {
    return apiError(err);
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = await getDb();
    const { error } = await db.delete("drill_categories").eq("id", id);
    if (error) throw error;
    return Response.json({ ok: true });
  } catch (err: unknown) {
    return apiError(err);
  }
}
