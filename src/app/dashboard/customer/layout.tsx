import { requirePage } from "@/lib/server/security";
export const metadata = { robots: { index: false, follow: false } };
export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePage("CUSTOMER");
  return children;
}
