"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, useApi } from "@/lib/client-api";
import { ActionForm } from "./action-form";
import { amount, date, num, record, rows, str, type Item } from "./panels";
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
      {items.map((order) => {
        const snapshot = record(order.packageSnapshot);
        return (
          <article className="panel" key={str(order, "_id")}>
            <div className="panel-title">
              <div>
                <p className="eyebrow">{str(order, "bookingNumber")}</p>
                <h2>{str(snapshot, "trainerName")}</h2>
                <p>
                  {str(snapshot, "name")} · {amount(order.total)}
                </p>
              </div>
              <span className="status">{str(order, "bookingStatus")}</span>
            </div>
            <p>
              Payment: {str(order, "paymentStatus")} ·{" "}
              {num(order, "remainingSessions")} sessions left to schedule
            </p>
            <p>
              Free cancellation or rescheduling until{" "}
              {num(snapshot, "cancellationWindowHours")} hours before a session.
              Late cancellations forfeit that session’s share of the package.
            </p>
            {rows(order.sessions).map((s) => (
              <div className="booking-row" key={str(s, "_id")}>
                <div>
                  <h3>Session {num(s, "sessionNumber")}</h3>
                  <p>
                    {date(s.start)} — {date(s.end)}
                  </p>
                  <span className="status">{str(s, "status")}</span>
                </div>
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
                  transform={() => ({ reason: "Customer abandoned checkout" })}
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
      })}
      {schedule && (
        <section className="panel">
          <button className="text-link" onClick={() => setSchedule(null)}>
            Close scheduling
          </button>
          <SchedulePanel
            order={schedule.order}
            sessionId={schedule.sessionId}
            onDone={() => {
              setSchedule(null);
              reload();
            }}
          />
        </section>
      )}
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
  const { data, error, loading } = useApi<{
    slots: { start: string; label: string }[];
  }>(
    day
      ? `bookings/${str(order, "_id")}/availability?${new URLSearchParams({ date: day, ...(sessionId ? { sessionId } : {}) })}`
      : null,
  );
  return (
    <>
      <h2>{sessionId ? "Reschedule session" : "Schedule a package session"}</h2>
      <label className="field">
        Date
        <input
          type="date"
          value={day}
          onChange={(e) => {
            setDay(e.target.value);
            setStart("");
          }}
        />
      </label>
      {error && <p role="alert">{error}</p>}
      {loading && <p role="status">Loading available times…</p>}
      <div className="choice-chips">
        {data?.slots.map((s) => (
          <button
            key={s.start}
            className={start === s.start ? "selected" : ""}
            onClick={() => setStart(s.start)}
          >
            {s.label}
          </button>
        ))}
      </div>
      {day && !loading && data?.slots.length === 0 && (
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
export function StartConversation({ trainerId }: { trainerId: string }) {
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
            router.push("/dashboard/customer/messages");
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
