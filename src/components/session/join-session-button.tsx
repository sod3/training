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
      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50 ${className}`}>
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
        className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-medium bg-slate-100 dark:bg-zinc-800/60 text-slate-500 dark:text-zinc-400 border border-slate-200 dark:border-zinc-700/50 cursor-not-allowed opacity-75 ${className}`}
        title="This session has ended"
      >
        <Clock size={14} /> Session Ended
      </button>
    );
  }

  // Case 2: Join window is open (15 mins before start through end)
  if (now >= windowStartMs && now <= windowEndMs) {
    return (
      <Link
        href={targetUrl}
        className={`inline-flex items-center justify-center gap-2 rounded-xl font-bold transition-all duration-200 shadow-md shadow-sky-500/20 bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white hover:scale-[1.02] active:scale-[0.98] ${
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

  // Case 3: Before allowed join window - return null (do not display timer pill)
  return null;
}

