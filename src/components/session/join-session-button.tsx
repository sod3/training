"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Video, Clock, CheckCircle2 } from "lucide-react";

export interface JoinSessionButtonProps {
  bookingId: string;
  sessionId?: string;
  start: string | Date;
  end: string | Date;
  status: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function JoinSessionButton({
  bookingId,
  sessionId,
  start,
  end,
  status,
  size = "md",
  className = "",
}: JoinSessionButtonProps) {
  const [now, setNow] = useState<number>(Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 10000); // Check every 10s
    return () => clearInterval(timer);
  }, []);

  const startDate = new Date(start);
  const endDate = new Date(end);
  const startMs = startDate.getTime();
  const endMs = endDate.getTime();

  // Allowed join window starts 15 minutes before session.start
  const windowStartMs = startMs - 15 * 60 * 1000;
  const windowEndMs = endMs;

  const targetUrl = `/session/${bookingId}${sessionId ? `?sessionId=${sessionId}` : ""}`;

  if (status === "COMPLETED") {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-950/60 text-emerald-400 border border-emerald-800/50">
        <CheckCircle2 size={14} /> Completed
      </span>
    );
  }

  if (status !== "CONFIRMED" && status !== "HELD") {
    return null;
  }

  // Case 1: Session has ended
  if (now > windowEndMs) {
    return (
      <button
        disabled
        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-medium bg-slate-800/60 text-slate-500 border border-slate-700/50 cursor-not-allowed opacity-60"
        title="This session has ended"
      >
        <Clock size={14} /> Session Ended
      </button>
    );
  }

  // Case 2: Join window is open (15 mins before start through end)
  if (now >= windowStartMs && now <= windowEndMs) {
    const isLoud = size === "lg";
    return (
      <Link
        href={targetUrl}
        className={`inline-flex items-center justify-center gap-2 rounded-xl font-bold transition-all duration-200 shadow-lg shadow-sky-500/25 bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white hover:scale-[1.02] active:scale-[0.98] ${
          size === "sm"
            ? "px-3 py-1.5 text-xs"
            : size === "lg"
              ? "px-6 py-3.5 text-base w-full sm:w-auto"
              : "px-4 py-2 text-sm"
        } ${className}`}
      >
        <Video className="animate-pulse" size={size === "lg" ? 20 : size === "sm" ? 14 : 16} />
        <span>Join Session Now</span>
      </Link>
    );
  }

  // Case 3: Before allowed join window
  const diffMs = windowStartMs - now;
  const minsLeft = Math.ceil(diffMs / (60 * 1000));
  const hoursLeft = Math.floor(minsLeft / 60);
  const remainingMins = minsLeft % 60;

  let timeText = `Available in ${minsLeft}m`;
  if (hoursLeft > 0) {
    timeText = `Available in ${hoursLeft}h ${remainingMins}m`;
  }

  return (
    <button
      disabled
      className={`inline-flex items-center gap-1.5 rounded-xl font-medium bg-slate-800/50 text-slate-400 border border-slate-700/60 cursor-not-allowed opacity-75 transition-all ${
        size === "sm"
          ? "px-3 py-1.5 text-xs"
          : size === "lg"
            ? "px-5 py-3 text-sm"
            : "px-3.5 py-2 text-xs"
      } ${className}`}
      title={`Join window opens 15 minutes before start (${startDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })})`}
    >
      <Clock size={size === "sm" ? 13 : 15} />
      <span>{timeText}</span>
    </button>
  );
}
