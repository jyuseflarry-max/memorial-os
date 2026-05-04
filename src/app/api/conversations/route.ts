import { NextResponse } from "next/server";
import { getDb }              from "@/lib/db";
import { apiError }           from "@/lib/api-error";
import { getSupabaseServer }  from "@/lib/supabase/server";
import { findOrCreate1on1 }   from "@/lib/conversations";

// GET /api/conversations — list all conversations for the current user.
//
// Reads conversations.last_message_{at,preview,sender_id} directly instead
// of scanning every row in `messages`. The previous implementation returned
// O(total messages across all the user's threads), which was unbounded for
// staff in many group conversations. We now do four bounded queries:
//   Q1: participations (the user's threads + last_read_at)
//   Q2: conversations  (denorm columns, ordered by last_message_at)
//   Q3: participants   (other members per thread, for display)
//   Q4: profiles       (names/roles for those members)
// Q2-Q4 run in parallel since they only depend on convIds.
export async function GET() {
  const db = await getDb();
  const sb = getSupabaseServer();

  const { data: participations } = await sb
    .from("conversation_participants")
    .select("conversation_id, last_read_at")
    .eq("user_id", db.userId)
    .eq("tenant_id", db.tenantId);

  if (!participations || participations.length === 0) {
    return NextResponse.json([]);
  }

  const convIds = participations.map((p) => p.conversation_id);
  const lastReadMap = Object.fromEntries(
    participations.map((p) => [p.conversation_id, p.last_read_at])
  );

  const [{ data: convs }, { data: parts }] = await Promise.all([
    sb
      .from("conversations")
      .select("id, title, last_message_at, last_message_preview, last_message_sender_id")
      .in("id", convIds)
      .order("last_message_at", { ascending: false, nullsFirst: false }),
    sb
      .from("conversation_participants")
      .select("conversation_id, user_id")
      .in("conversation_id", convIds),
  ]);

  const allUserIds = [...new Set((parts ?? []).map((p) => p.user_id))];
  const { data: profiles } = await sb
    .from("users")
    .select("id, full_name, role")
    .in("id", allUserIds);

  const profileMap = Object.fromEntries((profiles ?? []).map((u) => [u.id, u]));

  const participantMap: Record<string, string[]> = {};
  for (const p of parts ?? []) {
    (participantMap[p.conversation_id] ??= []).push(p.user_id);
  }

  const conversations = (convs ?? []).map((c) => {
    const otherIds = (participantMap[c.id] ?? []).filter((uid) => uid !== db.userId);
    const others = otherIds.map((uid) => profileMap[uid]).filter(Boolean);
    const lastReadAt = lastReadMap[c.id];

    const lastMessage = c.last_message_at
      ? {
          body:        c.last_message_preview ?? "",
          created_at:  c.last_message_at,
          sender_id:   c.last_message_sender_id,
        }
      : null;

    const hasUnread =
      !!c.last_message_at
      && c.last_message_sender_id !== db.userId
      && (!lastReadAt || c.last_message_at > lastReadAt);

    return { id: c.id, participants: others, lastMessage, hasUnread };
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

  const { data: participants } = await sb
    .from("conversation_participants")
    .select("conversation_id")
    .eq("conversation_id", convId)
    .eq("user_id", db.userId);

  const existing = (participants?.length ?? 0) > 1;
  return NextResponse.json({ id: convId, existing });
}
