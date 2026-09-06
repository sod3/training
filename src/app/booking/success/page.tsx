import { BookingSuccess } from "@/components/marketplace/booking-success";
import { requirePage } from "@/lib/server/security";
export const metadata = { robots: { index: false, follow: false } };
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  await requirePage();
  return <BookingSuccess id={(await searchParams).id} />;
}
