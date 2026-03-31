import { createServerClient } from "@supabase/ssr";
import { NextResponse }       from "next/server";
import type { NextRequest }   from "next/server";
import { Ratelimit }          from "@upstash/ratelimit";
import { Redis }              from "@upstash/redis";

// ── Rate limiting ──────────────────────────────────────────────────────────
// Skipped entirely when UPSTASH_REDIS_REST_URL is not set (local dev).

const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url:   process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

const userLimiter = redis
  ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(300, "1 m"), prefix: "rl:user" })
  : null;

const ipLimiter = redis
  ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(30, "1 m"), prefix: "rl:ip" })
  : null;

// ── Public routes (no auth redirect) ──────────────────────────────────────

const PUBLIC_ROUTES = ["/login", "/register", "/vibe-check", "/join"];

// ── Proxy ──────────────────────────────────────────────────────────────────

export async function proxy(request: NextRequest) {
  // Start with a pass-through response so cookies can be written onto it
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          // Write updated cookies onto both the request and the response.
          // Both writes are required per @supabase/ssr docs to avoid auth bugs.
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // getUser() contacts the Supabase Auth server to verify the token.
  // Do NOT use getSession() here — it reads from cookies without verification.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // ── Per-tenant rate limiting (API routes only) ─────────────────────────
  if (pathname.startsWith("/api/") && redis && userLimiter && ipLimiter) {
    let identifier: string;
    let limiter: Ratelimit;

    if (user) {
      // Keyed on user ID — one tenant cannot exhaust another's quota
      identifier = `user:${user.id}`;
      limiter    = userLimiter;
    } else {
      // Unauthenticated — fall back to IP with a tighter limit
      const ip =
        request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
        request.headers.get("x-real-ip") ??
        "unknown";
      identifier = `ip:${ip}`;
      limiter    = ipLimiter;
    }

    const { success, limit, remaining, reset } = await limiter.limit(identifier);

    const rlHeaders = {
      "X-RateLimit-Limit":     String(limit),
      "X-RateLimit-Remaining": String(remaining),
      "X-RateLimit-Reset":     String(reset),
    };

    if (!success) {
      const retryAfter = Math.ceil((reset - Date.now()) / 1000);
      return new NextResponse(
        JSON.stringify({ error: "Too many requests. Please slow down." }),
        {
          status: 429,
          headers: {
            ...rlHeaders,
            "Content-Type": "application/json",
            "Retry-After":  String(retryAfter),
          },
        }
      );
    }

    // Pass rate limit headers through on successful requests
    for (const [key, value] of Object.entries(rlHeaders)) {
      supabaseResponse.headers.set(key, value);
    }
  }

  // ── Auth redirect logic ────────────────────────────────────────────────

  const isPublic =
    PUBLIC_ROUTES.some((r) => pathname.startsWith(r)) ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname.includes(".");

  if (!user && !isPublic) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    return NextResponse.redirect(loginUrl);
  }

  // Redirect logged-in users away from login/register
  if (user && (pathname === "/login" || pathname === "/register")) {
    const homeUrl = request.nextUrl.clone();
    homeUrl.pathname = "/";
    return NextResponse.redirect(homeUrl);
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
