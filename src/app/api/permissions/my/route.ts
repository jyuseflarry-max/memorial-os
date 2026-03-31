import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { apiError } from "@/lib/api-error";
import { getSupabaseUser } from "@/lib/supabase/server";

// Hardcoded defaults (used as fallback if no DB rows for tenant)
const ROLE_DEFAULTS: Record<string, Record<string, string>> = {
  Admin:   { messages:'full', roster:'full', readiness:'full', player_groups:'full', build_plan:'full', view_plans:'full', drill_vault:'full', reports:'full', attendance_report:'full', game_schedule:'full', practice_schedule:'full', weekly_schedule:'full', strength:'full', leaderboard:'full', strength_programs:'full', inventory:'full', inventory_audit:'full', settings:'full', family_schedule:'none', family_games:'none', family_messages:'none' },
  Coach:   { messages:'full', roster:'full', readiness:'full', player_groups:'full', build_plan:'full', view_plans:'full', drill_vault:'full', reports:'full', attendance_report:'edit', game_schedule:'full', practice_schedule:'full', weekly_schedule:'full', strength:'full', leaderboard:'full', strength_programs:'full', inventory:'edit', inventory_audit:'edit', settings:'none', family_schedule:'none', family_games:'none', family_messages:'none' },
  Manager: { messages:'full', roster:'edit', readiness:'edit', player_groups:'edit', build_plan:'edit', view_plans:'view', drill_vault:'view', reports:'view', attendance_report:'view', game_schedule:'full', practice_schedule:'edit', weekly_schedule:'full', strength:'edit', leaderboard:'view', strength_programs:'edit', inventory:'full', inventory_audit:'full', settings:'none', family_schedule:'none', family_games:'none', family_messages:'none' },
  Player:  { messages:'full', roster:'none', readiness:'none', player_groups:'none', build_plan:'none', view_plans:'view', drill_vault:'none', reports:'none', attendance_report:'edit', game_schedule:'view', practice_schedule:'none', weekly_schedule:'view', strength:'edit', leaderboard:'view', strength_programs:'none', inventory:'none', inventory_audit:'none', settings:'none', family_schedule:'none', family_games:'none', family_messages:'none' },
  Family:  { messages:'none', roster:'none', readiness:'none', player_groups:'none', build_plan:'none', view_plans:'none', drill_vault:'none', reports:'none', attendance_report:'none', game_schedule:'none', practice_schedule:'none', weekly_schedule:'none', strength:'none', leaderboard:'none', strength_programs:'none', inventory:'none', inventory_audit:'none', settings:'none', family_schedule:'view', family_games:'view', family_messages:'full' },
};

export async function GET() {
  try {
    const userClient = await getSupabaseUser();
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return apiError("Not authenticated", 401);

    const db = await getDb();
    const { data: userRecord } = await db.from("users").select("role, tenant_id").eq("id", user.id).single();
    if (!userRecord) return apiError("User not found", 404);

    const role = userRecord.role as string;
    const tenantId = userRecord.tenant_id as string;

    // Start with hardcoded defaults for this role
    const result: Record<string, string> = { ...(ROLE_DEFAULTS[role] ?? {}) };

    // Apply any DB overrides for this tenant
    const { data: rows } = await db
      .from("page_permissions")
      .select("page_key, access_level")
      .eq("tenant_id", tenantId)
      .eq("role", role);

    for (const row of rows ?? []) {
      result[row.page_key as string] = row.access_level as string;
    }

    return NextResponse.json(result);
  } catch (err) {
    return apiError(err);
  }
}
