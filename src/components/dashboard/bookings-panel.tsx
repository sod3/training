"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, useApi } from "@/lib/client-api";
import { ActionForm } from "./action-form";
import { amount, date, num, record, rows, str, type Item } from "./panels";
import { StatusBadge } from "./admin-panel";
import { IdCopyChip } from "@/components/ui/id-copy-chip";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

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
            <article className="panel" key={str(order, "_id")}>
              <div className="panel-title flex flex-wrap justify-between items-start gap-3">
                <div>
                  <div className="mb-1">
                    <IdCopyChip value={str(order, "bookingNumber")} />
                  </div>
                  <h2 className="text-lg font-bold">
                    {str(snapshot, "trainerName")}
                  </h2>
                  <p className="text-sm font-medium text-slate-600 dark:text-zinc-400">
                    {str(snapshot, "name")} ·{" "}
                    <strong className="text-slate-900 dark:text-zinc-100">
                      {amount(order.total)}
                    </strong>
                  </p>
                </div>
                <StatusBadge status={str(order, "bookingStatus")} />
              </div>
              <div className="flex flex-wrap items-center gap-3 my-3 text-xs text-slate-600 dark:text-zinc-400 p-2.5 bg-slate-50 dark:bg-zinc-800/50 rounded-lg border border-slate-200/60 dark:border-zinc-700/50">
                <span className="flex items-center gap-1.5">
                  <strong>Payment:</strong>{" "}
                  <StatusBadge status={str(order, "paymentStatus")} />
                </span>
                <span>•</span>
                <span>
                  <strong>Remaining Sessions:</strong>{" "}
                  {num(order, "remainingSessions")} sessions left
                </span>
              </div>
              <p className="text-xs text-slate-500 mb-3">
                Free cancellation or rescheduling until{" "}
                {num(snapshot, "cancellationWindowHours")} hours before a
                session. Late cancellations forfeit that session’s share of the
                package.
              </p>
              {rows(order.sessions).map((s) => (
                <div
                  className="booking-row p-3 bg-white dark:bg-zinc-900 border rounded-lg mb-2"
                  key={str(s, "_id")}
                >
                  <div>
                    <h3 className="font-semibold text-sm">
                      Session {num(s, "sessionNumber")}
                    </h3>
                    <p className="text-xs text-slate-500">
                      {date(s.start)} — {date(s.end)}
                    </p>
                    <div className="mt-1">
                      <StatusBadge status={str(s, "status")} />
                    </div>
                  </div>
                  {role === "customer" &&
                    s.status === "CONFIRMED" &&
                    str(s, "meetingUrl") && (
                      <a
                        className="btn small"
                        href={str(s, "meetingUrl")}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Join online session
                      </a>
                    )}
                  {role === "customer" &&
                    s.status === "CONFIRMED" &&
                    !str(s, "meetingUrl") && (
                      <span className="status">Session link pending</span>
                    )}
                  {role === "trainer" && s.status === "CONFIRMED" && (
                    <div className="meeting-link-editor">
                      {str(s, "meetingUrl") && (
                        <a
                          className="text-link"
                          href={str(s, "meetingUrl")}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Open current session link →
                        </a>
                      )}
                      <ActionForm
                        endpoint={`trainer/meeting/${str(s, "_id")}`}
                        fields={[
                          {
                            name: "meetingUrl",
                            label: "Private video link",
                            value: str(s, "meetingUrl"),
                            required: true,
                            hint: "Paste a real HTTPS Google Meet, Zoom or other private video-session URL.",
                          },
                        ]}
                        label={
                          str(s, "meetingUrl")
                            ? "Update session link"
                            : "Add session link"
                        }
                        onDone={reload}
                      />
                    </div>
                  )}
                  {role === "customer" && s.status === "CONFIRMED" && (
                    <button
                      className="btn outline small"
                      onClick={() =>
                        setSchedule({ order, sessionId: str(s, "_id") })
                      }
                    >
                      Reschedule
                    </button>
                  )}
                  {role === "trainer" && s.status === "CONFIRMED" && (
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
                  )}
                </div>
              ))}
              {role === "customer" &&
                order.bookingStatus === "CONFIRMED" &&
                num(order, "remainingSessions") > 0 && (
                  <button
                    className="btn small"
                    onClick={() => setSchedule({ order })}
                  >
                    Schedule next session
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
                <details className="mt-5">
                  <summary>Cancel booking</summary>
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
                </details>
              )}
            </article>
          );
          return ["COMPLETED", "CANCELLED", "REFUNDED", "EXPIRED"].includes(
            str(order, "bookingStatus"),
          ) ? (
            <details className="booking-archive" key={str(order, "_id")}>
              <summary>
                <span>
                  {str(snapshot, "trainerName")}
                  <small>{str(snapshot, "name")}</small>
                </span>
                <StatusBadge status={str(order, "bookingStatus")} />
              </summary>
              {booking}
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
