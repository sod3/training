"use client";

import { Check, Sparkles } from "lucide-react";
import type { Trainer } from "@/types/trainer";
import { TrainerCard } from "./trainer-card";

export function MatchResultsGrid({
  matches,
  label = "Best Matches for You",
}: {
  matches: Trainer[];
  label?: string;
}) {
  if (!matches.length) return null;
  return (
    <section className="mt-10" aria-label={label}>
      <div className="result-toolbar">
        <div>
          <p className="eyebrow"><Sparkles size={14} /> PERSONALIZED RESULTS</p>
          <h2>{label}</h2>
        </div>
      </div>
      <div className="trainer-grid">
        {matches.map((trainer) => (
          <div key={trainer.id}>
            <TrainerCard trainer={trainer} />
            <div className="match-reasons">
              {typeof trainer.matchScore === "number" && <strong>{trainer.matchScore}% match</strong>}
              {(trainer.matchReasons || []).length ? (
                trainer.matchReasons!.map((reason) => (
                  <span key={reason}><Check size={13} />{reason}</span>
                ))
              ) : (
                <span>Explore this trainer’s approach and current schedule.</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
