import { notFound, redirect } from "next/navigation";
import { requirePage } from "@/lib/server/security";
import { Dashboard } from "./dashboard";
import type { Role } from "@/lib/server/rules";
const allowed = {
  ADMIN: [
    "overview",
    "users",
    "customers",
    "trainers",
    "applications",
    "verification",
    "bookings",
    "sessions",
    "payments",
    "refunds",
    "payouts",
    "reviews",
    "categories",
    "specialties",
    "content",
    "notifications",
    "support",
    "reports",
    "audit-logs",
    "settings",
    "security",
  ],
  TRAINER: [
    "overview",
    "clients",
    "schedule",
    "earnings",
    "profile",
  ],
};

const legacyRedirects: Record<string, string> = {
  calendar: "schedule",
  availability: "schedule",
  packages: "schedule",
  "services-pricing": "schedule",
  services: "schedule",
  pricing: "schedule",
  bookings: "clients",
  messages: "clients",
  payouts: "earnings",
  analytics: "overview",
  verification: "profile",
  application: "profile",
  security: "profile",
  settings: "profile",
  reviews: "profile",
  notifications: "profile",
};

export async function DashboardPage({
  role,
  section,
}: {
  role: "ADMIN" | "TRAINER";
  section?: string[];
}) {
  await requirePage(role as Role);
  const rawTab = section?.[0] || "overview";
  if ((section?.length || 0) > 1) notFound();
  if (role === "TRAINER" && rawTab in legacyRedirects) {
    redirect(`/trainer/${legacyRedirects[rawTab]}`);
  }
  if (!allowed[role].includes(rawTab)) notFound();
  return <Dashboard role={role.toLowerCase()} tab={rawTab} />;
}
