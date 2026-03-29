import { NextRequest } from "next/server";
import { getSupabaseServer, getSupabaseUser } from "@/lib/supabase/server";
import { apiError } from "@/lib/api-error";
import { withIdempotency } from "@/lib/idempotency";

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
      .select("id, full_name, role, created_at, last_login_at")
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
 * POST /api/staff
 * - With `password`: create user immediately (all roles including Admin)
 * - Without `password`: send invite email (Coach / Manager only)
 * Body: { full_name, email, role, password? }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { full_name, email, role, password } = body;

    if (!full_name || !email || !role) {
      return apiError("full_name, email, and role are required", 400);
    }
    const allRoles = ["Admin", "Coach", "Manager"];
    if (!allRoles.includes(role)) return apiError("Invalid role", 400);
    if (!password && !["Coach", "Manager"].includes(role)) {
      return apiError("Invite flow only supports Coach or Manager", 400);
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

    // Idempotency: auth user creation + email invite must not run twice
    return withIdempotency(request, myRecord.tenant_id, async () => {
      let userId: string;

      if (password) {
        // Manual creation — set password immediately, no email
        const { data: created, error: createError } = await service.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
        });
        if (createError) throw createError;
        userId = created.user.id;
      } else {
        // Invite flow — send "set your password" email
        const { data: invited, error: inviteError } =
          await service.auth.admin.inviteUserByEmail(email, {
            redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
          });
        if (inviteError) {
          console.error("[staff invite] inviteUserByEmail failed:", inviteError.message);
          if (!invited?.user) throw inviteError;
        }
        userId = invited!.user!.id;
      }

      // Create the users table record
      const { error: insertError } = await service.from("users").insert({
        id:        userId,
        tenant_id: myRecord.tenant_id,
        role,
        full_name,
      });
      if (insertError) throw insertError;

      return Response.json({ ok: true }, { status: 201 });
    });
  } catch (err: unknown) {
    return apiError(err);
  }
}
