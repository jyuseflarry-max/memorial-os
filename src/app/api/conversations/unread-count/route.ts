import { NextResponse } from "next/server";
import { getSupabaseUser, getSupabaseServer } from "@/lib/supabase/server";

/**
 * GET /api/conversations/unread-count
 * Returns { count: number } — the number of conversations with unread messages.
 *
 * This is a lightweight alternative to GET /api/conversations that the
 * unread badge uses. It runs 2 queries instead of 4 and skips the full
 * participant profile joins that the conversation list needs.
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

  // Q1: all conversations the user is in, with their last-read timestamp
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

  // Q2: latest message per conversation, from other users only.
  // Order DESC so the first occurrence per conv_id is the most recent.
  const { data: messages } = await sb
    .from("messages")
    .select("conversation_id, sender_id, created_at")
    .in("conversation_id", convIds)
    .eq("is_deleted", false)
    .neq("sender_id", user.id)
    .order("created_at", { ascending: false });

  // Keep only the newest message from others per conversation
  const latestByConv = new Map<string, string>(); // conv_id → created_at
  for (const msg of messages ?? []) {
    if (!latestByConv.has(msg.conversation_id)) {
      latestByConv.set(msg.conversation_id, msg.created_at);
    }
  }

  let count = 0;
  for (const convId of convIds) {
    const latestAt = latestByConv.get(convId);
    if (!latestAt) continue;
    const lastRead = lastReadMap[convId];
    if (!lastRead || latestAt > lastRead) count++;
  }

  return NextResponse.json({ count });
}
