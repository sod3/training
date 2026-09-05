import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { trainers } from "@/data/trainers";
import { matchesGoal } from "@/lib/marketplace";
import { MatchResultsGrid } from "@/components/marketplace/match-results-grid";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const a = await searchParams;
  const matches = trainers
    .map((t) => {
      const reasons: string[] = [];
      let total = 0;
      let hit = 0;
      const test = (active: boolean, matched: boolean, reason: string) => {
        if (active) {
          total++;
          if (matched) {
            hit++;
            reasons.push(reason);
          }
        }
      };
      test(!!a.goal, matchesGoal(t, a.goal || ""), "Matches your goal");
      test(
        !!a.type,
        t.trainingTypes.some((type) => type === a.type),
        `Offers ${a.type} training`,
      );
      test(
        !!a.location,
        t.locations.some((l) =>
          l.toLowerCase().includes((a.location || "").toLowerCase()),
        ),
        "Serves your area",
      );
      test(
        !!a.budget && a.budget !== "Flexible",
        a.budget?.includes("1,500")
          ? t.basePrice <= 2500
          : a.budget?.includes("2,500")
            ? t.basePrice >= 2500 && t.basePrice <= 4000
            : t.basePrice >= 4000,
        "Within your budget",
      );
      test(
        !!a.time && a.time !== "Flexible",
        a.time === "Morning"
          ? t.nextAvailable.includes("AM")
          : a.time === "Evening"
            ? t.nextAvailable.includes("PM")
            : false,
        "Fits your preferred time",
      );
      return {
        ...t,
        matchScore: total ? Math.round((hit / total) * 100) : undefined,
        reasons,
      };
    })
    .sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0))
    .slice(0, 3);
  return (
    <div className="container section">
      <Link
        className="text-link"
        href={`/match?${new URLSearchParams(Object.fromEntries(Object.entries(a).filter((e): e is [string, string] => !!e[1])))}`}
      >
        <ArrowLeft size={16} />
        Edit your preferences
      </Link>
      <div className="page-heading mt-9">
        <p className="eyebrow">A LITTLE MORE PERSONAL</p>
        <h1>{matches.length} trainers matched for you.</h1>
        <p>
          Ranked by your preferences. Match percentages show how many selected
          criteria fit.
        </p>
      </div>
      <MatchResultsGrid matches={matches} />
      <Link href="/trainers" className="btn outline mt-10">
        Explore all trainers →
      </Link>
    </div>
  );
}
