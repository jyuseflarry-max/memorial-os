import { Drill, DrillCategory, ShotType } from "@/types/drill";

export const SYSTEM_DRILL_IDS = {
  WATER_BREAK: "00000000-0000-0000-0000-000000000001",
  TRANSITION:  "00000000-0000-0000-0000-000000000002",
} as const;

/**
 * Quick-action drills. These exist as real rows in the drills table but are
 * excluded from the Drill Vault display — the Quick Add buttons are the
 * intended way to add them to a session.
 */
export const QUICK_ACTIONS: Drill[] = [
  {
    id: SYSTEM_DRILL_IDS.WATER_BREAK,
    name: "Water Break",
    category: DrillCategory.RestTransition,
    sub_category: "Non-Activity",
    shot_density: 0,
    shot_type: ShotType.None,
    intensity: 1,
    video_url: "",
  },
  {
    id: SYSTEM_DRILL_IDS.TRANSITION,
    name: "Transition",
    category: DrillCategory.RestTransition,
    sub_category: "Non-Activity",
    shot_density: 0,
    shot_type: ShotType.None,
    intensity: 1,
    video_url: "",
  },
];
