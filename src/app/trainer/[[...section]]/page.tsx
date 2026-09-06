import { DashboardPage } from "@/components/dashboard/page";
export const metadata = {
  robots: { index: false, follow: false },
  title: "Trainer workspace",
};
export default async function Page({
  params,
}: {
  params: Promise<{ section?: string[] }>;
}) {
  return <DashboardPage role="TRAINER" section={(await params).section} />;
}
