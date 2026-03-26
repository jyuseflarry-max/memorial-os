import { NextRequest } from "next/server";
import { getSupabaseServer, getSupabaseUser } from "@/lib/supabase/server";
import { apiError } from "@/lib/api-error";

/** GET /api/staff — list all users in the caller's tenant */
export async function GET() {
  try {
    const userClient = await getSupabaseUser();
    const { data: { user: me } } = await userClient.auth.getUser();
    if (!me) return apiError("Not authenticated", 401);

    const service = getSupabaseServer();

    const { data: myRecord } = await service
      .from("users")
      .select("tenant_id")
      .eq("id", me.id)
      .single();
    if (!myRecord) return apiError("User record not found", 403);

    const { data, error } = await service
      .from("users")
      .select("id, full_name, role, created_at")
      .eq("tenant_id", myRecord.tenant_id)
      .order("created_at", { ascending: true });

    if (error) throw error;

    // Attach email from auth.users for each staff member
    const withEmails = await Promise.all(
      (data ?? []).map(async (u) => {
        const { data: authUser } = await service.auth.admin.getUserById(u.id);
        return { ...u, email: authUser?.user?.email ?? null };
      })
    );

    return Response.json(withEmails);
  } catch (err: unknown) {
    return apiError(err);
  }
}

/**
 * POST /api/staff — invite a new staff member (Coach or Manager)
 * Body: { full_name, email, role }
 */
export async function POST(request: NextRequest) {
  try {
    const { full_name, email, role } = await request.json();

    if (!full_name || !email || !role) {
      return apiError("full_name, email, and role are required", 400);
    }
    if (!["Coach", "Manager"].includes(role)) {
      return apiError("Role must be Coach or Manager", 400);
    }

    const userClient = await getSupabaseUser();
    const { data: { user: me } } = await userClient.auth.getUser();
    if (!me) return apiError("Not authenticated", 401);

    const service = getSupabaseServer();

    const { data: myRecord } = await service
      .from("users")
      .select("tenant_id")
      .eq("id", me.id)
      .single();
    if (!myRecord) return apiError("Admin record not found", 403);

    // Send the invite email
    const { data: invited, error: inviteError } =
      await service.auth.admin.inviteUserByEmail(email, {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
      });
    if (inviteError) {
      console.error("[staff invite] inviteUserByEmail failed:", inviteError.message);
      if (!invited?.user) throw inviteError;
    }

    // Create the users table record
    const { error: insertError } = await service.from("users").insert({
      id:        invited!.user.id,
      tenant_id: myRecord.tenant_id,
      role,
      full_name,
    });
    if (insertError) throw insertError;

    return Response.json({ ok: true }, { status: 201 });
  } catch (err: unknown) {
    return apiError(err);
  }
}
