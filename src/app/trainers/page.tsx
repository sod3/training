import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Find your trainer",
  alternates: { canonical: "/trainers" },
};
import { TrainerSearch } from "@/components/marketplace/trainer-search";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const initial = Object.fromEntries(
    Object.entries(params).map(([k, v]) => [k, typeof v === "string" ? v : ""]),
  );
  return <TrainerSearch key={JSON.stringify(initial)} initial={initial} />;
}
