/**
 * Dynamic Open Graph image — shown as the hero card when a link to this app
 * is shared via iMessage, Slack, Twitter, email, etc.
 *
 * Fetches live settings (logo, program name, primary color) with the service
 * role client so it works for unauthenticated scraper requests. Falls back
 * to the static /logo.png if no logo is stored in settings.
 */

import { ImageResponse } from "next/og";
import { getSupabaseServer } from "@/lib/supabase/server";

export const runtime     = "nodejs";
export const size        = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OGImage() {
  // Fetch settings without auth — service role bypasses RLS
  let programName  = "The Program Suite";
  let logoSrc: string | null = null;
  let primaryColor = "#e63946";

  try {
    const sb = getSupabaseServer();
    const { data } = await sb
      .from("settings")
      .select("program_name, logo_url, primary_color")
      .limit(1)
      .single();

    if (data) {
      if (data.program_name) programName = data.program_name;
      if (data.logo_url)     logoSrc     = data.logo_url;          // base64 data URL
      if (/^#[0-9a-fA-F]{6}$/.test(data.primary_color ?? ""))
        primaryColor = data.primary_color;
    }
  } catch { /* use defaults */ }

  // Fall back to static public logo if settings has none
  if (!logoSrc) {
    const base = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
    logoSrc = `${base}/logo.png`;
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#09090b",
          position: "relative",
          padding: "60px 80px",
        }}
      >
        {/* Top accent bar */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 10,
            backgroundColor: primaryColor,
          }}
        />

        {/* Logo */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logoSrc}
          width={220}
          height={220}
          style={{
            objectFit: "contain",
            borderRadius: 28,
            marginBottom: 36,
          }}
          alt={programName}
        />

        {/* Program name */}
        <div
          style={{
            color: "#ffffff",
            fontSize: 56,
            fontWeight: 800,
            letterSpacing: "-0.025em",
            textAlign: "center",
            lineHeight: 1.1,
          }}
        >
          {programName}
        </div>

        {/* Tagline */}
        <div
          style={{
            color: "#6b7280",
            fontSize: 24,
            marginTop: 16,
            textAlign: "center",
            letterSpacing: "0.01em",
          }}
        >
          The Operating System for Winning Programs
        </div>

        {/* Bottom accent bar */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 5,
            backgroundColor: primaryColor,
          }}
        />
      </div>
    ),
    { ...size }
  );
}
