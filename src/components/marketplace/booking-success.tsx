"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { CalendarDays, MessageCircle } from "lucide-react";
import { useStore } from "./store";
import { trainers } from "@/data/trainers";
import { money } from "@/lib/marketplace";
export function BookingSuccess({ reference }: { reference: string }) {
  const { state, ready } = useStore();
  const b = state.bookings.find((b) => b.id === reference);
  if (!ready) return <div className="panel skeleton-panel" />;
  if (!b)
    return (
      <div className="container section empty-state">
        <CalendarDays size={38} />
        <h1>Your next session awaits.</h1>
        <p>No booking confirmation was found on this device.</p>
        <Link href="/trainers" className="btn">
          Find a trainer →
        </Link>
      </div>
    );
  const t = trainers.find((t) => t.id === b.trainerId)!;
  const calendar = () => {
    const parts = b.time.match(/(\d+):(\d+) (AM|PM)/)!;
    const hour = (Number(parts[1]) % 12) + (parts[3] === "PM" ? 12 : 0);
    const start = new Date(
      `${b.date}T${String(hour).padStart(2, "0")}:${parts[2]}:00+05:00`,
    );
    const duration =
      t.packages.find((p) => p.id === b.packageId)?.duration || 60;
    const format = (d: Date) =>
      d
        .toISOString()
        .replace(/[-:]/g, "")
        .replace(/\.\d{3}Z/, "Z");
    const escape = (s: string) =>
      s
        .replace(/\\/g, "\\\\")
        .replace(/\n/g, "\\n")
        .replace(/,/g, "\\,")
        .replace(/;/g, "\\;");
    const data = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Elevate//Demo Booking//EN",
      "BEGIN:VEVENT",
      `UID:${b.id}@elevate.demo`,
      `DTSTAMP:${format(new Date())}`,
      `DTSTART:${format(start)}`,
      `DTEND:${format(new Date(start.getTime() + duration * 60000))}`,
      `SUMMARY:${escape(`Training with ${t.firstName} ${t.lastName}`)}`,
      `LOCATION:${escape(b.address)}`,
      "DESCRIPTION:Elevate demo booking. Sample session only.",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");
    const url = URL.createObjectURL(
      new Blob([data], { type: "text/calendar;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `${b.id}.ics`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return (
    <div className="success-page">
      <div className="success-check">
        <svg viewBox="0 0 52 52" fill="none">
          <motion.path
            d="M12 27l9 9 19-21"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.55 }}
          />
        </svg>
      </div>
      <p className="eyebrow">HERE’S TO SHOWING UP</p>
      <h1>You’re booked.</h1>
      <p>
        Your demo session with {t.firstName} is confirmed.
        <br />
        Your next chapter has a place on the calendar.
      </p>
      <div className="panel">
        <h2>
          {t.firstName} {t.lastName}
        </h2>
        <dl className="order-details">
          <div>
            <dt>Session</dt>
            <dd>
              {b.date} · {b.time} PKT
            </dd>
          </div>
          <div>
            <dt>Location</dt>
            <dd>{b.address}</dd>
          </div>
          <div>
            <dt>Total · simulated</dt>
            <dd>{money(b.price)}</dd>
          </div>
          <div>
            <dt>Reference</dt>
            <dd>{b.id}</dd>
          </div>
        </dl>
        <button className="btn outline w-full" onClick={calendar}>
          <CalendarDays size={17} />
          Add to calendar
        </button>
        <Link
          href={`/dashboard/customer/messages?trainer=${t.id}`}
          className="btn outline w-full mt-3"
        >
          <MessageCircle size={17} />
          Message {t.firstName}
        </Link>
        <Link href="/dashboard/customer/bookings" className="btn w-full mt-3">
          View booking →
        </Link>
        <Link href="/dashboard/customer" className="text-link mt-5">
          Go to dashboard →
        </Link>
      </div>
      <small>No payment was taken. Your booking is saved on this device.</small>
    </div>
  );
}
