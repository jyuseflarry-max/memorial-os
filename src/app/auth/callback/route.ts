import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { cookies } from "next/headers";

/**
 * GET /auth/callback
 *
 * Landing route for every Supabase magic link (invites, password resets, etc).
 * Supabase appends ?code=xxx to this URL. We exchange that code for a real
 * session, set the auth cookies, then redirect the user into the app.
 *
 * Invite flow:
 *   1. Admin adds player/coach email to roster
 *   2. Supabase emails them a link → https://your-app.com/auth/callback?code=xxx&type=invite
 *   3. They click it → land here → session is established → redirect to /account
 *      so they can set their display name before entering the app
 *
 * All other flows (OAuth, magic link sign-in) redirect to / by default,
 * or wherever the `next` param points.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const type = searchParams.get("type");           // "invite" | "recovery" | etc.
  const next = searchParams.get("next") ?? "/";

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("[auth/callback] exchangeCodeForSession failed:", error.message);
    return NextResponse.redirect(`${origin}/login?error=invite_expired`);
  }

  // Invited users land on /account first so they can set their name.
  // Everyone else goes to the `next` param or the dashboard root.
  const destination = type === "invite" ? "/account?welcome=1" : next;
  return NextResponse.redirect(`${origin}${destination}`);
}
