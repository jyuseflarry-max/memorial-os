import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { apiError } from "@/lib/api-error";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const db   = await getDb();
    const { id } = await params;
    const body = await req.json();
    const { data, error } = await db.update("stat_impacts", body).eq("id", id).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (err: unknown) {
    return apiError(err);
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const db   = await getDb();
    const { id } = await params;
    const { error } = await db.delete("stat_impacts").eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return apiError(err);
  }
}
