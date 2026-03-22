"use client";

import { useSettings } from "@/context/SettingsContext";

/**
 * Injects a <style> tag that overrides the @page size based on program settings.
 * Must be rendered inside SettingsProvider.
 */
export default function PrintOrientationStyle() {
  const { settings } = useSettings();

  return (
    <style>{`
      @media print {
        @page {
          size: letter ${settings.print_orientation};
        }
      }
    `}</style>
  );
}
