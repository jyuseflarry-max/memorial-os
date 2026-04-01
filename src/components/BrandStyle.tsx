"use client";

/**
 * BrandStyle — injects tenant primary color as a CSS variable override.
 *
 * All components use `coaches-red` / `coaches-red-dark` utility classes which
 * resolve to `var(--color-coaches-red)` / `var(--color-coaches-red-dark)`.
 * Overriding those two variables here is enough to re-theme the entire UI
 * without touching a single component.
 *
 * Must be rendered inside <SettingsProvider>.
 */

import { useSettings } from "@/context/SettingsContext";

export default function BrandStyle() {
  const { settings } = useSettings();

  // Guard: only inject when we have valid hex values
  const primary     = /^#[0-9a-fA-F]{6}$/.test(settings.primary_color)      ? settings.primary_color      : null;
  const primaryDark = /^#[0-9a-fA-F]{6}$/.test(settings.primary_color_dark) ? settings.primary_color_dark : null;

  if (!primary && !primaryDark) return null;

  const css = `:root {
${primary     ? `  --color-coaches-red: ${primary};` : ""}
${primaryDark ? `  --color-coaches-red-dark: ${primaryDark};` : ""}
}`;

  return <style>{css}</style>;
}
