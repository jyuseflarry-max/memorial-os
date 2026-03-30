"use client";
import type { TrafficLightStatus, ReadinessStatus } from "@/types/strength";

const CONFIG: Record<TrafficLightStatus | ReadinessStatus, { dot: string; label: string; ring: string }> = {
  green:  { dot: "bg-green-500",  label: "Progress",  ring: "ring-green-500/30"  },
  yellow: { dot: "bg-yellow-400", label: "Plateau",   ring: "ring-yellow-400/30" },
  red:    { dot: "bg-red-500",    label: "Regress",   ring: "ring-red-500/30"    },
  gray:   { dot: "bg-gray-600",   label: "No Data",   ring: "ring-gray-600/30"   },
};

export function TrafficLightBadge({
  status,
  showLabel = false,
  size = "md",
  pulse = false,
}: {
  status: TrafficLightStatus | ReadinessStatus;
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
  pulse?: boolean;
}) {
  const cfg  = CONFIG[status] ?? CONFIG.gray;
  const dotSize = size === "sm" ? "w-2 h-2" : size === "lg" ? "w-4 h-4" : "w-3 h-3";
  const textSize = size === "sm" ? "text-[10px]" : "text-xs";

  return (
    <span className={`inline-flex items-center gap-1.5 ${showLabel ? `px-2 py-0.5 rounded-full ring-1 ${cfg.ring} bg-gray-900` : ""}`}>
      <span className={`${dotSize} rounded-full ${cfg.dot} shrink-0 ${pulse && status !== "gray" ? "animate-pulse" : ""}`} />
      {showLabel && <span className={`${textSize} font-mono font-semibold text-gray-300`}>{cfg.label}</span>}
    </span>
  );
}

export const READINESS_LABELS: Record<ReadinessStatus, string> = {
  green:  "Ready",
  yellow: "Moderate",
  red:    "Rest Day",
};
