import { Trainer } from "@/types/trainer";
export const money = (n: number) => `PKR ${n.toLocaleString("en-PK")}`;
export const locations = [
  "DHA",
  "Clifton",
  "PECHS",
  "Gulshan",
  "North Nazimabad",
  "Bahria Town Karachi",
];
export const goals = [
  "Lose Weight",
  "Build Muscle",
  "Increase Strength",
  "Mobility",
  "Body Transformation",
  "Sports Performance",
  "General Fitness",
];
export const goalTerms: Record<string, string[]> = {
  "lose weight": ["weight loss", "fat loss"],
  "build muscle": ["muscle"],
  "increase strength": ["strength"],
  "body transformation": ["fat loss", "weight loss", "muscle"],
  "general fitness": ["general fitness", "functional", "conditioning"],
};
export const matchesGoal = (t: Trainer, goal: string) =>
  !goal ||
  (goalTerms[goal.toLowerCase()] || [goal.toLowerCase()]).some((term) =>
    t.specialties.some((s) => s.toLowerCase().includes(term)),
  );
export function dateKey(offset = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function slots(t: Trainer, date: string) {
  const hour = t.nextAvailable.split(", ")[1] || "6:00 PM";
  return date === dateKey()
    ? t.nextAvailable.startsWith("Today")
      ? [hour]
      : []
    : ["8:00 AM", "5:00 PM", hour].filter((v, i, a) => a.indexOf(v) === i);
}
