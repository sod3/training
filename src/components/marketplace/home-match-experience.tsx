"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Sparkles, Video } from "lucide-react";
import type { Trainer } from "@/types/trainer";
import { BUDGET_OPTIONS, EXPERIENCE_LEVELS, PREFERRED_TIMES } from "@/lib/catalog";
import { matchesGoal, money } from "@/lib/marketplace";
import { Reveal } from "@/components/motion/reveal";

const fallbackGoals = [
  "Strength & Muscle",
  "Fat Loss & General Fitness",
  "Mobility & Functional Fitness",
];

type AnswerKey = "goal" | "experience" | "time" | "budget";

export function HomeMatchExperience({ trainers }: { trainers: Trainer[] }) {
  const trainerGoals = useMemo(
    () => Array.from(new Set(trainers.map((trainer) => trainer.category).filter((value): value is string => Boolean(value)))).slice(0, 3),
    [trainers],
  );
  const goals = trainerGoals.length ? trainerGoals : fallbackGoals;
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<AnswerKey, string>>({
    goal: goals[0],
    experience: "",
    time: "",
    budget: "",
  });

  const questions: { id: AnswerKey; title: string; options: { label: string; value: string }[] }[] = [
    { id: "goal", title: "What are you working toward?", options: goals.map((value) => ({ label: value, value })) },
    { id: "experience", title: "Where are you starting from?", options: EXPERIENCE_LEVELS.map((value) => ({ label: value, value })) },
    { id: "time", title: "When do you prefer to train?", options: PREFERRED_TIMES.map((value) => ({ label: value, value })) },
    { id: "budget", title: "What feels comfortable per session?", options: BUDGET_OPTIONS.map((item) => ({ label: item.label, value: item.value || "0" })) },
  ];
  const question = questions[step];

  const match = useMemo(() => {
    const budget = Number(answers.budget || 0);
    const candidates = trainers
      .filter((trainer) => matchesGoal(trainer, answers.goal))
      .filter((trainer) => !budget || trainer.basePrice <= budget);
    return candidates[0] ?? trainers.find((trainer) => matchesGoal(trainer, answers.goal)) ?? trainers[0];
  }, [answers.goal, answers.budget, trainers]);

  const params = new URLSearchParams(
    Object.fromEntries(Object.entries(answers).filter(([, value]) => value)),
  ).toString();
  const canContinue = Boolean(answers[question.id]);

  return (
    <section className="home-match-section" aria-labelledby="home-match-title">
      <div className="container home-match-shell">
        <Reveal>
          <div className="home-match-copy">
            <p className="eyebrow"><span className="section-index">02 /</span> GET MATCHED</p>
            <h2 id="home-match-title">
              Less searching.
              <span className="quiet-heading"> More compatibility.</span>
            </h2>
            <p>
              A few preferences narrow the field around what actually matters:
              your goal, level, schedule and budget.
            </p>
          </div>
        </Reveal>

        <div className="home-match-product">
          <div className="match-question-card">
            <div className="match-question-topline">
              <span>0{step + 1} / 04</span>
              <span>ABOUT 30 SECONDS</span>
            </div>
            <div className="match-progress" aria-hidden="true">
              <span style={{ width: `${((step + 1) / questions.length) * 100}%` }} />
            </div>
            <p className="match-question-label" key={question.id}>{question.title}</p>
            <div className="match-goal-grid" role="group" aria-label={question.title}>
              {question.options.map((item) => {
                const selected = answers[question.id] === item.value;
                return (
                  <button
                    key={item.value}
                    type="button"
                    className={selected ? "selected" : ""}
                    aria-pressed={selected}
                    onClick={() => setAnswers((current) => ({ ...current, [question.id]: item.value }))}
                  >
                    <span>{item.label}</span>
                    <span className="match-choice-dot">{selected ? <Check size={13} /> : null}</span>
                  </button>
                );
              })}
            </div>
            <div className="match-step-actions">
              <button
                type="button"
                className="match-back"
                disabled={step === 0}
                onClick={() => setStep((value) => Math.max(0, value - 1))}
              >
                <ArrowLeft size={15} /> Back
              </button>
              {step < questions.length - 1 ? (
                <button
                  type="button"
                  className="btn home-match-cta"
                  disabled={!canContinue}
                  onClick={() => setStep((value) => Math.min(questions.length - 1, value + 1))}
                >
                  Continue <ArrowRight size={16} />
                </button>
              ) : (
                <Link href={`/match?${params}`} className="btn home-match-cta">
                  See my matches <ArrowRight size={16} />
                </Link>
              )}
            </div>
            <p className="home-match-note">No account needed to see your matches.</p>
          </div>

          <div className="match-preview-card" aria-live="polite">
            {match ? (
              <>
                <div className="match-preview-kicker"><Sparkles size={14} /> LIVE MATCH PREVIEW</div>
                <div className="match-preview-media" key={match.id}>
                  <Image
                    src={match.profileImage || "/media/fallback-trainer-profile.avif"}
                    alt={`${match.firstName} ${match.lastName}, personal trainer`}
                    fill
                    sizes="(max-width: 900px) 100vw, 36vw"
                  />
                  <span className="match-score-pill">Strong fit</span>
                </div>
                <div className="match-preview-body">
                  <div>
                    <h3>{match.firstName} {match.lastName}</h3>
                    <p>{match.specialties.slice(0, 2).join(" · ") || match.category}</p>
                  </div>
                  <div className="match-preview-meta">
                    <span><Video size={13} /> Live 1-on-1 online</span>
                    <span>From {money(match.basePrice)} / session</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="match-preview-empty">
                <Sparkles size={22} />
                <h3>Your matches appear here.</h3>
                <p>As approved trainers join Spotter, this preview updates using real marketplace data.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
