"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, MotionConfig } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Clock, ShieldCheck, Target, UserRound, Wallet } from "lucide-react";
import { useApi } from "@/lib/client-api";
import { BUDGET_OPTIONS, DEFAULT_CATEGORIES, EXPERIENCE_LEVELS, PREFERRED_TIMES } from "@/lib/catalog";

type FacetResponse = { facets?: { categories?: { name: string; count: number }[] } };

type Question = {
  id: "goal" | "experience" | "time" | "budget";
  title: string;
  copy: string;
  options: { label: string; value: string }[];
  icon: typeof Target;
};

export function MatchWizard({ initial }: { initial: Record<string, string> }) {
  const { data } = useApi<FacetResponse>("trainers?limit=1");
  const categories = data?.facets?.categories?.map((item) => item.name).filter(Boolean) || [];
  const availableCategories = categories.length ? categories : [...DEFAULT_CATEGORIES];
  const questions = useMemo<Question[]>(
    () => [
      {
        id: "goal",
        title: "What are you working toward?",
        copy: "Choose the closest fit. We only match you with approved trainers.",
        options: availableCategories.map((value) => ({ label: value, value })),
        icon: Target,
      },
      {
        id: "experience",
        title: "Where are you starting from?",
        copy: "This helps us favor coaches whose experience fits your current level.",
        options: EXPERIENCE_LEVELS.map((value) => ({ label: value, value })),
        icon: UserRound,
      },
      {
        id: "time",
        title: "When do you usually want to train?",
        copy: "We compare this with real trainer availability over the next seven days.",
        options: PREFERRED_TIMES.map((value) => ({ label: value, value })),
        icon: Clock,
      },
      {
        id: "budget",
        title: "What feels comfortable per session?",
        copy: "We use each trainer’s real active package pricing—not placeholder prices.",
        options: BUDGET_OPTIONS.map((item) => ({ label: item.label, value: item.value || "0" })),
        icon: Wallet,
      },
    ],
    [availableCategories.join("|")],
  );

  const normalizedInitial = {
    goal: initial.goal || "",
    experience: initial.experience || "",
    time: initial.time || "",
    budget: initial.budget || "",
  };
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>(normalizedInitial);
  const [processing, setProcessing] = useState(false);
  const router = useRouter();
  const q = questions[step];
  const Icon = q.icon;

  const next = () => {
    if (!answers[q.id]) return;
    if (step < questions.length - 1) {
      setStep((value) => value + 1);
      return;
    }
    setProcessing(true);
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    router.push(`/match/results?${new URLSearchParams({ ...answers, timezone }).toString()}`);
  };

  return (
    <MotionConfig reducedMotion="user">
      <div className="quiz-page">
        <div className="quiz-top">
          <button
            aria-label="Previous question"
            disabled={step === 0 || processing}
            onClick={() => setStep((value) => value - 1)}
          >
            <ArrowLeft size={19} />
          </button>
          <div className="quiz-progress">
            <div style={{ width: `${((step + 1) / questions.length) * 100}%` }} />
          </div>
          <span>{step + 1} OF {questions.length}</span>
        </div>

        {processing ? (
          <div className="matching-status" role="status">
            <ShieldCheck size={45} />
            <h1>Finding your best fits.</h1>
            <p>Comparing real trainer profiles, pricing and availability.</p>
            {["Matching your goal", "Checking your budget", "Comparing availability"].map((text, index) => (
              <motion.div key={text} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: index * 0.18 }}>
                <Check size={17} /> {text}
              </motion.div>
            ))}
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={q.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="quiz-content"
            >
              <span className="quiz-icon"><Icon size={24} /></span>
              <p className="eyebrow">A BETTER START IN FOUR QUESTIONS</p>
              <h1>{q.title}</h1>
              <p>{q.copy}</p>
              <div className="quiz-options">
                {q.options.map((option) => (
                  <button
                    key={option.value}
                    className={answers[q.id] === option.value ? "selected" : ""}
                    aria-pressed={answers[q.id] === option.value}
                    onClick={() => setAnswers((current) => ({ ...current, [q.id]: option.value }))}
                  >
                    <span>{option.label}</span>
                    <span className="option-check">{answers[q.id] === option.value && <Check size={15} />}</span>
                  </button>
                ))}
              </div>
              <button className="btn" disabled={!answers[q.id]} onClick={next}>
                {step === questions.length - 1 ? "Show my matches" : "Continue"}
                <ArrowRight size={18} />
              </button>
              <small>No account needed. Matching uses current approved trainer data.</small>
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </MotionConfig>
  );
}
