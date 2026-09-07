"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Sparkles, Video } from "lucide-react";
import type { Trainer } from "@/types/trainer";
import { matchesGoal, money } from "@/lib/marketplace";
import { Reveal } from "@/components/motion/reveal";
import { useMatchState } from "@/hooks/use-match-state";
import {
  buildMatchQuestions,
  findFirstIncompleteMatchStep,
  matchParams,
} from "@/lib/match-state";

const fallbackGoals = [
  "Strength & Muscle",
  "Fat Loss & General Fitness",
  "Mobility & Functional Fitness",
];

export function HomeMatchExperience({ trainers }: { trainers: Trainer[] }) {
  const trainerGoals = useMemo(
    () => Array.from(new Set(trainers.map((trainer) => trainer.category).filter((value): value is string => Boolean(value)))).slice(0, 3),
    [trainers],
  );
  const goals = trainerGoals.length ? trainerGoals : fallbackGoals;
  const [step, setStep] = useState(0);
  const { answers, answer, hydrated } = useMatchState();
  const questions = useMemo(() => buildMatchQuestions(goals), [goals]);
  const question = questions[step];
  const restoredStep = useRef(false);

  useEffect(() => {
    if (!hydrated || restoredStep.current) return;
    restoredStep.current = true;
    const nextStep = Math.min(
      findFirstIncompleteMatchStep(answers),
      questions.length - 1,
    );
    queueMicrotask(() => setStep(nextStep));
  }, [answers, hydrated, questions.length]);

  const match = useMemo(() => {
    const budget = Number(answers.budget || 0);
    const candidates = trainers
      .filter((trainer) => matchesGoal(trainer, answers.goal))
      .filter((trainer) => !budget || trainer.basePrice <= budget);
    return candidates[0] ?? trainers.find((trainer) => matchesGoal(trainer, answers.goal)) ?? trainers[0];
  }, [answers.goal, answers.budget, trainers]);

  const params = matchParams(answers, true).toString();
  const canContinue = Boolean(answers[question.id]);

  return (
    <section className="home-match-section" aria-labelledby="home-match-title">
      <div className="container home-match-shell">
        <Reveal>
          <div className="home-match-copy">
            <p className="eyebrow"><span className="section-index">02 /</span> GET MATCHED</p>
            <h2 id="home-match-title">
              Your next coach,
              <span className="quiet-heading"> narrowed to fit.</span>
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
                    onClick={() => answer(question.id, item.value)}
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
                <Link href={`/match/results?${params}`} className="btn home-match-cta">
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
                    {match.packages.length > 0 && <span>From {money(match.basePrice)} / session</span>}
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
