import { Dashboard } from "@/components/dashboard/dashboard";
import { notFound } from "next/navigation";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ tab: string }>;
  searchParams: Promise<{ trainer?: string }>;
}) {
  const { tab } = await params;
  if (
    ![
      "bookings",
      "trainers",
      "saved",
      "messages",
      "progress",
      "payments",
      "reviews",
      "profile",
      "notifications",
      "security",
      "favorites",
    ].includes(tab)
  )
    notFound();
  return <Dashboard tab={tab} trainerId={(await searchParams).trainer} />;
}
