import {
  BUDGET_OPTIONS,
  EXPERIENCE_LEVELS,
  PREFERRED_TIMES,
} from "@/lib/catalog";

export const MATCH_STORAGE_KEY = "spotter_match_answers";

export const MATCH_QUESTION_IDS = [
  "goal",
  "experience",
  "time",
  "budget",
] as const;

export type MatchAnswerKey = (typeof MATCH_QUESTION_IDS)[number];

export type MatchAnswers = Record<MatchAnswerKey, string>;

export type MatchQuestion = {
  id: MatchAnswerKey;
  title: string;
  copy: string;
  options: { label: string; value: string }[];
};

export const emptyMatchAnswers: MatchAnswers = {
  goal: "",
  experience: "",
  time: "",
  budget: "",
};

export function normalizeMatchAnswers(
  value?: Partial<Record<string, string>> | null,
): MatchAnswers {
  return MATCH_QUESTION_IDS.reduce<MatchAnswers>(
    (answers, key) => {
      answers[key] = typeof value?.[key] === "string" ? value[key] : "";
      return answers;
    },
    { ...emptyMatchAnswers },
  );
}

export function mergeMatchAnswers(
  stored: Partial<MatchAnswers>,
  incoming: Partial<MatchAnswers>,
) {
  return normalizeMatchAnswers(
    Object.fromEntries(
      MATCH_QUESTION_IDS.map((key) => [key, incoming[key] || stored[key] || ""]),
    ),
  );
}

export function findFirstIncompleteMatchStep(answers: MatchAnswers) {
  const index = MATCH_QUESTION_IDS.findIndex((key) => !answers[key]);
  return index === -1 ? MATCH_QUESTION_IDS.length : index;
}

export function isMatchComplete(answers: MatchAnswers) {
  return findFirstIncompleteMatchStep(answers) === MATCH_QUESTION_IDS.length;
}

export function matchParams(answers: MatchAnswers, includeTimezone = false) {
  const entries: [string, string][] = MATCH_QUESTION_IDS.flatMap((key) =>
    answers[key] ? [[key, answers[key]]] : [],
  );
  if (includeTimezone && typeof Intl !== "undefined") {
    entries.push([
      "timezone",
      Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    ]);
  }
  return new URLSearchParams(entries);
}

export function readStoredMatchAnswers() {
  if (typeof window === "undefined") return emptyMatchAnswers;
  try {
    const value = JSON.parse(sessionStorage.getItem(MATCH_STORAGE_KEY) || "{}");
    return normalizeMatchAnswers(value);
  } catch {
    return emptyMatchAnswers;
  }
}

export function writeStoredMatchAnswers(answers: MatchAnswers) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(MATCH_STORAGE_KEY, JSON.stringify(answers));
}

export function buildMatchQuestions(goals: string[]): MatchQuestion[] {
  return [
    {
      id: "goal",
      title: "What are you working toward?",
      copy: "Choose the closest fit. We only match you with approved trainers.",
      options: goals.map((value) => ({ label: value, value })),
    },
    {
      id: "experience",
      title: "Where are you starting from?",
      copy: "This helps us favor coaches whose experience fits your current level.",
      options: EXPERIENCE_LEVELS.map((value) => ({ label: value, value })),
    },
    {
      id: "time",
      title: "When do you prefer to train?",
      copy: "We compare this with real trainer availability over the next seven days.",
      options: PREFERRED_TIMES.map((value) => ({ label: value, value })),
    },
    {
      id: "budget",
      title: "What feels comfortable per session?",
      copy: "We use each trainer's real active package pricing.",
      options: BUDGET_OPTIONS.map((item) => ({
        label: item.label,
        value: item.value || "0",
      })),
    },
  ];
}
