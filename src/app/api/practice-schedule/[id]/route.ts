import { NextRequest, NextResponse } from "next/server";
import { getDb }    from "@/lib/db";
import { apiError } from "@/lib/api-error";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const db = await getDb();
    const { id } = await params;
    const body = await req.json();
    const { data, error } = await db
      .update("practice_schedule", body)
      .eq("id", id)
      .select("*, location:locations(*), facility:facilities(*)")
      .single();
    if (error) throw error;
    return NextResponse.json(data);
  } catch (err) {
    return apiError(err);
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const db = await getDb();
    const { id } = await params;
    const { error } = await db.delete("practice_schedule").eq("id", id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err) {
    return apiError(err);
  }
}
