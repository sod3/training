import { Trainer } from "@/types/trainer";
export { DEFAULT_CATEGORIES as goals } from "@/lib/catalog";

export const money = (n: number) => `PKR ${n.toLocaleString("en-PK")}`;

export const goalTerms: Record<string, string[]> = {
  "strength & muscle": ["strength", "muscle", "bodybuilding"],
  "fat loss & general fitness": ["fat loss", "weight loss", "general fitness", "hiit", "conditioning"],
  "mobility & functional fitness": ["mobility", "flexibility", "functional", "core"],
};

export const matchesGoal = (t: Trainer, goal: string) =>
  !goal ||
  t.category?.toLowerCase() === goal.toLowerCase() ||
  (goalTerms[goal.toLowerCase()] || [goal.toLowerCase()]).some((term) =>
    t.specialties.some((s) => s.toLowerCase().includes(term)),
  );

export function dateKey(offset = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function localAvailabilityLabel(t: Pick<Trainer, "nextAvailable" | "nextAvailableAt">) {
  if (!t.nextAvailableAt) return t.nextAvailable;
  const date = new Date(t.nextAvailableAt);
  if (Number.isNaN(date.getTime())) return t.nextAvailable;
  return date.toLocaleString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}
