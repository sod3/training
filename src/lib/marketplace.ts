import { Trainer } from "@/types/trainer";
export { DEFAULT_CATEGORIES as goals } from "@/lib/catalog";

export const money = (n: number) => `PKR ${n.toLocaleString("en-PK")}`;

export const goalTerms: Record<string, string[]> = {
  "strength & muscle": ["strength", "muscle", "bodybuilding", "hypertrophy", "powerlifting"],
  "strength and muscle building": ["strength", "muscle", "bodybuilding", "hypertrophy", "powerlifting", "building"],
  "fat loss": ["fat loss", "weight loss", "weight management", "slimming", "shred"],
  "mobility": ["mobility", "flexibility", "stretching", "joint health", "range of motion"],
  "general fitness": ["general fitness", "fitness", "wellness", "health", "active"],
  "body recomposition": ["recomposition", "recomp", "fat loss", "muscle", "toning", "body transformation"],
  "mobility & flexibility": ["mobility", "flexibility", "stretching", "joint health", "range of motion"],
  "functional fitness": ["functional", "functional training", "crossfit", "movement", "athletic"],
  "beginner fitness": ["beginner", "novice", "starter", "foundation", "basics", "introduction"],
  "hiit & conditioning": ["hiit", "conditioning", "stamina", "cardio", "endurance", "circuit"],
  "core & posture": ["core", "posture", "abs", "stability", "pilates", "back health"],

  // Legacy category compatibility
  "fat loss & general fitness": ["fat loss", "weight loss", "general fitness", "hiit", "conditioning"],
  "mobility & functional fitness": ["mobility", "flexibility", "functional", "core"],
};

export const matchesGoal = (t: Trainer, goal: string) => {
  if (!goal) return true;
  const target = goal.toLowerCase();
  const cat = (t.category || "").toLowerCase();
  if (cat === target) return true;

  const terms = goalTerms[target] || [target];
  if (cat && terms.some((term) => cat.includes(term))) return true;

  return terms.some((term) =>
    t.specialties.some((s) => s.toLowerCase().includes(term)),
  );
};

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
