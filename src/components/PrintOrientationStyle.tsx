"use client";

import { useSettings } from "@/context/SettingsContext";

/**
 * Injects dynamic <style> overrides driven by program settings:
 *  - @page orientation for printing
 *  - CSS custom property overrides for brand colors
 */
export default function PrintOrientationStyle() {
  const { settings } = useSettings();

  return (
    <style>{`
      :root {
        --color-mustang-red: ${settings.primary_color};
        --color-mustang-red-dark: ${settings.primary_color_dark};
      }
      @media print {
        @page {
          size: letter ${settings.print_orientation};
        }
      }
    `}</style>
  );
}
