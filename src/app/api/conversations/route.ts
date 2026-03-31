import { NextResponse } from "next/server";
import { getDb }              from "@/lib/db";
import { apiError }           from "@/lib/api-error";
import { getSupabaseServer }  from "@/lib/supabase/server";
import { findOrCreate1on1 }   from "@/lib/conversations";

// GET /api/conversations — list all conversations for the current user
export async function GET() {
  const db = await getDb();
  const sb = getSupabaseServer();

  // Get all conversation IDs the user participates in
  const { data: participations } = await sb
    .from("conversation_participants")
    .select("conversation_id, last_read_at")
    .eq("user_id", db.userId)
    .eq("tenant_id", db.tenantId);

  if (!participations || participations.length === 0) {
    return NextResponse.json([]);
  }

  const convIds = participations.map((p) => p.conversation_id);

  // Fetch participants and last messages in parallel — both only depend on convIds
  const [{ data: participants }, { data: lastMessages }] = await Promise.all([
    sb
      .from("conversation_participants")
      .select("conversation_id, user_id")
      .in("conversation_id", convIds),
    sb
      .from("messages")
      .select("id, conversation_id, sender_id, body, created_at")
      .in("conversation_id", convIds)
      .eq("is_deleted", false)
      .order("created_at", { ascending: false }),
  ]);

  // Fetch user profiles for all participants (depends on participants result above)
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
    const otherUserIds = (participantMap[id] ?? []).filter((uid) => uid !== db.userId);
    const otherUsers = otherUserIds.map((uid) => profileMap[uid]).filter(Boolean);
    const lastMsg = lastMsgMap[id] ?? null;
    const lastReadAt = lastReadMap[id];
    const hasUnread = lastMsg && (!lastReadAt || lastMsg.created_at > lastReadAt) && lastMsg.sender_id !== db.userId;

    return {
      id,
      participants: otherUsers,
      lastMessage: lastMsg,
      hasUnread,
    };
  });

  // Sort by last message date desc
  conversations.sort((a, b) => {
    const aTime = a.lastMessage ? new Date(a.lastMessage.created_at).getTime() : 0;
    const bTime = b.lastMessage ? new Date(b.lastMessage.created_at).getTime() : 0;
    return bTime - aTime;
  });

  return NextResponse.json(conversations);
}

// POST /api/conversations
// 1:1:   { recipientId: string }
// Group: { recipientIds: string[], title: string }
export async function POST(req: Request) {
  const db   = await getDb();
  const sb   = getSupabaseServer();
  const body = await req.json();

  // ── Group conversation ──────────────────────────────────────────────────
  if (body.recipientIds) {
    const recipientIds: string[] = body.recipientIds;
    const title: string = body.title ?? "Group";

    const { data: conv, error: convErr } = await sb
      .from("conversations")
      .insert({ tenant_id: db.tenantId, created_by: db.userId, title })
      .select("id")
      .single();

    if (convErr || !conv) return apiError("Failed to create conversation", 500);

    const allIds = [db.userId, ...recipientIds.filter((id) => id !== db.userId)];
    await sb.from("conversation_participants").insert(
      allIds.map((uid) => ({ conversation_id: conv.id, user_id: uid, tenant_id: db.tenantId }))
    );

    return NextResponse.json({ id: conv.id, existing: false });
  }

  // ── 1:1 conversation — find existing or create ──────────────────────────
  const { recipientId } = body;
  if (!recipientId) return apiError("recipientId or recipientIds required", 400);

  const convId = await findOrCreate1on1(db.userId, recipientId, db.tenantId);
  if (!convId) return apiError("Failed to create conversation", 500);

  // Determine if the conversation already existed
  const { data: participants } = await sb
    .from("conversation_participants")
    .select("conversation_id")
    .eq("conversation_id", convId)
    .eq("user_id", db.userId);

  const existing = (participants?.length ?? 0) > 1;
  return NextResponse.json({ id: convId, existing });
}
