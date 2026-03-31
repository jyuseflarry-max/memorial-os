import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { apiError } from "@/lib/api-error";
import { getSupabaseUser } from "@/lib/supabase/server";

const ROLES = ['Admin', 'Coach', 'Manager', 'Player', 'Family'] as const;
const LEVELS = ['none', 'view', 'edit', 'full'] as const;

const ROLE_DEFAULTS: Record<string, Record<string, string>> = {
  Admin:   { messages:'full', roster:'full', readiness:'full', player_groups:'full', build_plan:'full', view_plans:'full', drill_vault:'full', reports:'full', attendance_report:'full', game_schedule:'full', practice_schedule:'full', weekly_schedule:'full', strength:'full', leaderboard:'full', strength_programs:'full', inventory:'full', inventory_audit:'full', settings:'full', family_schedule:'none', family_games:'none', family_messages:'none' },
  Coach:   { messages:'full', roster:'full', readiness:'full', player_groups:'full', build_plan:'full', view_plans:'full', drill_vault:'full', reports:'full', attendance_report:'edit', game_schedule:'full', practice_schedule:'full', weekly_schedule:'full', strength:'full', leaderboard:'full', strength_programs:'full', inventory:'edit', inventory_audit:'edit', settings:'none', family_schedule:'none', family_games:'none', family_messages:'none' },
  Manager: { messages:'full', roster:'edit', readiness:'edit', player_groups:'edit', build_plan:'edit', view_plans:'view', drill_vault:'view', reports:'view', attendance_report:'view', game_schedule:'full', practice_schedule:'edit', weekly_schedule:'full', strength:'edit', leaderboard:'view', strength_programs:'edit', inventory:'full', inventory_audit:'full', settings:'none', family_schedule:'none', family_games:'none', family_messages:'none' },
  Player:  { messages:'full', roster:'none', readiness:'none', player_groups:'none', build_plan:'none', view_plans:'view', drill_vault:'none', reports:'none', attendance_report:'edit', game_schedule:'view', practice_schedule:'none', weekly_schedule:'view', strength:'edit', leaderboard:'view', strength_programs:'none', inventory:'none', inventory_audit:'none', settings:'none', family_schedule:'none', family_games:'none', family_messages:'none' },
  Family:  { messages:'none', roster:'none', readiness:'none', player_groups:'none', build_plan:'none', view_plans:'none', drill_vault:'none', reports:'none', attendance_report:'none', game_schedule:'none', practice_schedule:'none', weekly_schedule:'none', strength:'none', leaderboard:'none', strength_programs:'none', inventory:'none', inventory_audit:'none', settings:'none', family_schedule:'view', family_games:'view', family_messages:'full' },
};

const ALL_PAGE_KEYS = ['messages','roster','readiness','player_groups','build_plan','view_plans','drill_vault','reports','attendance_report','game_schedule','practice_schedule','weekly_schedule','strength','leaderboard','strength_programs','inventory','inventory_audit','settings','family_schedule','family_games','family_messages'];

async function getCallerRole(db: Awaited<ReturnType<typeof getDb>>, userId: string) {
  const { data } = await db.from("users").select("role, tenant_id").eq("id", userId).single();
  return data;
}

export async function GET() {
  try {
    const userClient = await getSupabaseUser();
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return apiError("Not authenticated", 401);

    const db = await getDb();
    const caller = await getCallerRole(db, user.id);
    if (!caller || !['Admin','Coach','Manager'].includes(caller.role)) {
      return apiError("Forbidden", 403);
    }

    const { data: rows } = await db
      .from("page_permissions")
      .select("page_key, role, access_level")
      .eq("tenant_id", caller.tenant_id);

    // Build matrix: { [pageKey]: { [role]: level } }
    const matrix: Record<string, Record<string, string>> = {};
    for (const pageKey of ALL_PAGE_KEYS) {
      matrix[pageKey] = {};
      for (const role of ROLES) {
        matrix[pageKey][role] = ROLE_DEFAULTS[role]?.[pageKey] ?? 'none';
      }
    }
    for (const row of rows ?? []) {
      if (!matrix[row.page_key as string]) matrix[row.page_key as string] = {};
      matrix[row.page_key as string][row.role as string] = row.access_level as string;
    }

    return NextResponse.json(matrix);
  } catch (err) {
    return apiError(err);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const userClient = await getSupabaseUser();
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return apiError("Not authenticated", 401);

    const db = await getDb();
    const caller = await getCallerRole(db, user.id);
    if (!caller || caller.role !== 'Admin') return apiError("Admin only", 403);

    const { page_key, role, access_level } = await request.json();
    if (!ALL_PAGE_KEYS.includes(page_key)) return apiError("Invalid page_key", 400);
    if (!ROLES.includes(role)) return apiError("Invalid role", 400);
    if (!LEVELS.includes(access_level)) return apiError("Invalid access_level", 400);
    if (role === 'Admin') return apiError("Admin permissions cannot be changed", 400);

    const { error } = await db.upsert("page_permissions", { page_key, role, access_level });
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err) {
    return apiError(err);
  }
}
