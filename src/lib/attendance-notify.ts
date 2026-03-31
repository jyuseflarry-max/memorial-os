/**
 * Sends an auto-message to a player when a coach marks their attendance status.
 * Uses the existing conversations system.
 *
 * Silently no-ops if the player has no linked user account (no push possible).
 */
import { getSupabaseServer } from "@/lib/supabase/server";

interface NotifyParams {
  tenantId:    string;
  fromUserId:  string;   // coach / staff user id
  playerId:    string;   // players.id
  practiceDate: string;  // YYYY-MM-DD
  eventType:   "practice" | "game";
  status:      "excused" | "unexcused";
  notes:       string | null;
  makeupWork:  string;   // from attendance_consequences
}

export async function notifyAttendanceStatus(p: NotifyParams): Promise<void> {
  const sb = getSupabaseServer();

  // Resolve the player's linked user account
  const { data: player } = await sb
    .from("players")
    .select("user_id, full_name")
    .eq("id", p.playerId)
    .eq("tenant_id", p.tenantId)
    .single();

  if (!player?.user_id) return; // no user account — skip

  const toUserId = player.user_id as string;

  // Find or create a 1:1 conversation between coach and player
  const { data: myConvs } = await sb
    .from("conversation_participants")
    .select("conversation_id")
    .eq("user_id", p.fromUserId)
    .eq("tenant_id", p.tenantId);

  const myConvIds = (myConvs ?? []).map((c) => c.conversation_id);

  let convId: string | null = null;

  if (myConvIds.length > 0) {
    const { data: theirConvs } = await sb
      .from("conversation_participants")
      .select("conversation_id")
      .eq("user_id", toUserId)
      .in("conversation_id", myConvIds);

    convId = theirConvs?.[0]?.conversation_id ?? null;
  }

  if (!convId) {
    const { data: newConv, error } = await sb
      .from("conversations")
      .insert({ tenant_id: p.tenantId, created_by: p.fromUserId })
      .select("id")
      .single();

    if (error || !newConv) return;
    convId = newConv.id;

    await sb.from("conversation_participants").insert([
      { conversation_id: convId, user_id: p.fromUserId, tenant_id: p.tenantId },
      { conversation_id: convId, user_id: toUserId,     tenant_id: p.tenantId },
    ]);
  }

  // Build the message body
  const dateLabel = new Date(p.practiceDate + "T12:00:00").toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric",
  });

  const eventLabel  = p.eventType === "game" ? "game" : "practice";
  const statusLabel = p.status === "excused" ? "✅ Excused" : "⚠️ Unexcused";
  let body = `Your absence from the ${eventLabel} on ${dateLabel} has been marked: ${statusLabel}.`;

  if (p.notes) body += `\n\nCoach note: "${p.notes}"`;

  if (p.makeupWork) {
    body += `\n\nMakeup work assigned: ${p.makeupWork}\n\nPlease upload your proof of completion under Reports → Attendance.`;
  } else {
    body += `\n\nPlease upload your proof of completion under Reports → Attendance.`;
  }

  await sb.from("messages").insert({
    conversation_id: convId,
    sender_id:       p.fromUserId,
    body,
    tenant_id:       p.tenantId,
  });
}
