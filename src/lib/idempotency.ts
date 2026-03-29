import { NextRequest } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";

/**
 * Wraps a POST handler with idempotency key support.
 *
 * How it works:
 *  1. Client sends `Idempotency-Key: <uuid>` header on every write request.
 *  2. First time we see the key: run the handler, cache the response, return it.
 *  3. Subsequent requests with the same key (retries, double-submits):
 *     return the original cached response — handler never runs again.
 *
 * Keys expire after 24 hours. 5xx responses are NOT cached so transient
 * server errors can always be retried. 4xx and 2xx ARE cached — same bad
 * input returns the same error, same good input returns the same success.
 *
 * If no key header is present the handler runs normally (backward-compatible).
 */
export async function withIdempotency(
  request: NextRequest,
  tenantId: string,
  handler: () => Promise<Response>
): Promise<Response> {
  const key = request.headers.get("idempotency-key");
  if (!key) return handler();

  const sb = getSupabaseServer();

  // 1. Check for a previously stored response
  const { data: cached } = await sb
    .from("idempotency_keys")
    .select("status, body")
    .eq("key", key)
    .eq("tenant_id", tenantId)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (cached) {
    // Return the exact same response as the original request
    return Response.json(cached.body, {
      status: cached.status,
      headers: { "Idempotent-Replayed": "true" },
    });
  }

  // 2. Run the actual handler
  const response = await handler();

  // 3. Cache the result for any non-5xx status (errors are deterministic too)
  if (response.status < 500) {
    const body = await response.clone().json().catch(() => ({}));
    await sb
      .from("idempotency_keys")
      .upsert(
        {
          key,
          tenant_id: tenantId,
          status: response.status,
          body,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        },
        { onConflict: "key,tenant_id" }
      );
  }

  return response;
}
