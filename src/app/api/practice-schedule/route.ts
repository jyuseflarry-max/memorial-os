import { NextRequest, NextResponse } from "next/server";
import { getDb }    from "@/lib/db";
import { apiError } from "@/lib/api-error";

export async function GET(req: NextRequest) {
  try {
    const db = await getDb();
    const { searchParams } = new URL(req.url);
    const teamId = searchParams.get("team_id");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    let q = db.from("practice_schedule").select("*, location:locations(*), facility:facilities(*)").order("practice_date").order("start_time");
    if (teamId) q = q.eq("team_id", teamId);
    if (from) q = q.gte("practice_date", from);
    if (to) q = q.lte("practice_date", to);

    const { data, error } = await q;
    if (error) throw error;
    return NextResponse.json(data ?? []);
  } catch (err) {
    return apiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const db = await getDb();
    const body = await req.json();
    const { data, error } = await db.insert("practice_schedule", body).select("*, location:locations(*), facility:facilities(*)").single();
    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    return apiError(err);
  }
}
