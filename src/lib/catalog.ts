export const DEFAULT_CATEGORIES = [
  "Strength & Muscle",
  "Fat Loss & General Fitness",
  "Mobility & Functional Fitness",
] as const;

export const DEFAULT_SPECIALTIES = [
  "Strength Training",
  "Muscle Building",
  "Bodybuilding",
  "Fat Loss",
  "General Fitness",
  "HIIT",
  "Beginner Fitness",
  "Functional Training",
  "Mobility",
  "Flexibility",
  "Core Training",
] as const;

export const DEFAULT_LANGUAGES = [
  "English",
  "Urdu",
  "Sindhi",
  "Punjabi",
  "Pashto",
] as const;

export const EXPERIENCE_LEVELS = ["Beginner", "Intermediate", "Advanced"] as const;
export const PREFERRED_TIMES = ["Morning", "Afternoon", "Evening", "Flexible"] as const;

export const BUDGET_OPTIONS = [
  { label: "Up to PKR 1,500 / session", value: "1500" },
  { label: "Up to PKR 2,500 / session", value: "2500" },
  { label: "Up to PKR 4,000 / session", value: "4000" },
  { label: "Up to PKR 6,000 / session", value: "6000" },
  { label: "Flexible budget", value: "" },
] as const;
