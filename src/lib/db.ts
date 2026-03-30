/**
 * Tenant-scoped Data Access Layer
 *
 * WHY THIS EXISTS
 * ---------------
 * The service role Supabase client (getSupabaseServer) bypasses Row-Level
 * Security entirely. That means a developer who forgets .eq("tenant_id", x)
 * silently leaks every tenant's data — no error, no warning.
 *
 * This module provides `getDb()`, which resolves the calling user's tenant_id
 * once and returns a thin wrapper that automatically injects it into every
 * query and insert. Developers get the full Supabase query builder back, so
 * they can still chain .select(), .order(), .limit(), .single(), etc. normally.
 *
 * USAGE
 * -----
 *   // OLD (unsafe — no tenant filter):
 *   const sb = getSupabaseServer();
 *   const { data } = await sb.from("players").select("*");
 *
 *   // NEW (safe — tenant_id injected automatically):
 *   const db = await getDb();
 *   const { data } = await db.from("players").select("*");
 *
 *   // Inserting — tenant_id is injected automatically:
 *   await db.insert("games", { team_id, date, opponent });
 *
 *   // Updating — scoped to tenant, then add your row filter:
 *   await db.update("games", { result: "W" }).eq("id", gameId);
 *
 *   // Deleting — scoped to tenant, then add your row filter:
 *   await db.delete("games").eq("id", gameId);
 *
 *   // Access raw context (userId, tenantId, role) for auth checks:
 *   const { userId, tenantId, role } = db;
 *
 * WHEN TO STILL USE getSupabaseServer() DIRECTLY
 * ------------------------------------------------
 * A small number of operations legitimately need the raw service role client:
 *   - supabase.auth.admin.*  (creating/inviting users, reading auth.users)
 *   - Cross-tenant admin operations (Super-Admin only)
 *   - The initial tenant lookup inside getDb() itself
 * Everything else should go through getDb().
 */

import { getSupabaseServer, getSupabaseUser } from "./supabase/server";

// ── Types ──────────────────────────────────────────────────────────────────

export interface DbContext {
  userId:   string;
  tenantId: string;
  role:     string;
}

// ── Core factory ──────────────────────────────────────────────────────────

/**
 * Resolves the calling user's tenant context and returns a query helper.
 * Call once per request at the top of your API route or Server Action.
 *
 * Throws if the request is unauthenticated or has no user record.
 */
export async function getDb() {
  // 1. Identify the calling user via their session cookie
  const userClient = await getSupabaseUser();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  // 2. Look up their tenant + role using service role (bypasses RLS for this
  //    one lookup — intentional, we're establishing the security context here)
  const sb = getSupabaseServer();
  const { data: me, error } = await sb
    .from("users")
    .select("tenant_id, role")
    .eq("id", user.id)
    .single();
  if (error || !me) throw new Error("User record not found");

  const tenantId: string = me.tenant_id;

  return {
    // ── Context ─────────────────────────────────────────────────────────
    userId:   user.id,
    tenantId,
    role:     me.role as string,

    /**
     * Returns a Supabase query builder pre-filtered by tenant_id.
     * Chain any further filters, selects, or ordering on the result.
     *
     * @example
     *   const { data } = await db.from("players").select("id, name").order("name");
     *   const { data } = await db.from("teams").select("*").eq("id", teamId).single();
     */
    from(table: string) {
      return sb.from(table).select().eq("tenant_id", tenantId);
    },

    /**
     * Inserts one or more rows with tenant_id automatically injected.
     *
     * @example
     *   const { data } = await db.insert("games", { team_id, date, opponent }).select().single();
     *   await db.insert("players", [{ name: "Alice" }, { name: "Bob" }]);
     */
    insert(
      table: string,
      rows: Record<string, unknown> | Record<string, unknown>[]
    ) {
      const data = Array.isArray(rows)
        ? rows.map((r) => ({ ...r, tenant_id: tenantId }))
        : { ...rows, tenant_id: tenantId };
      return sb.from(table).insert(data);
    },

    /**
     * Upserts one or more rows with tenant_id automatically injected.
     *
     * @example
     *   await db.upsert("program_settings", { key: "theme", value: "dark" });
     */
    upsert(
      table: string,
      rows: Record<string, unknown> | Record<string, unknown>[]
    ) {
      const data = Array.isArray(rows)
        ? rows.map((r) => ({ ...r, tenant_id: tenantId }))
        : { ...rows, tenant_id: tenantId };
      return sb.from(table).upsert(data);
    },

    /**
     * Returns an update builder pre-scoped to this tenant.
     * ALWAYS chain .eq("id", rowId) before awaiting to avoid updating all rows.
     *
     * @example
     *   await db.update("games", { result: "W" }).eq("id", gameId);
     */
    update(table: string, data: Record<string, unknown>) {
      return sb.from(table).update(data).eq("tenant_id", tenantId);
    },

    /**
     * Returns a delete builder pre-scoped to this tenant.
     * ALWAYS chain .eq("id", rowId) before awaiting to avoid deleting all rows.
     *
     * @example
     *   await db.delete("games").eq("id", gameId);
     */
    delete(table: string) {
      return sb.from(table).delete().eq("tenant_id", tenantId);
    },
  };
}

// ── Convenience re-export ─────────────────────────────────────────────────

export type Db = Awaited<ReturnType<typeof getDb>>;
