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
      "applications",
      "bookings",
      "payouts",
      "disputes",
      "profile",
      "messages",
      "progress",
    ].includes(tab)
  )
    notFound();
  return <Dashboard role="admin" tab={tab} />;
}
