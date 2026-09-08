import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Your Trainer Matches",
  robots: { index: false, follow: true },
};
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { currentUser } from "@/lib/server/security";
import { matchTrainers } from "@/services/trainers";
import { MatchResultsGrid } from "@/components/marketplace/match-results-grid";

export const dynamic = "force-dynamic";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const params = Object.fromEntries(
    Object.entries(raw).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value || ""]),
  );
  const user = await currentUser();

  if (!user) {
    const query = new URLSearchParams(params).toString();
    const resultsPath = `/match/results${query ? `?${query}` : ""}`;
    const signupUrl = `/signup?redirect=${encodeURIComponent(resultsPath)}`;
    const loginUrl = `/login?redirect=${encodeURIComponent(resultsPath)}`;

    return (
      <div className="container section narrow-page">
        <Link className="text-link" href={`/match?${new URLSearchParams({ ...params, edit: "1" }).toString()}`}>
          ← Edit your preferences
        </Link>

        <div className="panel match-gate-panel mt-8">
          <div className="match-gate-kicker">
            <Sparkles size={16} /> MATCHMAKING COMPLETE
          </div>
          <h1>Your matches are ready.</h1>
          <p className="section-copy">
            We’ve calculated your strongest trainer fits based on your goals, experience level, preferred schedule and budget. Create your free account or log in to view your personalized coach matches.
          </p>
          <div className="match-gate-actions">
            <Link href={signupUrl} className="btn lime large">
              CREATE FREE ACCOUNT TO SEE MATCHES <ArrowRight size={18} />
            </Link>
            <p className="auth-switch">
              Already have an account?{" "}
              <Link href={loginUrl} className="text-link">
                Log in
              </Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

  const result = await matchTrainers(params);
  const total = result.best.length + result.recommended.length;

  return (
    <div className="container section">
      <Link className="text-link" href={`/match?${new URLSearchParams({ ...params, edit: "1" }).toString()}`}>
        ← Edit your preferences
      </Link>
      <div className="page-heading mt-9">
        <p className="eyebrow">MATCHED FROM REAL TRAINER DATA</p>
        <h1>{total ? "Your strongest fits are ready." : "No approved match yet."}</h1>
        <p>
          Results are ranked from your goal, budget, experience level and real trainer availability.
          Match scores are guidance—not a guarantee of results.
        </p>
      </div>

      {result.best.length ? (
        <>
          <MatchResultsGrid matches={result.best} />
          <MatchResultsGrid matches={result.recommended} label="Also Recommended" />
        </>
      ) : (
        <div className="empty-state">
          <h2>No approved trainers match those preferences yet.</h2>
          <p>Browse all currently approved trainers, or come back as more coaches complete verification.</p>
        </div>
      )}

      <Link href="/trainers" className="btn outline mt-10">Browse all trainers →</Link>
    </div>
  );
}
