import { NextRequest } from "next/server";
import { getSupabaseServer, getSupabaseUser } from "@/lib/supabase/server";
import { apiError } from "@/lib/api-error";

/** POST /api/staff/[id]/set-password — admin sets a password for any user */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { password } = await request.json();

    if (!password || password.length < 6) {
      return apiError("Password must be at least 6 characters", 400);
    }

    const userClient = await getSupabaseUser();
    const { data: { user: me } } = await userClient.auth.getUser();
    if (!me) return apiError("Not authenticated", 401);

    const service = getSupabaseServer();

    const { data: myRecord } = await service
      .from("users")
      .select("role")
      .eq("id", me.id)
      .single();
    if (!myRecord || myRecord.role !== "Admin") {
      return apiError("Admin only", 403);
    }

    const { error } = await service.auth.admin.updateUserById(id, { password });
    if (error) throw error;

    return Response.json({ ok: true });
  } catch (err: unknown) {
    return apiError(err);
  }
}
