import { Dashboard } from "@/components/dashboard/dashboard";
import { notFound, redirect } from "next/navigation";

const customerRedirects: Record<string, string> = {
  bookings: "training",
  messages: "training",
  payments: "training",
  reviews: "training",
  trainers: "training",
  security: "profile",
  settings: "profile",
  favorites: "saved",
};

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ tab: string }>;
  searchParams: Promise<{ trainer?: string }>;
}) {
  const { tab } = await params;
  if (tab in customerRedirects) {
    const dest = customerRedirects[tab];
    const trainer = (await searchParams).trainer;
    redirect(`/dashboard/customer/${dest}${trainer ? `?trainer=${trainer}` : ""}`);
  }
  if (!["training", "saved", "profile", "notifications"].includes(tab))
    notFound();
  return <Dashboard tab={tab} trainerId={(await searchParams).trainer} />;
}
