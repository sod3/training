"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  MatchAnswers,
  MatchAnswerKey,
  mergeMatchAnswers,
  normalizeMatchAnswers,
  readStoredMatchAnswers,
  writeStoredMatchAnswers,
} from "@/lib/match-state";

export function useMatchState(initial?: Partial<Record<string, string>>) {
  const [answers, setAnswers] = useState<MatchAnswers>(() =>
    normalizeMatchAnswers(initial),
  );
  const [hydrated, setHydrated] = useState(false);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    const incoming = normalizeMatchAnswers(initial);
    const restored = mergeMatchAnswers(readStoredMatchAnswers(), incoming);
    queueMicrotask(() => {
      setAnswers(restored);
      setHydrated(true);
    });
  }, [initial]);

  useEffect(() => {
    if (hydrated) writeStoredMatchAnswers(answers);
  }, [answers, hydrated]);

  const answer = useCallback((key: MatchAnswerKey, value: string) => {
    setAnswers((current) => ({ ...current, [key]: value }));
  }, []);

  return { answers, answer, setAnswers, hydrated };
}
