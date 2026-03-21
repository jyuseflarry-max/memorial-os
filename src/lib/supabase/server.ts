import { createClient, SupabaseClient } from "@supabase/supabase-js";

/**
 * Returns a Supabase client using the service role key.
 * Only call this from server-side code (API route handlers).
 * Throws a descriptive error if env vars are missing.
 */
export function getSupabaseServer(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Supabase is not configured. Copy .env.local.example to .env.local " +
        "and add NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
    );
  }

  return createClient(url, key, { auth: { persistSession: false } });
}
