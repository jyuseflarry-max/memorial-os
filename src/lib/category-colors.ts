import { DrillCategory } from "@/types/drill";

// ── Full color palette (all classes written out for Tailwind static scanning) ──

const PALETTE = [
  { dot: "bg-blue-400",   bar: "bg-blue-400",   text: "text-blue-400",   badge: "text-blue-400 bg-blue-400/10 border-blue-400/20"     },
  { dot: "bg-green-400",  bar: "bg-green-400",  text: "text-green-400",  badge: "text-green-400 bg-green-400/10 border-green-400/20"   },
  { dot: "bg-yellow-400", bar: "bg-yellow-400", text: "text-yellow-400", badge: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20" },
  { dot: "bg-purple-400", bar: "bg-purple-400", text: "text-purple-400", badge: "text-purple-400 bg-purple-400/10 border-purple-400/20" },
  { dot: "bg-sky-400",    bar: "bg-sky-400",    text: "text-sky-400",    badge: "text-sky-400 bg-sky-400/10 border-sky-400/20"         },
  // Extra slots for custom / unknown categories
  { dot: "bg-orange-400", bar: "bg-orange-400", text: "text-orange-400", badge: "text-orange-400 bg-orange-400/10 border-orange-400/20" },
  { dot: "bg-pink-400",   bar: "bg-pink-400",   text: "text-pink-400",   badge: "text-pink-400 bg-pink-400/10 border-pink-400/20"       },
  { dot: "bg-teal-400",   bar: "bg-teal-400",   text: "text-teal-400",   badge: "text-teal-400 bg-teal-400/10 border-teal-400/20"       },
  { dot: "bg-red-400",    bar: "bg-red-400",    text: "text-red-400",    badge: "text-red-400 bg-red-400/10 border-red-400/20"          },
  { dot: "bg-indigo-400", bar: "bg-indigo-400", text: "text-indigo-400", badge: "text-indigo-400 bg-indigo-400/10 border-indigo-400/20" },
  { dot: "bg-lime-400",   bar: "bg-lime-400",   text: "text-lime-400",   badge: "text-lime-400 bg-lime-400/10 border-lime-400/20"       },
  { dot: "bg-cyan-400",   bar: "bg-cyan-400",   text: "text-cyan-400",   badge: "text-cyan-400 bg-cyan-400/10 border-cyan-400/20"       },
  { dot: "bg-rose-400",   bar: "bg-rose-400",   text: "text-rose-400",   badge: "text-rose-400 bg-rose-400/10 border-rose-400/20"       },
  { dot: "bg-amber-400",  bar: "bg-amber-400",  text: "text-amber-400",  badge: "text-amber-400 bg-amber-400/10 border-amber-400/20"    },
  { dot: "bg-violet-400", bar: "bg-violet-400", text: "text-violet-400", badge: "text-violet-400 bg-violet-400/10 border-violet-400/20" },
];

// Known categories map to fixed palette indices (0–4)
const KNOWN: Record<string, number> = {
  [DrillCategory.Defense]:        0,
  [DrillCategory.Offense]:        1,
  [DrillCategory.Transition]:     2,
  [DrillCategory.SpecialTeams]:   3,
  [DrillCategory.RestTransition]: 4,
};

// Unknown categories get a deterministic slot in 5–14 via string hash
function hashCat(cat: string): number {
  let h = 0;
  for (let i = 0; i < cat.length; i++) h = (h * 31 + cat.charCodeAt(i)) >>> 0;
  return 5 + (h % (PALETTE.length - 5));
}

export function getCatColors(category: string) {
  const idx = KNOWN[category] ?? hashCat(category);
  return PALETTE[idx];
}
