import { MatchWizard } from "@/components/marketplace/match-wizard";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const p = await searchParams;
  return (
    <MatchWizard
      initial={Object.fromEntries(
        Object.entries(p).map(([k, v]) => [k, v || ""]),
      )}
    />
  );
}
