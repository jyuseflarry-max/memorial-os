/**
 * Per-tenant rate limiting middleware
 *
 * Protects all /api/* routes from abuse by a single tenant or IP address.
 * Uses Upstash Redis (sliding window algorithm) so the counter persists across
 * all Vercel serverless function instances — no in-process state needed.
 *
 * Limits:
 *   - Authenticated users: 300 requests / minute  (keyed on user ID)
 *   - Unauthenticated IPs: 30 requests / minute   (keyed on IP address)
 *
 * If UPSTASH_REDIS_REST_URL is not set (local dev), rate limiting is skipped.
 */

import { NextRequest, NextResponse } from "next/server";
import { Ratelimit }        from "@upstash/ratelimit";
import { Redis }            from "@upstash/redis";
import { createServerClient } from "@supabase/ssr";

// ── Redis client ───────────────────────────────────────────────────────────

const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url:   process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

// ── Rate limiters ──────────────────────────────────────────────────────────

const userLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(300, "1 m"),
      prefix:  "rl:user",
    })
  : null;

const ipLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(30, "1 m"),
      prefix:  "rl:ip",
    })
  : null;

// ── Middleware ─────────────────────────────────────────────────────────────

export async function middleware(request: NextRequest) {
  // Only apply to API routes
  if (!request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // Skip if Redis is not configured (local development)
  if (!redis || !userLimiter || !ipLimiter) {
    return NextResponse.next();
  }

  // Resolve the rate limit key.
  // Read the Supabase session from the request cookie — getSession() decodes
  // the JWT locally with no network call, so this adds < 1ms of overhead.
  let identifier: string;
  let limiter: Ratelimit;

  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => request.cookies.getAll(),
          setAll: () => {}, // read-only in middleware — no cookie writes needed
        },
      }
    );

    const { data: { session } } = await supabase.auth.getSession();

    if (session?.user?.id) {
      identifier = `user:${session.user.id}`;
      limiter    = userLimiter;
    } else {
      throw new Error("unauthenticated");
    }
  } catch {
    // No session — fall back to IP-based limiting
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
      request.headers.get("x-real-ip") ??
      "unknown";
    identifier = `ip:${ip}`;
    limiter    = ipLimiter;
  }

  const { success, limit, remaining, reset } = await limiter.limit(identifier);

  const rateLimitHeaders = {
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
          ...rateLimitHeaders,
          "Content-Type": "application/json",
          "Retry-After":  String(retryAfter),
        },
      }
    );
  }

  const response = NextResponse.next();
  for (const [key, value] of Object.entries(rateLimitHeaders)) {
    response.headers.set(key, value);
  }
  return response;
}

export const config = {
  matcher: "/api/:path*",
};
