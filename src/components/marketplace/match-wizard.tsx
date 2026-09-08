"use client";
import Image from "next/image";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, MotionConfig } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Clock, ShieldCheck, Target, UserRound, Wallet } from "lucide-react";
import { useApi } from "@/lib/client-api";
import { DEFAULT_CATEGORIES } from "@/lib/catalog";
import { useMatchState } from "@/hooks/use-match-state";
import {
  buildMatchQuestions,
  findFirstIncompleteMatchStep,
  isMatchComplete,
  matchParams,
  type MatchAnswerKey,
} from "@/lib/match-state";

type FacetResponse = { facets?: { categories?: { name: string; count: number }[] } };

type Question = {
  id: MatchAnswerKey;
  title: string;
  copy: string;
  options: { label: string; value: string }[];
  icon: typeof Target;
};

export function MatchWizard({
  initial,
  edit = false,
}: {
  initial: Record<string, string>;
  edit?: boolean;
}) {
  const { data } = useApi<FacetResponse>("trainers?limit=1");
  const categories = data?.facets?.categories?.map((item) => item.name).filter(Boolean) || [];
  const availableCategories = Array.from(new Set([...DEFAULT_CATEGORIES, ...categories]));
  const questions: Question[] = buildMatchQuestions(availableCategories).map(
    (question) => ({
      ...question,
      icon: {
        goal: Target,
        experience: UserRound,
        time: Clock,
        budget: Wallet,
      }[question.id],
    }),
  );

  const [step, setStep] = useState(0);
  const { answers, answer, hydrated } = useMatchState(initial);
  const [processing, setProcessing] = useState(false);
  const router = useRouter();
  const q = questions[step];
  const Icon = q.icon;
  const restoredStep = useRef(false);

  useEffect(() => {
    if (!hydrated || restoredStep.current) return;
    restoredStep.current = true;
    const nextStep = edit ? 0 : Math.min(findFirstIncompleteMatchStep(answers), questions.length - 1);
    queueMicrotask(() => setStep(nextStep));
  }, [answers, edit, hydrated, questions.length]);

  const next = () => {
    if (!answers[q.id]) return;
    if (step < questions.length - 1) {
      setStep((value) => value + 1);
      return;
    }
    setProcessing(true);
    router.push(`/match/results?${matchParams(answers, true).toString()}`);
  };

  return (
    <MotionConfig reducedMotion="user">
      <div className="quiz-page premium-split">
        <div className="premium-split-media" aria-hidden="true">
          <Image
            src="/media/get-matched.avif"
            alt="Spotter matchmaking"
            fill
            priority
            quality={90}
            className="premium-image"
            sizes="(max-width: 1024px) 100vw, 50vw"
          />
          <div className="image-gradient" />
          <div className="premium-split-overlay">
            <p className="eyebrow">YOUR PERFECT MATCH</p>
            <h2>Find the trainer<br />who fits your life.</h2>
          </div>
        </div>
        <div className="premium-split-content">
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
              <div className={`quiz-options ${q.id === "goal" || q.options.length > 4 ? "quiz-options-grid-3" : ""}`}>
                {q.options.map((option) => (
                  <button
                    key={option.value}
                    className={answers[q.id] === option.value ? "selected" : ""}
                    aria-pressed={answers[q.id] === option.value}
                    onClick={() => answer(q.id, option.value)}
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
            </motion.div>
          </AnimatePresence>
        )}
        </div>
      </div>
    </MotionConfig>
  );
}
