import Link from "next/link";
import { listTrainers } from "@/services/trainers";
import { MatchResultsGrid } from "@/components/marketplace/match-results-grid";
export const dynamic = "force-dynamic";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const result = await listTrainers({ ...params, limit: 12 });
  const reasons = [
    params.goal && "Matches your goal",
    params.location && "Serves your area",
    params.type && `Offers ${params.type} training`,
    params.time &&
      params.time !== "Flexible" &&
      "Has availability at your preferred time",
  ].filter((value): value is string => !!value);
  return (
    <div className="container section">
      <Link className="text-link" href="/match">
        ← Edit your preferences
      </Link>
      <div className="page-heading mt-9">
        <p className="eyebrow">A LITTLE MORE PERSONAL</p>
        <h1>{result.total} trainers fit your preferences.</h1>
        <p>
          Matches meet your selected criteria and are ranked by featured status,
          customer ratings, and experience.
        </p>
      </div>
      {result.trainers.length ? (
        <MatchResultsGrid
          matches={result.trainers.map((t) => ({ ...t, reasons }))}
        />
      ) : (
        <div className="empty-state">
          <h2>No exact matches yet.</h2>
          <p>Try a broader location or a different schedule.</p>
        </div>
      )}
      <Link href="/trainers" className="btn outline mt-10">
        Explore all trainers →
      </Link>
    </div>
  );
}
