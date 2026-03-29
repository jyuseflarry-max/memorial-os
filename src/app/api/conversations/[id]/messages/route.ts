import { NextResponse } from "next/server";
import { getSupabaseUser, getSupabaseServer } from "@/lib/supabase/server";

// GET /api/conversations/[id]/messages — fetch messages + mark read
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await getSupabaseUser();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sb = getSupabaseServer();

  // Verify user is a participant
  const { data: participation } = await sb
    .from("conversation_participants")
    .select("user_id")
    .eq("conversation_id", id)
    .eq("user_id", user.id)
    .single();

  if (!participation) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Fetch messages
  const { data: messages } = await sb
    .from("messages")
    .select("id, sender_id, body, created_at")
    .eq("conversation_id", id)
    .eq("is_deleted", false)
    .order("created_at", { ascending: true });

  // Get sender profiles
  const senderIds = [...new Set((messages ?? []).map((m) => m.sender_id))];
  const { data: profiles } = await sb
    .from("users")
    .select("id, full_name, role")
    .in("id", senderIds);

  const profileMap = Object.fromEntries((profiles ?? []).map((p) => [p.id, p]));
  const enriched = (messages ?? []).map((m) => ({ ...m, sender: profileMap[m.sender_id] ?? null }));

  // Mark as read
  await sb
    .from("conversation_participants")
    .update({ last_read_at: new Date().toISOString() })
    .eq("conversation_id", id)
    .eq("user_id", user.id);

  return NextResponse.json(enriched);
}

// POST /api/conversations/[id]/messages — send a message
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await getSupabaseUser();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { body } = await req.json();
  if (!body?.trim()) return NextResponse.json({ error: "Message body required" }, { status: 400 });

  const sb = getSupabaseServer();

  // Verify user is a participant
  const { data: participation } = await sb
    .from("conversation_participants")
    .select("tenant_id")
    .eq("conversation_id", id)
    .eq("user_id", user.id)
    .single();

  if (!participation) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data: message, error } = await sb
    .from("messages")
    .insert({
      conversation_id: id,
      tenant_id: participation.tenant_id,
      sender_id: user.id,
      body: body.trim(),
    })
    .select("id, sender_id, body, created_at")
    .single();

  if (error || !message) return NextResponse.json({ error: "Failed to send" }, { status: 500 });

  return NextResponse.json(message);
}
