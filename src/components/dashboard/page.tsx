import { notFound } from "next/navigation";
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
    "specialties",
    "locations",
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
    "calendar",
    "bookings",
    "clients",
    "packages",
    "availability",
    "messages",
    "reviews",
    "earnings",
    "analytics",
    "payouts",
    "profile",
    "verification",
    "application",
    "notifications",
    "security",
  ],
};
export async function DashboardPage({
  role,
  section,
}: {
  role: "ADMIN" | "TRAINER";
  section?: string[];
}) {
  await requirePage(role as Role);
  const tab = section?.[0] || "overview";
  if ((section?.length || 0) > 1 || !allowed[role].includes(tab)) notFound();
  return <Dashboard role={role.toLowerCase()} tab={tab} />;
}
