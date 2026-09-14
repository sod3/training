"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Bell,
  CalendarCheck,
  Check,
  CheckCheck,
  CheckCircle2,
  Clock,
  CreditCard,
} from "lucide-react";
import { api } from "@/lib/client-api";
import { useStore } from "@/components/marketplace/store";
import { date, str } from "./panels";

export function NotificationsPanel({
  items,
  update,
}: {
  items: Record<string, unknown>[];
  update: () => void;
}) {
  const [markingAll, setMarkingAll] = useState(false);
  const [markingId, setMarkingId] = useState<string | null>(null);
  const { notify } = useStore();

  const unreadCount = items.filter((n) => !n.readAt).length;

  const handleMarkAllRead = async () => {
    if (markingAll || unreadCount === 0) return;
    setMarkingAll(true);
    try {
      await api("notifications", {}, "POST");
      notify("All notifications marked as read.", "success");
      update();
    } catch {
      notify("Failed to mark notifications as read.", "error");
    } finally {
      setMarkingAll(false);
    }
  };

  const handleMarkRead = async (id: string) => {
    if (markingId) return;
    setMarkingId(id);
    try {
      await api(`notifications/${id}`, {}, "POST");
      notify("Notification marked as read.", "success");
      update();
    } catch {
      notify("Failed to mark notification as read.", "error");
    } finally {
      setMarkingId(null);
    }
  };

  if (!items.length) {
    return (
      <div className="empty-state py-12 px-6 rounded-2xl bg-white/80 dark:bg-zinc-900/60 border border-slate-200/80 dark:border-zinc-800 text-center shadow-xs">
        <div className="w-14 h-14 rounded-2xl bg-lime-400/20 text-lime-600 dark:text-lime-400 border border-lime-400/30 flex items-center justify-center mx-auto mb-3 shadow-xs">
          <Bell size={26} />
        </div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
          No notifications yet
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
          You&apos;re all caught up! Updates about your bookings, sessions, and payment approvals will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header bar with counter & mark all read action */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200/80 dark:border-zinc-800/80">
        <div className="flex items-center gap-2.5">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
            {items.length} {items.length === 1 ? "Notification" : "Notifications"}
          </span>
          {unreadCount > 0 ? (
            <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-lime-400/20 text-lime-800 dark:text-lime-300 border border-lime-500/30 flex items-center gap-1.5 shadow-2xs">
              <span className="w-1.5 h-1.5 rounded-full bg-lime-500 animate-pulse" />
              <span className="text-lime-800 dark:text-lime-300 font-bold">{unreadCount} Unread</span>
            </span>
          ) : (
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-slate-300">
              All caught up
            </span>
          )}
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            onClick={handleMarkAllRead}
            disabled={markingAll}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-white font-bold text-xs transition-all shadow-xs cursor-pointer disabled:opacity-50 shrink-0 active:scale-95"
          >
            <CheckCheck size={14} className="text-lime-400 shrink-0" />
            <span className="text-white font-bold">{markingAll ? "Marking all read…" : "Mark all as read"}</span>
          </button>
        )}
      </div>

      {/* Notifications Cards List */}
      <div className="space-y-3">
        {items.map((n) => {
          const id = str(n, "_id");
          const title = str(n, "title") || "Notification";
          const body = str(n, "body");
          const isUnread = !n.readAt;
          const href = str(n, "href") || "/dashboard";

          const titleLower = title.toLowerCase();
          const isConfirmed =
            titleLower.includes("confirmed") ||
            titleLower.includes("approved") ||
            titleLower.includes("paid");
          const isSession =
            titleLower.includes("session") || titleLower.includes("booking");
          const isPayment =
            titleLower.includes("payment") || titleLower.includes("payout");

          let iconBox = (
            <span className="w-10 h-10 rounded-xl bg-lime-400/20 text-lime-700 dark:text-lime-400 border border-lime-400/35 flex items-center justify-center shrink-0 shadow-xs">
              <Bell size={18} />
            </span>
          );
          if (isConfirmed) {
            iconBox = (
              <span className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/35 flex items-center justify-center shrink-0 shadow-xs">
                <CheckCircle2 size={18} />
              </span>
            );
          } else if (isSession) {
            iconBox = (
              <span className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-600 dark:text-sky-400 border border-sky-500/35 flex items-center justify-center shrink-0 shadow-xs">
                <CalendarCheck size={18} />
              </span>
            );
          } else if (isPayment) {
            iconBox = (
              <span className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/35 flex items-center justify-center shrink-0 shadow-xs">
                <CreditCard size={18} />
              </span>
            );
          }

          const formattedBody = formatNotificationBody(body);

          return (
            <article
              key={id}
              className={`p-4 sm:p-5 rounded-2xl transition-all duration-200 border relative overflow-hidden ${
                isUnread
                  ? "bg-white dark:bg-zinc-900 border-lime-500/40 dark:border-lime-500/30 shadow-md border-l-4 border-l-lime-500 dark:border-l-lime-400"
                  : "bg-slate-50/70 dark:bg-zinc-900/40 border-slate-200/80 dark:border-zinc-800/80 hover:bg-white dark:hover:bg-zinc-900/80"
              }`}
            >
              <div className="flex items-start justify-between gap-3 mb-2.5">
                <div className="flex items-start gap-3 min-w-0">
                  {iconBox}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                        {title}
                      </h4>
                      {isUnread && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-lime-500/15 text-lime-800 dark:text-lime-300 border border-lime-500/30 shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-lime-500 animate-pulse" />
                          <span className="text-lime-800 dark:text-lime-300 font-bold">Unread</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {isUnread && (
                  <button
                    type="button"
                    onClick={() => handleMarkRead(id)}
                    disabled={markingId === id}
                    className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-800 dark:text-slate-200 transition-colors cursor-pointer shrink-0 active:scale-95"
                    title="Mark as read"
                  >
                    <Check size={13} className="text-emerald-500 shrink-0" />
                    <span className="hidden sm:inline text-slate-800 dark:text-slate-200 font-semibold">Mark read</span>
                  </button>
                )}
              </div>

              {/* Body message */}
              <div className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed mb-3.5 pl-0 sm:pl-[52px]">
                {formattedBody}
              </div>

              {/* Footer row: date & action link */}
              <div className="flex items-center justify-between gap-3 pt-2.5 border-t border-slate-100 dark:border-zinc-800/60 pl-0 sm:pl-[52px] text-xs">
                <span className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-400 font-medium">
                  <Clock size={13} className="text-slate-500 shrink-0" />
                  <span>{date(n.createdAt)}</span>
                </span>

                <Link
                  href={href}
                  className="inline-flex items-center gap-1.5 font-bold text-xs text-lime-700 dark:text-lime-400 hover:underline transition-all"
                >
                  <span className="text-lime-700 dark:text-lime-400 font-bold">View details</span>
                  <ArrowRight size={14} className="shrink-0 text-lime-700 dark:text-lime-400" />
                </Link>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function formatNotificationBody(body: string) {
  if (!body) return null;
  const match = body.match(/(SPT-[A-Z0-9]+)/);
  if (!match) return <p className="m-0">{body}</p>;

  const parts = body.split(match[0]);
  return (
    <p className="m-0">
      {parts[0]}
      <code className="inline-flex items-center px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-mono text-xs font-bold border border-emerald-500/25 mx-1 break-all">
        {match[0]}
      </code>
      {parts[1]}
    </p>
  );
}
