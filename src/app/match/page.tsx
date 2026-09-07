import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Get Matched With an Online Personal Trainer",
  description: "Answer four quick questions and see Spotter trainers ranked by your goal, experience, preferred training time and budget.",
  alternates: { canonical: "/match" },
};
import { MatchWizard } from "@/components/marketplace/match-wizard";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const p = await searchParams;
  return (
    <MatchWizard
      edit={p.edit === "1"}
      initial={Object.fromEntries(
        Object.entries(p)
          .filter(([key]) => key !== "edit")
          .map(([k, v]) => [k, v || ""]),
      )}
    />
  );
}
