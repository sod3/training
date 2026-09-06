"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, Check, Sparkles, Video } from "lucide-react";
import type { Trainer } from "@/types/trainer";
import { matchesGoal, money } from "@/lib/marketplace";
import { Reveal } from "@/components/motion/reveal";

const featuredGoals = [
  "Strength & Muscle",
  "Fat Loss & General Fitness",
  "Mobility & Functional Fitness",
];

export function HomeMatchExperience({ trainers }: { trainers: Trainer[] }) {
  const [goal, setGoal] = useState(featuredGoals[0]);
  const trainerGoals = useMemo(
    () => Array.from(new Set(trainers.map((trainer) => trainer.category).filter((value): value is string => Boolean(value)))).slice(0, 3),
    [trainers],
  );
  const availableGoals = trainerGoals.length ? trainerGoals : featuredGoals;
  const effectiveGoal = availableGoals.includes(goal) ? goal : availableGoals[0];
  const match = useMemo(
    () => trainers.find((trainer) => matchesGoal(trainer, effectiveGoal)) ?? trainers[0],
    [effectiveGoal, trainers],
  );

  return (
    <section className="home-match-section" aria-labelledby="home-match-title">
      <div className="container home-match-shell">
        <Reveal>
          <div className="home-match-copy">
            <p className="eyebrow">
              <span className="section-index">02 /</span> FIND YOUR MATCH
            </p>
            <h2 id="home-match-title">
              Less searching.
              <br />
              <span className="quiet-heading">More compatibility.</span>
            </h2>
            <p>
              Tell Spotter what matters to you. We narrow the field around your
              goal, experience level, preferred schedule and budget.
            </p>
          </div>
        </Reveal>

        <div className="home-match-product">
          <div className="match-question-card">
            <div className="match-question-topline">
              <span>01 / 04</span>
              <span>About 30 seconds</span>
            </div>
            <p className="match-question-label">What are you working toward?</p>
            <div
              className="match-goal-grid"
              role="group"
              aria-label="Choose a fitness goal"
            >
              {availableGoals.map((item) => (
                <button
                  key={item}
                  type="button"
                  className={effectiveGoal === item ? "selected" : ""}
                  aria-pressed={effectiveGoal === item}
                  onClick={() => setGoal(item)}
                >
                  <span>{item}</span>
                  <span className="match-choice-dot">
                    {effectiveGoal === item ? <Check size={13} /> : null}
                  </span>
                </button>
              ))}
            </div>
            <Link
              href={`/match?${new URLSearchParams({ goal: effectiveGoal }).toString()}`}
              className="btn home-match-cta"
            >
              Continue matching <ArrowRight size={17} />
            </Link>
            <p className="home-match-note">
              No account needed to see your matches.
            </p>
          </div>

          {match && (
            <div className="match-preview-card" aria-live="polite">
              <div className="match-preview-kicker">
                <Sparkles size={15} /> Featured coach for {effectiveGoal.toLowerCase()}
              </div>
              <div className="match-preview-media">
                <Image
                  src={match.profileImage}
                  alt={`${match.firstName} ${match.lastName}, personal trainer`}
                  fill
                  sizes="(max-width: 900px) 100vw, 36vw"
                />
                <span className="match-score-pill">Strong fit</span>
              </div>
              <div className="match-preview-body">
                <div>
                  <h3>
                    {match.firstName} {match.lastName}
                  </h3>
                  <p>{match.specialties.slice(0, 2).join(" · ")}</p>
                </div>
                <div className="match-preview-meta">
                  <span>
                    <Video size={13} /> 1-on-1 Online
                  </span>
                  <span>From {money(match.basePrice)} / session</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
