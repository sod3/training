"use client";
import { useState } from "react";
import { Check } from "lucide-react";
import { Trainer } from "@/types/trainer";
import { TrainerCard } from "./trainer-card";
export function MatchResultsGrid({
  matches,
}: {
  matches: (Trainer & { reasons: string[] })[];
}) {
  const [sort, setSort] = useState("recommended");
  const sorted = [...matches].sort((a, b) =>
    sort === "rating"
      ? b.rating - a.rating
      : sort === "closest"
        ? (a.distanceKm || 0) - (b.distanceKm || 0)
        : sort === "soon"
          ? Number(b.nextAvailable.startsWith("Today")) -
            Number(a.nextAvailable.startsWith("Today"))
          : (b.matchScore || 0) - (a.matchScore || 0),
  );
  return (
    <>
      <div className="result-toolbar">
        <p className="muted text-sm">
          A match is a starting point. Get to know your coach.
        </p>
        <div className="result-controls">
          <select
            aria-label="Sort your matches"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="recommended">Recommended</option>
            <option value="rating">Highest rated</option>
            <option value="closest">Closest · demo distances</option>
            <option value="soon">Available soonest</option>
          </select>
        </div>
      </div>
      <div className="trainer-grid">
        {sorted.map((t) => (
          <div key={t.id}>
            <TrainerCard trainer={t} />
            <div className="match-reasons">
              {t.reasons.length ? (
                t.reasons.map((r) => (
                  <span key={r}>
                    <Check size={13} />
                    {r}
                  </span>
                ))
              ) : (
                <span>Explore this coach’s approach and schedule.</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
