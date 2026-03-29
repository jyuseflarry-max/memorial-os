import { NextResponse } from "next/server";
import { getSupabaseUser, getSupabaseServer } from "@/lib/supabase/server";

// GET /api/conversations — list all conversations for the current user
export async function GET() {
  const supabase = await getSupabaseUser();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Get user's tenant
  const sb = getSupabaseServer();
  const { data: profile } = await sb.from("users").select("tenant_id").eq("id", user.id).single();
  if (!profile) return NextResponse.json({ error: "User not found" }, { status: 404 });

  // Get all conversation IDs the user participates in
  const { data: participations } = await sb
    .from("conversation_participants")
    .select("conversation_id, last_read_at")
    .eq("user_id", user.id)
    .eq("tenant_id", profile.tenant_id);

  if (!participations || participations.length === 0) {
    return NextResponse.json([]);
  }

  const convIds = participations.map((p) => p.conversation_id);

  // For each conversation, get participants + last message
  const { data: participants } = await sb
    .from("conversation_participants")
    .select("conversation_id, user_id")
    .in("conversation_id", convIds);

  const { data: lastMessages } = await sb
    .from("messages")
    .select("id, conversation_id, sender_id, body, created_at")
    .in("conversation_id", convIds)
    .eq("is_deleted", false)
    .order("created_at", { ascending: false });

  // Get unique user IDs from participants
  const allUserIds = [...new Set((participants ?? []).map((p) => p.user_id))];
  const { data: userProfiles } = await sb
    .from("users")
    .select("id, full_name, role")
    .in("id", allUserIds);

  const profileMap = Object.fromEntries((userProfiles ?? []).map((u) => [u.id, u]));

  // Build conversation objects
  const lastMsgMap: Record<string, typeof lastMessages extends (infer T)[] | null ? T : never> = {};
  for (const msg of lastMessages ?? []) {
    if (!lastMsgMap[msg.conversation_id]) lastMsgMap[msg.conversation_id] = msg;
  }

  const participantMap: Record<string, string[]> = {};
  for (const p of participants ?? []) {
    if (!participantMap[p.conversation_id]) participantMap[p.conversation_id] = [];
    participantMap[p.conversation_id].push(p.user_id);
  }

  const lastReadMap = Object.fromEntries(participations.map((p) => [p.conversation_id, p.last_read_at]));

  const conversations = convIds.map((id) => {
    const otherUserIds = (participantMap[id] ?? []).filter((uid) => uid !== user.id);
    const otherUsers = otherUserIds.map((uid) => profileMap[uid]).filter(Boolean);
    const lastMsg = lastMsgMap[id] ?? null;
    const lastReadAt = lastReadMap[id];
    const hasUnread = lastMsg && (!lastReadAt || lastMsg.created_at > lastReadAt) && lastMsg.sender_id !== user.id;

    return {
      id,
      participants: otherUsers,
      lastMessage: lastMsg,
      hasUnread,
    };
  });

  // Sort by last message date desc
  conversations.sort((a, b) => {
    const aTime = a.lastMessage?.created_at ?? "";
    const bTime = b.lastMessage?.created_at ?? "";
    return bTime.localeCompare(aTime);
  });

  return NextResponse.json(conversations);
}

// POST /api/conversations — find or create a 1:1 conversation with another user
export async function POST(req: Request) {
  const supabase = await getSupabaseUser();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { recipientId } = await req.json();
  if (!recipientId) return NextResponse.json({ error: "recipientId required" }, { status: 400 });

  const sb = getSupabaseServer();
  const { data: profile } = await sb.from("users").select("tenant_id").eq("id", user.id).single();
  if (!profile) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const tenantId = profile.tenant_id;

  // Check if a 1:1 conversation already exists between these two users
  const { data: myConvs } = await sb
    .from("conversation_participants")
    .select("conversation_id")
    .eq("user_id", user.id)
    .eq("tenant_id", tenantId);

  const myConvIds = (myConvs ?? []).map((c) => c.conversation_id);

  if (myConvIds.length > 0) {
    const { data: theirConvs } = await sb
      .from("conversation_participants")
      .select("conversation_id")
      .eq("user_id", recipientId)
      .in("conversation_id", myConvIds);

    if (theirConvs && theirConvs.length > 0) {
      // Return the first existing conversation
      return NextResponse.json({ id: theirConvs[0].conversation_id, existing: true });
    }
  }

  // Create new conversation
  const { data: conv, error: convErr } = await sb
    .from("conversations")
    .insert({ tenant_id: tenantId, created_by: user.id })
    .select("id")
    .single();

  if (convErr || !conv) return NextResponse.json({ error: "Failed to create conversation" }, { status: 500 });

  // Add both participants
  await sb.from("conversation_participants").insert([
    { conversation_id: conv.id, user_id: user.id, tenant_id: tenantId },
    { conversation_id: conv.id, user_id: recipientId, tenant_id: tenantId },
  ]);

  return NextResponse.json({ id: conv.id, existing: false });
}
