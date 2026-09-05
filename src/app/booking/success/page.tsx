import { BookingSuccess } from "@/components/marketplace/booking-success";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ reference?: string }>;
}) {
  return <BookingSuccess reference={(await searchParams).reference || ""} />;
}
