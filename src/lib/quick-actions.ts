import { Drill, DrillCategory, ShotType } from "@/types/drill";

/**
 * Quick-action pseudo-drills.
 * shot_density: 0 — they contribute 0 shots to the Mission Profile.
 * These are NOT stored in MOCK_DRILLS so they don't appear in the Drill Vault.
 */
export const QUICK_ACTIONS: Drill[] = [
  {
    id: "qa-water-break",
    name: "Water Break",
    category: DrillCategory.RestTransition,
    sub_category: "Non-Activity",
    shot_density: 0,
    shot_type: ShotType.None,
    intensity: 1,
    video_url: "",
  },
  {
    id: "qa-transition",
    name: "Transition",
    category: DrillCategory.RestTransition,
    sub_category: "Non-Activity",
    shot_density: 0,
    shot_type: ShotType.None,
    intensity: 1,
    video_url: "",
  },
];
