import { NextRequest, NextResponse } from "next/server";
import { getDb }    from "@/lib/db";
import { apiError } from "@/lib/api-error";

export interface StrengthScheduleEntry {
  id:            string;
  tenant_id:     string;
  team_id:       string | null;
  schedule_date: string;
  start_time:    string;
  end_time:      string;
  program_id:    string | null;
  program_week:  number | null;
  program_day:   number | null;
  facility_id:   string | null;
  notes:         string | null;
  created_at:    string;
  // joined
  program?:  { id: string; name: string; phase: string | null } | null;
  facility?: { id: string; name: string } | null;
}

export async function GET(req: NextRequest) {
  try {
    const db = await getDb();
    const { searchParams } = new URL(req.url);
    const teamId = searchParams.get("team_id");
    const from   = searchParams.get("from");
    const to     = searchParams.get("to");

    let q = db
      .from("strength_schedule")
      .select("*, program:strength_programs(id,name,phase), facility:facilities(id,name)")
      .order("schedule_date")
      .order("start_time");

    if (teamId) q = q.eq("team_id", teamId);
    if (from)   q = q.gte("schedule_date", from);
    if (to)     q = q.lte("schedule_date", to);

    const { data, error } = await q;
    if (error) throw error;
    return NextResponse.json(data ?? []);
  } catch (err) {
    return apiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const db   = await getDb();
    const body = await req.json();
    const { data, error } = await db
      .insert("strength_schedule", body)
      .select("*, program:strength_programs(id,name,phase), facility:facilities(id,name)")
      .single();
    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    return apiError(err);
  }
}
