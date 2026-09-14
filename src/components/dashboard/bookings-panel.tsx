"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Calendar, Clock, Info } from "lucide-react";
import { api, useApi } from "@/lib/client-api";
import { ActionForm } from "./action-form";
import { amount, date, num, record, rows, str, type Item } from "./panels";
import { StatusBadge } from "./admin-panel";
import { IdCopyChip } from "@/components/ui/id-copy-chip";
import { formatSessionDateTime } from "@/lib/admin-formatters";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { JoinSessionButton } from "@/components/session/join-session-button";


export function BookingList({
  items,
  role,
  reload,
}: {
  items: Item[];
  role: string;
  reload: () => void;
}) {
  const [schedule, setSchedule] = useState<{
    order: Item;
    sessionId?: string;
  } | null>(null);
  return (
    <>
      {[...items]
        .sort(
          (a, b) =>
            (a.bookingStatus === "CONFIRMED"
              ? 0
              : a.bookingStatus === "PENDING_PAYMENT"
                ? 1
                : 2) -
            (b.bookingStatus === "CONFIRMED"
              ? 0
              : b.bookingStatus === "PENDING_PAYMENT"
                ? 1
                : 2),
        )
        .map((order) => {
          const snapshot = record(order.packageSnapshot);
          const booking = (
            <article
              className="panel bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 sm:p-6 mb-4 shadow-xs"
              key={str(order, "_id")}
            >
              {/* Card Top Header */}
              <div className="flex flex-wrap items-start justify-between gap-3 pb-4 border-b border-slate-100 dark:border-zinc-800">
                <div className="space-y-1 min-w-0">
                  <div className="mb-1 flex items-center gap-2 flex-wrap">
                    <IdCopyChip value={str(order, "bookingNumber")} />
                  </div>
                  <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-zinc-100 tracking-tight">
                    {str(snapshot, "name") || "Coaching Package"}
                  </h2>
                  <p className="text-sm text-slate-600 dark:text-zinc-400 font-medium">
                    Coach:{" "}
                    <strong className="text-slate-900 dark:text-zinc-100">
                      {str(snapshot, "trainerName")}
                    </strong>
                    {" · "}
                    <span className="font-bold text-emerald-700 dark:text-emerald-400">
                      {amount(order.total)}
                    </span>
                  </p>
                </div>
                <StatusBadge status={str(order, "bookingStatus")} />
              </div>

              {/* Payment & Sessions Strip */}
              <div className="flex flex-wrap items-center justify-between gap-3 my-4 p-3 bg-slate-50 dark:bg-zinc-800/60 rounded-xl border border-slate-200/60 dark:border-zinc-700/60 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-600 dark:text-zinc-400">
                    Payment:
                  </span>
                  <StatusBadge status={str(order, "paymentStatus")} />
                </div>
                <div className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-zinc-300">
                  <span className="font-semibold text-slate-600 dark:text-zinc-400">
                    Remaining Sessions:
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50">
                    {num(order, "remainingSessions")} left
                  </span>
                </div>
              </div>

              {/* Policy Callout */}
              <div className="flex items-start gap-2 p-3 bg-amber-50/70 dark:bg-amber-950/20 text-amber-900 dark:text-amber-300/90 rounded-xl border border-amber-200/70 dark:border-amber-800/40 text-xs mb-4">
                <Info
                  size={15}
                  className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5"
                />
                <span>
                  Free cancellation or rescheduling until{" "}
                  <strong>
                    {num(snapshot, "cancellationWindowHours") || 12} hours
                  </strong>{" "}
                  before a session. Late cancellations forfeit that session’s
                  share of the package.
                </span>
              </div>

              {/* Sessions List */}
              <div className="space-y-3">
                {rows(order.sessions).map((s) => {
                  const sessionNum = num(s, "sessionNumber");
                  const sessionStatus = str(s, "status");
                  const sessionStart = str(s, "start");
                  const sessionEnd = str(s, "end");
                  const dateTime = formatSessionDateTime(
                    sessionStart,
                    sessionEnd,
                  );

                  return (
                    <div
                      className="session-card bg-slate-50/80 dark:bg-zinc-800/40 border border-slate-200/80 dark:border-zinc-700/60 rounded-xl p-4 transition-all hover:border-slate-300 dark:hover:border-zinc-700"
                      key={str(s, "_id")}
                    >
                      <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-slate-200 dark:bg-zinc-700 text-slate-800 dark:text-zinc-200 font-bold text-xs flex items-center justify-center">
                            {sessionNum}
                          </span>
                          <h3 className="font-bold text-sm text-slate-900 dark:text-zinc-100">
                            Session {sessionNum}
                          </h3>
                        </div>
                        <StatusBadge status={sessionStatus} />
                      </div>

                      <div className="flex items-center gap-2 text-xs text-slate-700 dark:text-zinc-300 my-2.5 bg-white dark:bg-zinc-900/80 p-2.5 rounded-lg border border-slate-200/60 dark:border-zinc-700/50 flex-wrap">
                        <Calendar
                          size={14}
                          className="text-slate-400 dark:text-zinc-400 shrink-0"
                        />
                        <span className="font-semibold text-slate-900 dark:text-zinc-100 whitespace-nowrap">
                          {dateTime.dateStr}
                        </span>
                        <span className="text-slate-400 dark:text-zinc-500">
                          •
                        </span>
                        <span className="font-medium text-slate-600 dark:text-zinc-300 whitespace-nowrap">
                          {dateTime.timeStr}
                        </span>
                      </div>

                      {sessionStatus === "CONFIRMED" && (
                        <div className="mt-3 pt-3 border-t border-slate-200/60 dark:border-zinc-700/50 flex flex-wrap items-center justify-between gap-2.5">
                          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                            <JoinSessionButton
                              bookingId={str(order, "_id")}
                              sessionId={str(s, "_id")}
                              start={sessionStart}
                              end={sessionEnd}
                              status={sessionStatus}
                              size="sm"
                            />
                            {role === "customer" && (
                              <button
                                type="button"
                                className="btn outline small w-full sm:w-auto text-xs"
                                onClick={() =>
                                  setSchedule({
                                    order,
                                    sessionId: str(s, "_id"),
                                  })
                                }
                              >
                                Reschedule
                              </button>
                            )}
                          </div>
                          {role === "trainer" && (
                            <div className="w-full sm:w-auto">
                              <ActionForm
                                endpoint={`sessions/${str(s, "_id")}`}
                                fields={[
                                  {
                                    name: "status",
                                    label: "Outcome",
                                    type: "select",
                                    options: ["COMPLETED", "NO_SHOW"],
                                  },
                                  {
                                    name: "notes",
                                    label: "Private trainer notes",
                                    type: "textarea",
                                  },
                                ]}
                                label="Record outcome"
                                onDone={reload}
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Secondary Action: Schedule Next / Release / Cancel */}
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-3">
                {role === "customer" &&
                  order.bookingStatus === "CONFIRMED" &&
                  num(order, "remainingSessions") > 0 && (
                    <button
                      type="button"
                      className="btn lime small w-full sm:w-auto"
                      onClick={() => setSchedule({ order })}
                    >
                      Schedule Next Session →
                    </button>
                  )}

                {order.bookingStatus === "PENDING_PAYMENT" &&
                  role === "customer" && (
                    <ActionForm
                      endpoint={`bookings/${str(order, "_id")}/cancel`}
                      fields={[]}
                      transform={() => ({
                        reason: "Customer abandoned checkout",
                      })}
                      label="Release reservation"
                      onDone={reload}
                    />
                  )}

                {order.bookingStatus === "CONFIRMED" && (
                  <details className="w-full sm:w-auto text-xs text-slate-500 hover:text-slate-700 dark:hover:text-zinc-300">
                    <summary className="cursor-pointer font-medium py-1">
                      Cancel booking
                    </summary>
                    <div className="mt-2 p-3 bg-red-50/50 dark:bg-red-950/20 border border-red-200/70 dark:border-red-900/40 rounded-xl">
                      <ActionForm
                        endpoint={`bookings/${str(order, "_id")}/cancel`}
                        fields={[
                          {
                            name: "reason",
                            label: "Cancellation reason",
                            required: true,
                          },
                        ]}
                        confirmation="Cancel this package and its future sessions? Refund eligibility follows your purchase terms."
                        label="Confirm cancellation"
                        onDone={reload}
                      />
                    </div>
                  </details>
                )}
              </div>
            </article>
          );
          return ["COMPLETED", "CANCELLED", "REFUNDED", "EXPIRED"].includes(
            str(order, "bookingStatus"),
          ) ? (
            <details className="booking-archive mb-4" key={str(order, "_id")}>
              <summary className="p-3 bg-slate-50 dark:bg-zinc-800/60 rounded-xl border border-slate-200 dark:border-zinc-700/60 flex items-center justify-between gap-3">
                <span className="font-semibold text-sm">
                  {str(snapshot, "trainerName")} ·{" "}
                  <small className="text-slate-500 dark:text-zinc-400">
                    {str(snapshot, "name")}
                  </small>
                </span>
                <StatusBadge status={str(order, "bookingStatus")} />
              </summary>
              <div className="mt-3">{booking}</div>
            </details>
          ) : (
            booking
          );
        })}
      <Dialog
        open={!!schedule}
        onOpenChange={(open) => {
          if (!open) setSchedule(null);
        }}
      >
        {schedule && (
          <DialogContent className="scheduling-sheet">
            <DialogTitle>
              {schedule.sessionId
                ? "Reschedule session"
                : "Schedule your next session"}
            </DialogTitle>
            <DialogDescription>
              Choose a date and an available time that works for you.
            </DialogDescription>
            <SchedulePanel
              order={schedule.order}
              sessionId={schedule.sessionId}
              onDone={() => {
                setSchedule(null);
                reload();
              }}
            />
          </DialogContent>
        )}
      </Dialog>
    </>
  );
}
function SchedulePanel({
  order,
  sessionId,
  onDone,
}: {
  order: Item;
  sessionId?: string;
  onDone: () => void;
}) {
  const [day, setDay] = useState("");
  const [start, setStart] = useState("");
  const [showAllSlots, setShowAllSlots] = useState(false);
  const { data, error, loading } = useApi<{
    slots: { start: string; label: string }[];
  }>(
    day
      ? `bookings/${str(order, "_id")}/availability?${new URLSearchParams({ date: day, ...(sessionId ? { sessionId } : {}) })}`
      : null,
  );
  const allSlots = data?.slots || [];
  const visibleSlots = showAllSlots
    ? allSlots
    : allSlots.filter((s, i) => i < 6 || s.start === start);

  return (
    <>
      <label className="field">
        Date
        <input
          type="date"
          value={day}
          onChange={(e) => {
            setDay(e.target.value);
            setStart("");
            setShowAllSlots(false);
          }}
        />
      </label>
      {error && <p role="alert">{error}</p>}
      {loading && <p role="status">Loading available times…</p>}
      <div className="choice-chips">
        {visibleSlots.map((s) => (
          <button
            key={s.start}
            className={start === s.start ? "selected" : ""}
            aria-pressed={start === s.start}
            onClick={() => setStart(s.start)}
          >
            {s.label}
          </button>
        ))}
      </div>
      {!showAllSlots && allSlots.length > visibleSlots.length && (
        <button
          type="button"
          className="btn outline small"
          style={{ marginTop: "0.75rem" }}
          onClick={() => setShowAllSlots(true)}
        >
          Show more times ({allSlots.length - visibleSlots.length} more)
        </button>
      )}
      {showAllSlots && allSlots.length > 6 && (
        <button
          type="button"
          className="text-link small"
          style={{ marginTop: "0.75rem", display: "inline-block" }}
          onClick={() => setShowAllSlots(false)}
        >
          Show fewer times
        </button>
      )}
      {day && !loading && allSlots.length === 0 && (
        <p>No available times on this date.</p>
      )}
      {start && (
        <ActionForm
          endpoint={`bookings/${str(order, "_id")}/schedule`}
          fields={[]}
          transform={() => ({ start, sessionId })}
          label="Confirm time"
          onDone={onDone}
        />
      )}
    </>
  );
}
export function StartConversation({
  trainerId,
  onStarted,
}: {
  trainerId: string;
  onStarted?: () => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <>
      <button
        className="btn outline small"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            await api("conversations", { trainerId });
            const destination = `/dashboard/customer/training?section=messages&trainer=${encodeURIComponent(trainerId)}`;
            if (window.location.pathname === "/dashboard/customer/training") {
              // Reload from the server so the newly created thread is included
              // in the first training payload on slower mobile browsers.
              window.location.assign(destination);
            } else {
              router.push(destination);
            }
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        Message trainer
      </button>
      {error && <p role="alert">{error}</p>}
    </>
  );
}
