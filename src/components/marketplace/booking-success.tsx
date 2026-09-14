"use client";

import { useEffect } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Clock,
  ShieldCheck,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { useApi } from "@/lib/client-api";
import {
  amount,
  date,
  num,
  record,
  rows,
  str,
  type Item,
} from "@/components/dashboard/panels";
import { StatusBadge } from "@/components/dashboard/admin-panel";
import { IdCopyChip } from "@/components/ui/id-copy-chip";

export function BookingSuccess({ id }: { id?: string }) {
  const { data, error, loading, reload } = useApi<Item>(
    id ? `bookings/${id}` : null,
  );
  const order = record(data?.order);
  const snapshot = record(order.packageSnapshot);
  const isPending =
    order.bookingStatus === "PENDING_PAYMENT" ||
    order.paymentStatus === "SUBMITTED";

  useEffect(() => {
    if (!id || !isPending) return;
    const timer = setInterval(() => {
      reload();
    }, 6000);
    return () => clearInterval(timer);
  }, [id, isPending, reload]);

  const isConfirmed = order.bookingStatus === "CONFIRMED";
  const isRejected = order.paymentStatus === "REJECTED";
  const bookingNum = str(order, "bookingNumber") || id || "";
  const statusCopy: Record<string, { title: string; description: string }> = {
    CONFIRMED: {
      title: "You’re all set for training!",
      description:
        "Your booking is confirmed. Your coach, payment, and session details are below.",
    },
    COMPLETED: {
      title: "Training complete.",
      description:
        "Your package is complete. You can review your coach from My Training.",
    },
    CANCELLED: {
      title: "Booking cancelled.",
      description:
        "This booking has been cancelled. Check your payment status and refund eligibility in My Bookings.",
    },
    EXPIRED: {
      title: "Reservation expired.",
      description:
        "This reservation has expired. Browse trainers when you’re ready to choose another session.",
    },
    REFUND_PENDING: {
      title: "Your refund is under review.",
      description:
        "Your refund request is being reviewed. Your booking and payment details are below.",
    },
    REFUNDED: {
      title: "Your refund is complete.",
      description:
        "This booking has been refunded. Your booking and payment details are below.",
    },
  };
  const copy =
    statusCopy[str(order, "bookingStatus")] ||
    (isRejected
      ? {
          title: "Your payment needs attention.",
          description:
            "Check the payment verification details below or contact support for help.",
        }
      : {
          title: "Your Booking Status",
          description:
            "Your reservation, payment details, and latest updates are shown below.",
        });

  return (
    <div className="container section success-page max-w-4xl mx-auto px-4 py-8">
      {/* Header Heading */}
      <div className="text-center max-w-xl mx-auto mb-8">
        <span className="booking-status-pill inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/60 mb-3">
          {isConfirmed ? (
            <>
              <CheckCircle2 size={13} /> Reservation Confirmed
            </>
          ) : (
            <>
              <Clock size={13} /> Booking details
            </>
          )}
        </span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-zinc-100 tracking-tight">
          {copy.title}
        </h1>
        <p className="text-sm text-slate-600 dark:text-zinc-400 mt-2">
          {copy.description}
        </p>
      </div>

      {!id ? (
        <div className="panel p-8 text-center bg-slate-50 dark:bg-zinc-900 border rounded-xl">
          <p className="text-slate-600 dark:text-zinc-400">
            No booking was selected.
          </p>
          <Link href="/trainers" className="btn outline mt-4">
            Browse Trainers →
          </Link>
        </div>
      ) : error ? (
        <div
          className="panel p-8 text-center bg-red-50/60 text-red-900 border border-red-200 rounded-xl"
          role="alert"
        >
          <AlertCircle className="mx-auto text-red-500 mb-2" size={32} />
          <h3 className="font-bold text-lg">Unable to load booking details</h3>
          <p className="text-sm mt-1">{error}</p>
          <button
            type="button"
            onClick={reload}
            className="btn outline small mt-4"
          >
            Try again
          </button>
        </div>
      ) : loading && !data ? (
        <div
          className="panel p-10 text-center bg-slate-50/60 dark:bg-zinc-900 border rounded-xl"
          role="status"
        >
          <RefreshCw
            className="mx-auto text-emerald-600 animate-spin mb-3"
            size={28}
          />
          <p className="text-slate-700 dark:text-zinc-300 font-medium text-sm">
            Fetching latest reservation details…
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Main Summary Card */}
          <section className="panel bg-white dark:bg-zinc-900/90 border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-sm">
            {/* Top Bar: Trainer & Booking ID */}
            <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-zinc-800">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 block mb-1">
                  Selected Trainer & Plan
                </span>
                <h2 className="text-xl font-bold text-slate-900 dark:text-zinc-100">
                  {str(snapshot, "trainerName") || "Trainer Booking"}
                </h2>
                <p className="text-sm text-slate-600 dark:text-zinc-400 font-medium">
                  {str(snapshot, "name") || "1-on-1 Coaching Session"}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                  Booking Number
                </span>
                {bookingNum && <IdCopyChip value={bookingNum} />}
              </div>
            </div>

            {/* Structured Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 my-6">
              {/* Card 1: Booking Status */}
              <div className="p-4 rounded-xl bg-slate-50/80 dark:bg-zinc-800/50 border border-slate-200/70 dark:border-zinc-700/60 flex flex-col justify-between gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                  Booking Status
                </span>
                <div>
                  <StatusBadge status={str(order, "bookingStatus")} />
                </div>
              </div>

              {/* Card 2: Payment Status */}
              <div className="p-4 rounded-xl bg-slate-50/80 dark:bg-zinc-800/50 border border-slate-200/70 dark:border-zinc-700/60 flex flex-col justify-between gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                  Payment Status
                </span>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <StatusBadge status={str(order, "paymentStatus")} />
                  <strong className="text-sm font-bold text-slate-900 dark:text-zinc-100">
                    {amount(order.total)}
                  </strong>
                </div>
              </div>

              {/* Card 3: Package Summary */}
              <div className="p-4 rounded-xl bg-slate-50/80 dark:bg-zinc-800/50 border border-slate-200/70 dark:border-zinc-700/60 flex flex-col justify-between gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                  Package Details
                </span>
                <div className="text-xs font-semibold text-slate-800 dark:text-zinc-200">
                  {num(snapshot, "sessionCount") || 1} Sessions ·{" "}
                  {num(snapshot, "sessionDuration") || 60} mins
                </div>
              </div>

              {/* Card 4: Hold Expiration */}
              <div className="p-4 rounded-xl bg-slate-50/80 dark:bg-zinc-800/50 border border-slate-200/70 dark:border-zinc-700/60 flex flex-col justify-between gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                  Hold Expiration
                </span>
                <div className="text-xs font-medium text-slate-700 dark:text-zinc-300">
                  {order.holdExpiresAt
                    ? date(order.holdExpiresAt)
                    : "No active hold"}
                </div>
              </div>
            </div>

            {/* Verification Status Alert Callout */}
            {order.bookingStatus === "PENDING_PAYMENT" && (
              <div className="mt-6 p-4 rounded-xl border transition-colors">
                {order.paymentStatus === "SUBMITTED" ? (
                  <div className="flex items-start gap-3 bg-amber-50/80 text-amber-950 border-amber-200/80 p-4 rounded-xl dark:bg-amber-950/30 dark:text-amber-200 dark:border-amber-800/60">
                    <Clock
                      size={20}
                      className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5"
                    />
                    <div>
                      <strong className="text-sm font-bold block mb-0.5">
                        Payment Proof Submitted & Under Admin Review
                      </strong>
                      <p className="text-xs text-amber-900/90 dark:text-amber-300/90 leading-relaxed">
                        Your payment transfer screenshot is currently being
                        verified by our finance team. Your booking will be
                        automatically confirmed once approved.
                      </p>
                    </div>
                  </div>
                ) : isRejected ? (
                  <div className="flex items-start gap-3 bg-red-50/80 text-red-950 border-red-200/80 p-4 rounded-xl dark:bg-red-950/30 dark:text-red-200 dark:border-red-800/60">
                    <AlertCircle
                      size={20}
                      className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5"
                    />
                    <div>
                      <strong className="text-sm font-bold block mb-0.5">
                        Payment Proof Not Approved
                      </strong>
                      <p className="text-xs text-red-900/90 dark:text-red-300/90 leading-relaxed">
                        The submitted payment proof could not be verified.
                        Please check your transaction details or contact support
                        to update your payment confirmation.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-3 bg-emerald-50/80 text-emerald-950 border-emerald-200/80 p-4 rounded-xl dark:bg-emerald-950/30 dark:text-emerald-200 dark:border-emerald-800/60">
                    <ShieldCheck
                      size={20}
                      className="text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5"
                    />
                    <div>
                      <strong className="text-sm font-bold block mb-0.5">
                        Payment Proof Required
                      </strong>
                      <p className="text-xs text-emerald-900/90 dark:text-emerald-300/90 leading-relaxed">
                        Upload your payment transfer screenshot to submit your
                        reservation for review.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Scheduled Sessions List */}
            {rows(data?.sessions).length > 0 && (
              <div className="mt-8 pt-6 border-t border-slate-100 dark:border-zinc-800">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400 mb-3">
                  Scheduled Sessions
                </h3>
                <div className="space-y-2">
                  {rows(data?.sessions).map((s, i) => (
                    <div
                      key={str(s, "_id")}
                      className="p-3.5 bg-slate-50/80 dark:bg-zinc-800/40 rounded-xl border border-slate-200/60 dark:border-zinc-700/50 flex items-center justify-between gap-3 flex-wrap"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-7 h-7 rounded-full bg-slate-200 dark:bg-zinc-700 text-slate-800 dark:text-zinc-200 font-bold text-xs flex items-center justify-center">
                          {num(s, "sessionNumber") || i + 1}
                        </span>
                        <div className="text-xs font-semibold text-slate-800 dark:text-zinc-200">
                          {date(s.start)}
                        </div>
                      </div>
                      <StatusBadge status={str(s, "status")} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Live Polling Indicator */}
            {isPending && (
              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-center gap-2 text-xs text-slate-500 dark:text-zinc-400">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="font-semibold text-slate-700 dark:text-zinc-300">
                  Live Updates Active
                </span>
                <span>• We’ll update this page when your booking changes.</span>
              </div>
            )}
          </section>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <Link
              href="/dashboard/customer/bookings"
              className="btn lime px-6 py-3 text-sm font-bold rounded-xl shadow-sm"
            >
              View My Bookings →
            </Link>
            <Link
              href="/trainers"
              className="btn outline px-6 py-3 text-sm font-bold rounded-xl"
            >
              Browse All Trainers
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
