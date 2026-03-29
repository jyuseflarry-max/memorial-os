import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { apiError } from "@/lib/api-error";

export async function GET() {
  try {
    const db = await getDb();
    const { data, error } = await db.from("locations")
      .select("*")
      .order("is_home_venue", { ascending: false })
      .order("name");
    if (error) throw error;
    return NextResponse.json(data ?? []);
  } catch (err: unknown) {
    return apiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const db = await getDb();
    const body = await req.json();
    const { data, error } = await db.insert("locations", body).select().single();
    if (error) throw error;
    return NextResponse.json(data);
  } catch (err: unknown) {
    return apiError(err);
  }
}
