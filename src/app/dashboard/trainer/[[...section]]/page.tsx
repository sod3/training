import { Dashboard } from "@/components/dashboard/dashboard";
import { notFound } from "next/navigation";
export default async function Page({
  params,
}: {
  params: Promise<{ section?: string[] }>;
}) {
  const { section } = await params;
  const tab = section?.[0] || "overview";
  if (
    (section?.length || 0) > 1 ||
    ![
      "overview",
      "calendar",
      "bookings",
      "clients",
      "messages",
      "earnings",
      "profile",
    ].includes(tab)
  )
    notFound();
  return <Dashboard role="trainer" tab={tab} />;
}
