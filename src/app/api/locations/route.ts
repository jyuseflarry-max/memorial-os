import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";

export async function GET() {
  const sb = getSupabaseServer();
  const { data, error } = await sb.from("locations").select("*").order("is_home_venue", { ascending: false }).order("name");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const sb = getSupabaseServer();
  const body = await req.json();
  const { data, error } = await sb.from("locations").insert(body).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
