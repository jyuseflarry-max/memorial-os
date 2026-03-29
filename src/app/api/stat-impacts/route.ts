import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { apiError } from "@/lib/api-error";

export async function GET() {
  try {
    const db = await getDb();
    const { data, error } = await db.from("stat_impacts").select("*").order("name");
    if (error) return NextResponse.json([], { status: 200 });
    return NextResponse.json(data ?? []);
  } catch (err: unknown) {
    return apiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const db   = await getDb();
    const body = await req.json();
    const { data, error } = await db.insert("stat_impacts", body).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  } catch (err: unknown) {
    return apiError(err);
  }
}
