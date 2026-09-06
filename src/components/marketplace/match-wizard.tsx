"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, MotionConfig } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Target,
  MapPin,
  Clock,
  House,
  ShieldCheck,
} from "lucide-react";
import { goals, locations } from "@/lib/marketplace";
const questions = [
  {
    id: "goal",
    title: "What are you working toward?",
    copy: "A starting point is all you need. Your coach will help with the rest.",
    options: goals,
    icon: Target,
  },
];
export function MatchWizard({ initial }: { initial: Record<string, string> }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState(initial);
  const [processing, setProcessing] = useState(false);
  const router = useRouter();
  const q = questions[step];
  const Icon = q.icon;
  const next = () => {
    if (!answers[q.id]) return;
    if (step < questions.length - 1) setStep(step + 1);
    else {
      setProcessing(true);
      router.push(`/match/results?${new URLSearchParams(answers)}`);
    }
  };
  return (
    <MotionConfig reducedMotion="user">
      <div className="quiz-page">
        <div className="quiz-top">
          <button
            aria-label="Previous question"
            disabled={step === 0 || processing}
            onClick={() => setStep(step - 1)}
          >
            <ArrowLeft size={19} />
          </button>
          <div className="quiz-progress">
            <div
              style={{ width: `${((step + 1) / questions.length) * 100}%` }}
            />
          </div>
          <span>
            {step + 1} OF {questions.length}
          </span>
        </div>
        {processing ? (
          <div className="matching-status" role="status">
            <ShieldCheck size={45} />
            <h1>Finding your people.</h1>
            <p>A little thought now. A better fit for you.</p>
            {[
              "Matching your goal",
              "Finding your best matches",
            ].map((s, i) => (
              <motion.div
                key={s}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.22 }}
              >
                <Check size={17} />
                {s}
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
              <span className="quiz-icon">
                <Icon size={24} />
              </span>
              <p className="eyebrow">LET’S MAKE THIS PERSONAL</p>
              <h1>{q.title}</h1>
              <p>{q.copy}</p>
              <div className="quiz-options">
                {q.options.map((option) => (
                  <button
                    key={option}
                    className={answers[q.id] === option ? "selected" : ""}
                    aria-pressed={answers[q.id] === option}
                    onClick={() => setAnswers({ ...answers, [q.id]: option })}
                  >
                    <span>{option}</span>
                    <span className="option-check">
                      {answers[q.id] === option && <Check size={15} />}
                    </span>
                  </button>
                ))}
              </div>
              <button className="btn" disabled={!answers[q.id]} onClick={next}>
                {step === questions.length - 1 ? "Find my matches" : "Continue"}
                <ArrowRight size={18} />
              </button>
              <small>No commitment. Just a better place to start.</small>
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </MotionConfig>
  );
}
