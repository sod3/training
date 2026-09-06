"use client";
import { useCallback, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, useApi } from "@/lib/client-api";
import { useStore } from "@/components/marketplace/store";
import { ActionForm } from "./action-form";
import { AdminPanel, AdminSettings, RecordDetails } from "./admin-panel";
import {
  AvailabilityPanel,
  MessagesPanel,
  PackagesPanel,
  ProfilePanel,
  VerificationPanel,
  amount,
  date,
  num,
  record,
  rows,
  str,
  type Item,
} from "./panels";
import { BookingList, StartConversation } from "./bookings-panel";
const tabs = {
  customer: [
    "overview",
    "bookings",
    "trainers",
    "saved",
    "messages",
    "reviews",
    "payments",
    "notifications",
    "profile",
    "security",
  ],
  trainer: [
    "overview",
    "calendar",
    "bookings",
    "clients",
    "packages",
    "availability",
    "messages",
    "reviews",
    "earnings",
    "analytics",
    "payouts",
    "profile",
    "verification",
    "notifications",
    "security",
  ],
  admin: [
    "overview",
    "users",
    "customers",
    "trainers",
    "applications",
    "verification",
    "bookings",
    "sessions",
    "payments",
    "refunds",
    "payouts",
    "reviews",
    "specialties",
    "locations",
    "content",
    "notifications",
    "support",
    "reports",
    "audit-logs",
    "settings",
    "security",
  ],
};
export function Dashboard({
  role = "customer",
  tab = "overview",
  trainerId,
}: {
  role?: string;
  tab?: string;
  trainerId?: string;
}) {
  const router = useRouter();
  const selectedRole = role in tabs ? (role as keyof typeof tabs) : "customer";
  const base =
    selectedRole === "admin"
      ? "/admin"
      : selectedRole === "trainer"
        ? "/trainer"
        : "/dashboard/customer";
  const { state, notify, refresh } = useStore();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [days, setDays] = useState("30");
  const endpoint = `${selectedRole === "admin" ? "admin" : selectedRole === "trainer" ? "trainer" : "dashboard"}/${tab}?${new URLSearchParams({ q, status, page: String(page), days })}`;
  const { data, error, loading, reload } = useApi<Item>(endpoint);
  const items = rows(data?.items);
  const update = useCallback(() => {
    reload();
    refresh();
  }, [refresh, reload]);
  const overview = ["overview", "analytics", "reports", "earnings"].includes(
    tab,
  );
  return (
    <div className="workspace">
      <aside className="workspace-sidebar">
        <p className="eyebrow">SPOTTER / {selectedRole}</p>
        <strong>{state.name}</strong>
        <nav aria-label="Dashboard navigation">
          {tabs[selectedRole].map((t) => (
            <Link
              key={t}
              className={tab === t ? "active" : ""}
              href={t === "overview" ? base : `${base}/${t}`}
            >
              {t.replaceAll("-", " ")}
              {t === "notifications" && state.unread > 0 && (
                <span>{state.unread}</span>
              )}
              {t === "messages" && state.unreadMessages > 0 && (
                <span>{state.unreadMessages}</span>
              )}
            </Link>
          ))}
        </nav>
        <button
          className="text-link"
          onClick={async () => {
            try {
              await api("auth/logout", {});
              router.push("/");
            } catch (e) {
              notify((e as Error).message);
            }
          }}
        >
          Log out →
        </button>
      </aside>
      <div className="workspace-main">
        <div className="page-heading">
          <p className="eyebrow">YOUR SPACE TO MOVE FORWARD</p>
          <h1>
            {tab === "overview"
              ? `Welcome${state.name ? `, ${state.name.split(" ")[0]}` : ""}.`
              : `${tab.replaceAll("-", " ")}.`}
          </h1>
        </div>
        {trainerId && tab === "messages" && (
          <StartConversation trainerId={trainerId} />
        )}
        <div className="workspace-toolbar">
          <button className="text-link" onClick={reload}>
            Refresh
          </button>
          {selectedRole === "admin" &&
            ["users", "trainers", "bookings", "payouts"].includes(tab) && (
              <a className="text-link" href={`/api/admin/export/${tab}`}>
                Export CSV (up to 10,000 records)
              </a>
            )}
          {overview ? (
            <label className="field">
              Date range
              <select value={days} onChange={(e) => setDays(e.target.value)}>
                {[7, 30, 90, 365].map((n) => (
                  <option key={n} value={n}>
                    Last {n} days
                  </option>
                ))}
              </select>
            </label>
          ) : (
            selectedRole === "admin" && (
              <>
                <label className="field">
                  Search
                  <input
                    value={q}
                    onChange={(e) => {
                      setQ(e.target.value);
                      setPage(1);
                    }}
                  />
                </label>
                <label className="field">
                  Status
                  <input
                    value={status}
                    onChange={(e) => {
                      setStatus(e.target.value.toUpperCase());
                      setPage(1);
                    }}
                  />
                </label>
              </>
            )
          )}
        </div>
        {error && !data ? (
          <section className="panel" role="alert">
            <h2>Unable to load this workspace.</h2>
            <p>{error}</p>
            <button className="btn" onClick={reload}>
              Try again
            </button>
          </section>
        ) : !data && loading ? (
          <div className="panel" role="status">
            Loading your workspace…
          </div>
        ) : (
          data && (
            <>
              {overview && (
                <>
                  <div className="workspace-stats">
                    {Object.entries(record(data.metrics)).map(
                      ([key, value]) => (
                        <article className="panel" key={key}>
                          <span>{key}</span>
                          <strong>{String(value)}</strong>
                        </article>
                      ),
                    )}
                  </div>
                  <section className="panel">
                    <h2>
                      {selectedRole === "customer"
                        ? "Your payments"
                        : "Financial overview"}
                    </h2>
                    <div className="workspace-stats">
                      {Object.entries(record(data.finance))
                        .filter(([key]) => key !== "_id")
                        .map(([key, value]) => (
                          <div key={key}>
                            <span>{key}</span>
                            <strong>{amount(value)}</strong>
                          </div>
                        ))}
                    </div>
                    <p>
                      Financial totals come from recorded payments and refunds.
                      Payouts require settlement review.
                    </p>
                  </section>
                  <section className="panel">
                    <h2>Bookings over time</h2>
                    {rows(data.series).length ? (
                      <div className="real-chart">
                        {rows(data.series).map((r) => (
                          <div key={str(r, "_id")}>
                            <span>{str(r, "_id")}</span>
                            <meter
                              min={0}
                              max={Math.max(
                                ...rows(data.series).map((r) =>
                                  num(r, "bookings"),
                                ),
                              )}
                              value={num(r, "bookings")}
                            />
                            <strong>
                              {num(r, "bookings")} · {amount(r.value)}
                            </strong>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p>
                        Booking activity will appear here when customers book.
                      </p>
                    )}
                  </section>
                  <section className="panel">
                    <h2>Coming up</h2>
                    {rows(data.upcoming).length ? (
                      rows(data.upcoming).map((s) => (
                        <p key={str(s, "_id")}>
                          {date(s.start)} · Session {num(s, "sessionNumber")}
                        </p>
                      ))
                    ) : (
                      <p>No upcoming sessions.</p>
                    )}
                  </section>
                </>
              )}
              {["profile", "progress"].includes(tab) && (
                <ProfilePanel data={data} role={selectedRole} reload={update} />
              )}
              {tab === "security" && (
                <section className="panel">
                  <h2>Password and account security</h2>
                  <ActionForm
                    endpoint="account/security"
                    fields={[
                      {
                        name: "currentPassword",
                        label: "Current password",
                        type: "password",
                        required: true,
                      },
                      {
                        name: "newPassword",
                        label:
                          "New password (leave empty to only revoke sessions)",
                        type: "password",
                      },
                      {
                        name: "deleteAccount",
                        label: "Request account deletion and deactivate now",
                        type: "checkbox",
                      },
                    ]}
                    transform={(v) => ({
                      ...v,
                      newPassword: v.newPassword || undefined,
                      revokeSessions: true,
                    })}
                    confirmation="This change will sign out all sessions. Account deletion requests deactivate your account immediately."
                    label="Update security"
                    onDone={() => router.push("/login")}
                  />
                </section>
              )}
              {tab === "settings" && selectedRole === "admin" && (
                <AdminSettings
                  settings={record(data.settings)}
                  reload={reload}
                />
              )}
              {tab === "packages" && (
                <PackagesPanel items={items} reload={reload} />
              )}
              {["availability", "calendar"].includes(tab) &&
                selectedRole === "trainer" && (
                  <>
                    <AvailabilityPanel
                      key={JSON.stringify(data.rules)}
                      data={data}
                      reload={reload}
                    />
                    {tab === "calendar" && (
                      <section className="panel">
                        <h2>Session calendar</h2>
                        {items.length ? (
                          items.map((s) => (
                            <p key={str(s, "_id")}>
                              {date(s.start)} — {date(s.end)} ·{" "}
                              {str(s, "status")}
                            </p>
                          ))
                        ) : (
                          <p>No sessions on your calendar.</p>
                        )}
                      </section>
                    )}
                  </>
                )}
              {["verification", "application"].includes(tab) &&
                selectedRole === "trainer" && (
                  <VerificationPanel data={data} reload={reload} />
                )}
              {tab === "messages" && (
                <MessagesPanel data={data} reload={update} />
              )}
              {["bookings", "payments"].includes(tab) &&
                selectedRole !== "admin" && (
                  <BookingList
                    items={items}
                    role={selectedRole}
                    reload={reload}
                  />
                )}
              {tab === "reviews" && selectedRole !== "admin" && (
                <>
                  {items.map((r) => (
                    <article className="panel" key={str(r, "_id")}>
                      <h3>{"★".repeat(num(r, "rating"))}</h3>
                      <p>{str(r, "review")}</p>
                      <small>
                        {str(r, "status")} · {date(r.createdAt)}
                      </small>
                    </article>
                  ))}
                  {selectedRole === "customer" &&
                    rows(data.eligible).length > 0 && (
                      <section className="panel">
                        <h2>Share your experience</h2>
                        <ActionForm
                          endpoint="reviews"
                          fields={[
                            {
                              name: "orderId",
                              label: "Completed booking",
                              type: "select",
                              options: [
                                ...new Set(
                                  rows(data.eligible).map((s) =>
                                    str(s, "orderId"),
                                  ),
                                ),
                              ],
                            },
                            {
                              name: "rating",
                              label: "Rating (1–5)",
                              type: "number",
                              value: 5,
                              min: 1,
                              max: 5,
                            },
                            {
                              name: "review",
                              label: "Your experience",
                              type: "textarea",
                              required: true,
                            },
                          ]}
                          label="Publish review"
                          onDone={reload}
                        />
                      </section>
                    )}
                </>
              )}
              {["saved", "favorites", "trainers"].includes(tab) &&
                selectedRole === "customer" &&
                items.map((t) => (
                  <article className="panel" key={str(t, "_id")}>
                    <h2>{str(t, "displayName")}</h2>
                    <p>{str(t, "headline")}</p>
                    <Link
                      className="text-link"
                      href={`/trainers/${str(t, "slug")}`}
                    >
                      View trainer →
                    </Link>
                  </article>
                ))}
              {tab === "notifications" && (
                <>
                  <ActionForm
                    endpoint="notifications"
                    fields={[]}
                    label="Mark all read"
                    onDone={update}
                  />
                  {items.map((n) => (
                    <article className="panel" key={str(n, "_id")}>
                      <h3>{str(n, "title")}</h3>
                      <p>{str(n, "body")}</p>
                      <small>{date(n.createdAt)}</small>
                      <Link
                        className="text-link"
                        href={str(n, "href") || "/dashboard"}
                      >
                        View →
                      </Link>
                      {!n.readAt && (
                        <ActionForm
                          endpoint={`notifications/${str(n, "_id")}`}
                          fields={[]}
                          label="Mark read"
                          onDone={update}
                        />
                      )}
                    </article>
                  ))}
                </>
              )}
              {tab === "clients" &&
                items.map((c) => (
                  <section className="panel" key={str(c, "_id")}>
                    <h2>{str(c, "name")}</h2>
                    {rows(c.bookings).map((b, i) => (
                      <RecordDetails key={i} item={b} />
                    ))}
                  </section>
                ))}
              {tab === "payouts" && selectedRole === "trainer" && (
                <>
                  <section className="panel">
                    <h2>Request a payout</h2>
                    <p>
                      Only settled earnings from completed packages are
                      available.
                    </p>
                    <ActionForm
                      endpoint="trainer/payouts"
                      fields={[
                        {
                          name: "amount",
                          label: "Amount in PKR",
                          type: "number",
                          min: 100,
                          required: true,
                        },
                      ]}
                      transform={(v) => ({
                        amount: Math.round(Number(v.amount) * 100),
                        idempotencyKey: crypto.randomUUID(),
                      })}
                      label="Request payout"
                      onDone={reload}
                    />
                  </section>
                  {items.map((p) => (
                    <section className="panel" key={str(p, "_id")}>
                      <RecordDetails item={p} />
                    </section>
                  ))}
                </>
              )}
              {selectedRole === "admin" &&
                ![
                  "overview",
                  "reports",
                  "settings",
                  "security",
                  "notifications",
                ].includes(tab) && (
                  <AdminPanel section={tab} items={items} reload={reload} />
                )}
              {Array.isArray(data.items) &&
                !items.length &&
                !["packages", "availability", "calendar", "messages"].includes(
                  tab,
                ) && (
                  <div className="empty-state">
                    <h2>Nothing here yet.</h2>
                    <p>
                      Your {tab.replaceAll("-", " ")} will appear here as
                      activity happens.
                    </p>
                    {selectedRole === "customer" && (
                      <Link href="/trainers" className="btn outline">
                        Find a trainer →
                      </Link>
                    )}
                  </div>
                )}
              {num(data, "total") > 20 && (
                <div className="pagination">
                  <button
                    className="btn outline small"
                    disabled={page === 1}
                    onClick={() => setPage(page - 1)}
                  >
                    Previous
                  </button>
                  <span>
                    {page} / {Math.ceil(num(data, "total") / 20)}
                  </span>
                  <button
                    className="btn outline small"
                    disabled={page * 20 >= num(data, "total")}
                    onClick={() => setPage(page + 1)}
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )
        )}
      </div>
    </div>
  );
}
