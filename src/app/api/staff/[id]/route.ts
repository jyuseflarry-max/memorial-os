import { NextRequest } from "next/server";
import { getSupabaseServer, getSupabaseUser } from "@/lib/supabase/server";
import { apiError } from "@/lib/api-error";

/** POST /api/staff/[id]/resend — resend invite email */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const service = getSupabaseServer();

    const userClient = await getSupabaseUser();
    const { data: { user: me } } = await userClient.auth.getUser();
    if (!me) return apiError("Not authenticated", 401);

    const { data: authUser } = await service.auth.admin.getUserById(id);
    if (!authUser?.user?.email) return apiError("User not found", 404);

    await service.auth.admin.inviteUserByEmail(authUser.user.email, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?type=invite`,
    });

    return Response.json({ ok: true });
  } catch (err: unknown) {
    return apiError(err);
  }
}

/** DELETE /api/staff/[id] — remove staff member from the tenant */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const userClient = await getSupabaseUser();
    const { data: { user: me } } = await userClient.auth.getUser();
    if (!me) return apiError("Not authenticated", 401);
    if (me.id === id) return apiError("You cannot remove yourself", 400);

    const service = getSupabaseServer();

    // Remove from our users table first (FK), then auth
    await service.from("users").delete().eq("id", id);
    await service.auth.admin.deleteUser(id);

    return new Response(null, { status: 204 });
  } catch (err: unknown) {
    return apiError(err);
  }
}
