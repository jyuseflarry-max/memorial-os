import { getDb }     from "@/lib/db";
import { apiError }  from "@/lib/api-error";
import { getSupabaseServer } from "@/lib/supabase/server";

// GET /api/conversations/[id]/messages — fetch messages + mark read
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = await getDb();
    const sb = getSupabaseServer();

    // Verify user is a participant in this conversation
    const { data: participation } = await sb
      .from("conversation_participants")
      .select("user_id")
      .eq("conversation_id", id)
      .eq("user_id", db.userId)
      .eq("tenant_id", db.tenantId)
      .single();

    if (!participation) return apiError("Forbidden", 403);

    // Fetch messages
    const { data: messages } = await sb
      .from("messages")
      .select("id, sender_id, body, created_at")
      .eq("conversation_id", id)
      .eq("tenant_id", db.tenantId)
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
      .eq("user_id", db.userId);

    return Response.json(enriched);
  } catch (err) {
    return apiError(err);
  }
}

// POST /api/conversations/[id]/messages — send a message
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = await getDb();

    const { body } = await req.json();
    if (!body?.trim()) return apiError("Message body required", 400);

    const sb = getSupabaseServer();

    // Verify user is a participant in this conversation
    const { data: participation } = await sb
      .from("conversation_participants")
      .select("user_id")
      .eq("conversation_id", id)
      .eq("user_id", db.userId)
      .eq("tenant_id", db.tenantId)
      .single();

    if (!participation) return apiError("Forbidden", 403);

    const { data: message, error } = await sb
      .from("messages")
      .insert({
        conversation_id: id,
        tenant_id:       db.tenantId,
        sender_id:       db.userId,
        body:            body.trim(),
      })
      .select("id, sender_id, body, created_at")
      .single();

    if (error || !message) return apiError("Failed to send", 500);

    return Response.json(message);
  } catch (err) {
    return apiError(err);
  }
}
