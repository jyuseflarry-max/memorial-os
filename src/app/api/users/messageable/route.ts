import { NextResponse } from "next/server";
import { getSupabaseUser, getSupabaseServer } from "@/lib/supabase/server";

const ALLOWED_RECIPIENT_ROLES: Record<string, string[]> = {
  "Super-Admin": ["Super-Admin", "Admin", "Coach", "Manager", "Player", "Family"],
  "Admin":       ["Super-Admin", "Admin", "Coach", "Manager", "Player", "Family"],
  "Coach":       ["Super-Admin", "Admin", "Coach", "Manager", "Player", "Family"],
  "Manager":     ["Super-Admin", "Admin", "Coach", "Manager", "Player", "Family"],
  "Player":      ["Super-Admin", "Admin", "Coach", "Manager", "Player"],
  "Family":      ["Super-Admin", "Admin", "Coach", "Manager"],
};

// GET /api/users/messageable — returns users this user can message
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

  const allowedRoles = ALLOWED_RECIPIENT_ROLES[profile.role] ?? [];

  const { data: users } = await sb
    .from("users")
    .select("id, full_name, role")
    .eq("tenant_id", profile.tenant_id)
    .in("role", allowedRoles)
    .neq("id", user.id)
    .order("full_name", { ascending: true });

  return NextResponse.json(users ?? []);
}
