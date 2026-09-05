import { BookingFlow } from "@/components/marketplace/booking-flow";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  return <BookingFlow params={await searchParams} checkout />;
}
