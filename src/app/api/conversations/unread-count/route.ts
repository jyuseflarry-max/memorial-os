import { NextResponse } from "next/server";
import { getSupabaseUser, getSupabaseServer } from "@/lib/supabase/server";

/**
 * GET /api/conversations/unread-count
 * Returns { count: number } — number of conversations with an unread message.
 *
 * Now reads conversations.last_message_{at,sender_id} directly. The previous
 * implementation scanned the messages table for every conversation the user
 * was in; this version is two bounded queries regardless of message volume.
 */
export async function GET() {
  const userClient = await getSupabaseUser();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ count: 0 });

  const sb = getSupabaseServer();
  const { data: profile } = await sb
    .from("users")
    .select("tenant_id")
    .eq("id", user.id)
    .single();
  if (!profile) return NextResponse.json({ count: 0 });

  const { data: participations } = await sb
    .from("conversation_participants")
    .select("conversation_id, last_read_at")
    .eq("user_id", user.id)
    .eq("tenant_id", profile.tenant_id);

  if (!participations?.length) return NextResponse.json({ count: 0 });

  const convIds = participations.map((p) => p.conversation_id);
  const lastReadMap = Object.fromEntries(
    participations.map((p) => [p.conversation_id, p.last_read_at])
  );

  const { data: convs } = await sb
    .from("conversations")
    .select("id, last_message_at, last_message_sender_id")
    .in("id", convIds);

  let count = 0;
  for (const c of convs ?? []) {
    if (!c.last_message_at) continue;
    if (c.last_message_sender_id === user.id) continue;
    const lastRead = lastReadMap[c.id];
    if (!lastRead || c.last_message_at > lastRead) count++;
  }

  return NextResponse.json({ count });
}
