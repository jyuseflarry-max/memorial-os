/**
 * Shared conversation helpers used by both the messaging API and
 * the attendance notification system.
 */
import { getSupabaseServer } from "@/lib/supabase/server";

/**
 * Finds an existing 1:1 conversation between two users, or creates one.
 * Returns the conversation_id, or null if creation failed.
 */
export async function findOrCreate1on1(
  fromUserId: string,
  toUserId:   string,
  tenantId:   string,
): Promise<string | null> {
  const sb = getSupabaseServer();

  // Find conversations the sender is in
  const { data: myConvs } = await sb
    .from("conversation_participants")
    .select("conversation_id")
    .eq("user_id", fromUserId)
    .eq("tenant_id", tenantId);

  const myConvIds = (myConvs ?? []).map((c) => c.conversation_id);

  // Check if the recipient is also in any of those conversations
  if (myConvIds.length > 0) {
    const { data: theirConvs } = await sb
      .from("conversation_participants")
      .select("conversation_id")
      .eq("user_id", toUserId)
      .in("conversation_id", myConvIds);

    if (theirConvs && theirConvs.length > 0) {
      return theirConvs[0].conversation_id;
    }
  }

  // No existing conversation — create one
  const { data: newConv, error } = await sb
    .from("conversations")
    .insert({ tenant_id: tenantId, created_by: fromUserId })
    .select("id")
    .single();

  if (error || !newConv) return null;

  await sb.from("conversation_participants").insert([
    { conversation_id: newConv.id, user_id: fromUserId, tenant_id: tenantId },
    { conversation_id: newConv.id, user_id: toUserId,   tenant_id: tenantId },
  ]);

  return newConv.id;
}
