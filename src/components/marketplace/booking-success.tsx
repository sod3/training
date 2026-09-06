"use client";
import Link from "next/link";
import { useApi } from "@/lib/client-api";
import {
  amount,
  date,
  record,
  rows,
  str,
  type Item,
} from "@/components/dashboard/panels";
export function BookingSuccess({ id }: { id?: string }) {
  const { data, error, loading, reload } = useApi<Item>(
    id ? `bookings/${id}` : null,
  );
  const order = record(data?.order);
  const snapshot = record(order.packageSnapshot);
  return (
    <div className="container section success-page">
      <p className="eyebrow">YOUR NEXT CHAPTER</p>
      <h1>
        {order.bookingStatus === "CONFIRMED"
          ? "You’re booked."
          : "Your booking status."}
      </h1>
      {!id ? (
        <p>No booking was selected.</p>
      ) : error ? (
        <p role="alert">{error}</p>
      ) : loading ? (
        <p role="status">Checking your booking…</p>
      ) : (
        <section className="panel">
          <h2>{str(snapshot, "trainerName")}</h2>
          <p>
            {str(order, "bookingNumber")} · {str(snapshot, "name")}
          </p>
          <p>Booking: {str(order, "bookingStatus")}</p>
          <p>
            Payment: {str(order, "paymentStatus")} · {amount(order.total)}
          </p>
          {rows(data?.sessions).map((s) => (
            <p key={str(s, "_id")}>
              {date(s.start)} — {str(s, "status")}
            </p>
          ))}
          {order.bookingStatus === "PENDING_PAYMENT" && (
            <>
              {order.paymentStatus === "SUBMITTED" ? (
                <p>
                  Your payment screenshot is with the admin for review. The
                  booking will be confirmed after approval.
                </p>
              ) : order.paymentStatus === "REJECTED" ? (
                <p>
                  The payment proof was not approved. Please contact support
                  with your transaction ID to submit corrected details.
                </p>
              ) : (
                <p>
                  Submit your JazzCash or EasyPaisa payment proof to reserve
                  this slot.
                </p>
              )}
              <p>Reservation expires: {date(order.holdExpiresAt)}</p>
            </>
          )}
          <button className="btn outline mt-5" onClick={reload}>
            Refresh status
          </button>
        </section>
      )}
      <Link href="/dashboard/customer/bookings" className="btn mt-6">
        View my bookings →
      </Link>
    </div>
  );
}
