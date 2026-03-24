import { PlayerStatus } from "@/types/player";

const COLORS: Record<"default" | "subtle", Record<PlayerStatus, string>> = {
  // "default" — green Active, used where status is the primary readiness indicator (roster)
  default: {
    [PlayerStatus.Active]:     "text-green-400 bg-green-400/10 border-green-400/20",
    [PlayerStatus.Out]:        "text-red-400 bg-red-400/10 border-red-400/20",
    [PlayerStatus.Restricted]: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
  },
  // "subtle" — gray Active, used alongside a separate traffic-light indicator (player vibe page)
  subtle: {
    [PlayerStatus.Active]:     "text-gray-300 bg-gray-700 border-gray-600",
    [PlayerStatus.Out]:        "text-red-400 bg-red-400/10 border-red-400/20",
    [PlayerStatus.Restricted]: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
  },
};

export function StatusBadge({
  status,
  variant = "default",
}: {
  status: PlayerStatus;
  variant?: "default" | "subtle";
}) {
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${COLORS[variant][status]}`}>
      {status}
    </span>
  );
}
