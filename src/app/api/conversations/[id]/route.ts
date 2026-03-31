import { NextResponse } from "next/server";
import { getSupabaseUser, getSupabaseServer } from "@/lib/supabase/server";

// GET /api/conversations/[id] — returns conversation metadata + participants
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await getSupabaseUser();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sb = getSupabaseServer();

  // Verify participation
  const { data: participation } = await sb
    .from("conversation_participants")
    .select("user_id")
    .eq("conversation_id", id)
    .eq("user_id", user.id)
    .single();

  if (!participation) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Get conversation title
  const { data: conv } = await sb
    .from("conversations")
    .select("id, title, created_at")
    .eq("id", id)
    .single();

  // Get all participants
  const { data: participants } = await sb
    .from("conversation_participants")
    .select("user_id")
    .eq("conversation_id", id);

  const userIds = (participants ?? []).map((p) => p.user_id);
  const { data: profiles } = await sb
    .from("users")
    .select("id, full_name, role")
    .in("id", userIds);

  const others = (profiles ?? []).filter((p) => p.id !== user.id);

  return NextResponse.json({
    id,
    title: conv?.title ?? null,
    participants: profiles ?? [],
    others,
  });
}
