import { getDb }     from "@/lib/db";
import { apiError }  from "@/lib/api-error";
import { getSupabaseServer } from "@/lib/supabase/server";

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE     = 100;

// GET /api/conversations/[id]/messages?before=<iso>&limit=<n>
//
// Returns { messages: Message[], hasMore: boolean }.
// `messages` is ordered oldest → newest so the client can render directly
// without reversing. `hasMore` indicates whether older messages exist
// beyond the page; the next page is fetched with ?before=messages[0].created_at.
//
// Without `before`, returns the most recent page. Internally we query in
// descending order with limit+1 to detect hasMore, then reverse for output.
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = await getDb();
    const sb = getSupabaseServer();

    const url    = new URL(req.url);
    const before = url.searchParams.get("before");
    const limit  = Math.min(
      Math.max(parseInt(url.searchParams.get("limit") ?? "", 10) || DEFAULT_PAGE_SIZE, 1),
      MAX_PAGE_SIZE,
    );

    const { data: participation } = await sb
      .from("conversation_participants")
      .select("user_id")
      .eq("conversation_id", id)
      .eq("user_id", db.userId)
      .eq("tenant_id", db.tenantId)
      .single();

    if (!participation) return apiError("Forbidden", 403);

    let q = sb
      .from("messages")
      .select("id, sender_id, body, kind, metadata, created_at")
      .eq("conversation_id", id)
      .eq("tenant_id", db.tenantId)
      .eq("is_deleted", false)
      .order("created_at", { ascending: false })
      .limit(limit + 1);

    if (before) q = q.lt("created_at", before);

    const { data: rows } = await q;
    const hasMore  = (rows?.length ?? 0) > limit;
    const page     = (rows ?? []).slice(0, limit);

    const senderIds = [...new Set(page.map((m) => m.sender_id))];
    const { data: profiles } = senderIds.length
      ? await sb.from("users").select("id, full_name, role").in("id", senderIds)
      : { data: [] };

    const profileMap = Object.fromEntries((profiles ?? []).map((p) => [p.id, p]));
    const messages = page
      .reverse()
      .map((m) => ({ ...m, sender: profileMap[m.sender_id] ?? null }));

    // Mark as read only when reading the latest page (no `before`).
    if (!before) {
      await sb
        .from("conversation_participants")
        .update({ last_read_at: new Date().toISOString() })
        .eq("conversation_id", id)
        .eq("user_id", db.userId);
    }

    return Response.json({ messages, hasMore });
  } catch (err) {
    return apiError(err);
  }
}

// POST /api/conversations/[id]/messages
// Body: { body: string, client_uuid?: string }
//
// `client_uuid` enables idempotent retries: the same UUID from the same
// (conversation, sender) collapses on the partial unique index and we
// return the existing row instead of inserting twice.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = await getDb();

    const payload = await req.json();
    const body: string = payload?.body ?? "";
    const clientUuid: string | null = payload?.client_uuid ?? null;

    if (!body.trim()) return apiError("Message body required", 400);
    if (body.length > 4000) return apiError("Message exceeds 4000 character limit", 400);

    const sb = getSupabaseServer();

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
        client_uuid:     clientUuid,
      })
      .select("id, sender_id, body, kind, metadata, created_at")
      .single();

    // 23505 = unique_violation. With a client_uuid this means a retry of an
    // earlier successful send — return the row that won the race so the
    // client's "send" handler resolves identically either way.
    if (error?.code === "23505" && clientUuid) {
      const { data: existing } = await sb
        .from("messages")
        .select("id, sender_id, body, kind, metadata, created_at")
        .eq("conversation_id", id)
        .eq("sender_id", db.userId)
        .eq("client_uuid", clientUuid)
        .single();
      if (existing) return Response.json(existing);
    }

    if (error || !message) return apiError("Failed to send", 500);

    return Response.json(message);
  } catch (err) {
    return apiError(err);
  }
}
