import { DashboardPage } from "@/components/dashboard/page";
export const metadata = {
  robots: { index: false, follow: false },
  title: "Administration",
};
export default async function Page({
  params,
}: {
  params: Promise<{ section?: string[] }>;
}) {
  return <DashboardPage role="ADMIN" section={(await params).section} />;
}
