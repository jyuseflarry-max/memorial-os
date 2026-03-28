import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const sb = getSupabaseServer();
  const { searchParams } = new URL(req.url);
  const teamId = searchParams.get("team_id");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  let q = sb.from("practice_schedule").select("*, location:locations(*)").order("practice_date").order("start_time");
  if (teamId) q = q.eq("team_id", teamId);
  if (from) q = q.gte("practice_date", from);
  if (to) q = q.lte("practice_date", to);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const sb = getSupabaseServer();
  const body = await req.json();
  const { data, error } = await sb.from("practice_schedule").insert(body).select("*, location:locations(*)").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
