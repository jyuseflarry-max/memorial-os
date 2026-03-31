/**
 * GET /api/users/messageable-groups
 *
 * Returns group messaging targets for staff (Coach / Admin / Manager):
 * - "all"  → every user in the tenant
 * - teams  → players on that team (via players.user_id) + all staff
 *
 * Only available to Coach / Admin / Manager / Super-Admin.
 * Response shape:
 * {
 *   all: { label: string; userIds: string[] } | null,
 *   teams: { id: string; name: string; userIds: string[] }[],
 * }
 */
import { NextResponse }                      from "next/server";
import { getSupabaseServer, getSupabaseUser } from "@/lib/supabase/server";

const STAFF_ROLES = ["Super-Admin", "Admin", "Coach", "Manager"];

export async function GET() {
  const supabase = await getSupabaseUser();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sb = getSupabaseServer();
  const { data: profile } = await sb
    .from("users")
    .select("tenant_id, role")
    .eq("id", user.id)
    .single();

  if (!profile) return NextResponse.json({ error: "User not found" }, { status: 404 });
  if (!STAFF_ROLES.includes(profile.role)) {
    return NextResponse.json({ all: null, teams: [] });
  }

  const tenantId = profile.tenant_id;

  // 1. All users in the tenant (excluding self)
  const { data: allUsers } = await sb
    .from("users")
    .select("id")
    .eq("tenant_id", tenantId)
    .neq("id", user.id);

  const allUserIds = (allUsers ?? []).map((u) => u.id);

  // 2. Teams in this tenant
  const { data: teams } = await sb
    .from("teams")
    .select("id, name")
    .eq("tenant_id", tenantId)
    .order("name");

  if (!teams || teams.length === 0) {
    return NextResponse.json({
      all: { label: "All — Entire Program", userIds: allUserIds },
      teams: [],
    });
  }

  // 3. Staff user IDs (coaches/managers/admins) — always included in team groups
  const { data: staffUsers } = await sb
    .from("users")
    .select("id")
    .eq("tenant_id", tenantId)
    .in("role", STAFF_ROLES)
    .neq("id", user.id);

  const staffIds = new Set((staffUsers ?? []).map((u) => u.id));

  // 4. Players → user_id per team
  const { data: players } = await sb
    .from("players")
    .select("team_id, user_id")
    .eq("tenant_id", tenantId)
    .not("user_id", "is", null);

  const playersByTeam: Record<string, string[]> = {};
  for (const p of players ?? []) {
    if (!p.team_id || !p.user_id) continue;
    if (!playersByTeam[p.team_id]) playersByTeam[p.team_id] = [];
    playersByTeam[p.team_id].push(p.user_id as string);
  }

  // 5. Build team groups: player user_ids + all staff (except self)
  const teamGroups = teams.map((t) => {
    const playerIds = playersByTeam[t.id] ?? [];
    const allIds = [...new Set([...playerIds, ...staffIds])].filter((id) => id !== user.id);
    return { id: t.id, name: t.name, userIds: allIds };
  });

  return NextResponse.json({
    all: { label: "All — Entire Program", userIds: allUserIds },
    teams: teamGroups,
  });
}
