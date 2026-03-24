import { DrillGroup } from "@/types/grouping";

/** Fisher-Yates shuffle — returns a new array, does not mutate the input. */
export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Randomly distribute playerIds across groupCount groups (Group A, B, C…). */
export function distributeEvenly(playerIds: string[], groupCount: number): DrillGroup[] {
  const shuffled = shuffle(playerIds);
  const groups: DrillGroup[] = Array.from({ length: groupCount }, (_, i) => ({
    name: `Group ${String.fromCharCode(65 + i)}`,
    playerIds: [],
  }));
  shuffled.forEach((id, idx) => groups[idx % groupCount].playerIds.push(id));
  return groups;
}
