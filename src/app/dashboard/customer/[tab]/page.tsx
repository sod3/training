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
    const query = new URLSearchParams();
    if (trainer) query.set("trainer", trainer);
    if (dest === "training")
      query.set(
        "section",
        tab === "messages"
          ? "messages"
          : ["bookings", "payments", "reviews"].includes(tab)
            ? "sessions"
            : "summary",
      );
    redirect(
      `/dashboard/customer/${dest}${query.size ? `?${query.toString()}` : ""}`,
    );
  }
  if (!["training", "saved", "profile", "notifications"].includes(tab))
    notFound();
  return <Dashboard tab={tab} trainerId={(await searchParams).trainer} />;
}
