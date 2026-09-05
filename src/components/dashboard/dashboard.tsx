"use client";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  LayoutDashboard,
  Heart,
  MessageCircle,
  User,
  Users,
  TrendingUp,
  CreditCard,
  Star,
  ArrowUpRight,
  Check,
  LogOut,
  Search,
} from "lucide-react";
import { useStore } from "@/components/marketplace/store";
import { TrainerCard } from "@/components/marketplace/trainer-card";
import { trainers } from "@/data/trainers";
import { money, dateKey } from "@/lib/marketplace";
import { BookingChart } from "./booking-chart";
const icons = [
  LayoutDashboard,
  CalendarDays,
  Users,
  Heart,
  MessageCircle,
  TrendingUp,
  CreditCard,
  Star,
  User,
];
const customerTabs = [
  "Overview",
  "Bookings",
  "Trainers",
  "Saved",
  "Messages",
  "Progress",
  "Payments",
  "Reviews",
  "Profile",
];
export function Dashboard({
  role = "customer",
  tab = "overview",
  trainerId = "t1",
}: {
  role?: string;
  tab?: string;
  trainerId?: string;
}) {
  const { state, update, notify, ready } = useStore();
  const path = usePathname();
  const [recipient, setRecipient] = useState(trainerId);
  const reviewed = state.reviews.map((r) => r.bookingId);
  const [rating, setRating] = useState("5");
  const isTrainer = role === "trainer";
  const isAdmin = role === "admin";
  const base = isAdmin ? "/admin" : `/dashboard/${role}`;
  const tabs = isAdmin
    ? ["Overview", "Applications", "Bookings", "Payouts", "Disputes", "Profile"]
    : isTrainer
      ? ["Overview", "Calendar", "Clients", "Messages", "Earnings", "Profile"]
      : customerTabs;
  const bookings = state.bookings.filter(
    (b) => !isTrainer || b.trainerId === "t1",
  );
  const confirmed = bookings.filter((b) => b.status === "Confirmed");
  const saved = trainers.filter((t) => state.saved.includes(t.id));
  const sum = bookings
    .filter((b) => b.status !== "Cancelled")
    .reduce((a, b) => a + b.price, 0);
  const title =
    tab === "overview"
      ? isAdmin
        ? "The bigger picture."
        : `Good to see you, ${state.name.split(" ")[0] || (isTrainer ? "Ahmed" : "there")}.`
      : tab === "trainers"
        ? "Your coaching team."
        : `${tab.charAt(0).toUpperCase() + tab.slice(1)}.`;
  const empty = (
    heading: string,
    copy: string,
    href = "/trainers",
    cta = "Find a trainer",
  ) => (
    <div className="empty-state">
      <CalendarDays size={34} />
      <h2>{heading}</h2>
      <p>{copy}</p>
      <Link href={href} className="btn">
        {cta} <ArrowUpRight size={17} />
      </Link>
    </div>
  );
  const bookingList = (
    <div className="booking-list">
      {bookings.map((b) => {
        const t = trainers.find((t) => t.id === b.trainerId)!;
        return (
          <article className="panel booking-row" key={b.id}>
            <Image
              src={t.profileImage}
              alt={t.firstName}
              width={56}
              height={64}
            />
            <div>
              <h3>{isTrainer ? b.name : `${t.firstName} ${t.lastName}`}</h3>
              <p>
                {b.date} · {b.time} PKT
              </p>
              <small>
                {b.address} · {b.id}
              </small>
            </div>
            <div className="booking-row-actions">
              <span
                className={`status ${b.status === "Cancelled" ? "cancelled" : ""}`}
              >
                {b.status}
              </span>
              <strong>{money(b.price)}</strong>
              {b.status === "Confirmed" && (
                <button
                  className="text-link"
                  onClick={() => {
                    const parts = b.time.match(/(\d+):(\d+) (AM|PM)/)!;
                    const h =
                      (Number(parts[1]) % 12) + (parts[3] === "PM" ? 12 : 0);
                    const start = new Date(
                      `${b.date}T${String(h).padStart(2, "0")}:${parts[2]}:00+05:00`,
                    );
                    const late = start.getTime() - Date.now() < 12 * 3600000;
                    if (
                      window.confirm(
                        late
                          ? "Cancel this demo session? It is within 12 hours, so the sample policy is non-refundable."
                          : "Cancel this demo session? Free cancellation applies.",
                      )
                    ) {
                      update({
                        bookings: state.bookings.map((x) =>
                          x.id === b.id ? { ...x, status: "Cancelled" } : x,
                        ),
                      });
                      notify("Demo booking cancelled.");
                    }
                  }}
                >
                  Cancel booking
                </button>
              )}
              {isTrainer && b.status === "Confirmed" && (
                <button
                  className="text-link"
                  onClick={() => {
                    update({
                      bookings: state.bookings.map((x) =>
                        x.id === b.id
                          ? {
                              ...x,
                              completedSessions: (x.completedSessions || 0) + 1,
                              status:
                                (x.completedSessions || 0) + 1 >=
                                (t.packages.find((p) => p.id === x.packageId)
                                  ?.sessions || 1)
                                  ? "Completed"
                                  : "Confirmed",
                            }
                          : x,
                      ),
                    });
                    notify("Session marked complete.");
                  }}
                >
                  Log completed session
                </button>
              )}
              <Link
                className="text-link"
                href={`/dashboard/${role}/messages?trainer=${t.id}`}
              >
                Message →
              </Link>
            </div>
          </article>
        );
      })}
    </div>
  );
  return (
    <div className="dashboard-layout container">
      <aside className="dashboard-nav">
        <p className="eyebrow">
          {isAdmin
            ? "SPOTTER OPERATIONS"
            : isTrainer
              ? "YOUR COACHING BUSINESS"
              : "YOUR TRAINING SPACE"}
        </p>
        <nav>
          {tabs.map((name, i) => {
            const url =
              name === "Overview" ? base : `${base}/${name.toLowerCase()}`;
            const Icon = icons[i % icons.length];
            return (
              <Link
                href={url}
                className={path === url ? "active" : ""}
                key={name}
              >
                <Icon size={17} />
                {name}
              </Link>
            );
          })}
        </nav>
        <div className="dashboard-nav-note">
          <BadgeIcon />
          <p>
            Little steps count.
            <br />
            Keep showing up.
          </p>
          <Link href="/trainers" className="text-link">
            Explore trainers ↗
          </Link>
        </div>
        <Link
          href="/login"
          className="text-link"
          onClick={() => update({ role: "visitor" })}
        >
          <LogOut size={15} />
          Log out
        </Link>
      </aside>
      <div className="dashboard-main">
        <div className="dashboard-title">
          <div>
            <p className="eyebrow">
              {isAdmin
                ? "PLATFORM OVERVIEW"
                : isTrainer
                  ? "A GOOD DAY TO COACH"
                  : "A GOOD DAY TO MOVE"}
            </p>
            <h1>{title}</h1>
            <p>
              {tab === "overview"
                ? `${confirmed.length} upcoming ${confirmed.length === 1 ? "session" : "sessions"}. ${isTrainer ? "Make every one count." : "Make a little room for yourself."}`
                : "Everything you need, all in one place."}
            </p>
          </div>
          <span className="status">Demo workspace</span>
        </div>
        {!ready ? (
          <div className="skeleton-panel" />
        ) : tab === "overview" ? (
          <>
            <div className="kpi-grid">
              {(isAdmin
                ? [
                    [money(sum), "Gross booking value"],
                    [money(0), "Platform revenue"],
                    [String(bookings.length), "Bookings"],
                    [String(trainers.length), "Sample trainers"],
                  ]
                : isTrainer
                  ? [
                      [money(sum), "Booked value"],
                      [String(bookings.length), "Sessions"],
                      [
                        String(new Set(bookings.map((b) => b.name)).size),
                        "Clients",
                      ],
                      ["4.9", "Sample rating"],
                    ]
                  : [
                      [String(confirmed.length), "Upcoming sessions"],
                      [
                        String(
                          bookings.filter((b) => b.status === "Completed")
                            .length,
                        ),
                        "Completed",
                      ],
                      [String(saved.length), "Saved trainers"],
                      [String(state.progress.length), "Progress entries"],
                    ]
              ).map(([n, l]) => (
                <div className="panel kpi" key={l}>
                  <span>{l}</span>
                  <strong>{n}</strong>
                  <small>
                    {isAdmin || isTrainer
                      ? "From this demo workspace"
                      : "Your journey so far"}
                  </small>
                </div>
              ))}
            </div>
            <div className="dashboard-overview-grid">
              <section className="panel">
                <div className="panel-title">
                  <h2>{isTrainer ? "Your schedule" : "Your next session"}</h2>
                  <Link
                    href={`${base}/${isTrainer ? "calendar" : "bookings"}`}
                    className="text-link"
                  >
                    View all ↗
                  </Link>
                </div>
                {confirmed.length ? (
                  <>
                    <h3 className="text-2xl mt-7">
                      {
                        trainers.find((t) => t.id === confirmed[0].trainerId)
                          ?.firstName
                      }{" "}
                      · {confirmed[0].date}
                    </h3>
                    <p className="muted mt-3">
                      {confirmed[0].time} PKT · {confirmed[0].address}
                    </p>
                    <Link
                      href={`${base}/${isTrainer ? "calendar" : "bookings"}`}
                      className="btn mt-6"
                    >
                      View booking →
                    </Link>
                  </>
                ) : (
                  empty(
                    isTrainer
                      ? "Ready for your first client?"
                      : "Your first session starts here.",
                    isTrainer
                      ? "Keep your profile complete so clients can get to know you."
                      : "A coach, a clear plan, and a time that works.",
                    isTrainer ? `${base}/profile` : "/trainers",
                    isTrainer ? "Complete your profile" : "Find a trainer",
                  )
                )}
              </section>
              <section className="panel">
                <p className="eyebrow">MAKE THE NEXT MOVE</p>
                <h2>
                  {isTrainer
                    ? "Keep your business moving."
                    : "A little consistency goes a long way."}
                </h2>
                <div className="quick-actions">
                  {[
                    [
                      isTrainer ? "Profile" : "Explore trainers",
                      isTrainer ? `${base}/profile` : "/trainers",
                    ],
                    ["Messages", `${base}/messages`],
                    [
                      isTrainer ? "Earnings" : "Track progress",
                      `${base}/${isTrainer ? "earnings" : "progress"}`,
                    ],
                  ].map(([l, h]) => (
                    <Link key={h} href={h}>
                      {l}
                      <ArrowUpRight size={18} />
                    </Link>
                  ))}
                </div>
              </section>
            </div>
            {(isAdmin || isTrainer) && <BookingChart bookings={bookings} />}
            {!isAdmin && !isTrainer && (
              <section className="panel mt-6">
                <div className="panel-title">
                  <div>
                    <p className="eyebrow">ONE SESSION AT A TIME</p>
                    <h2>Your goal: {state.goal.toLowerCase()}.</h2>
                  </div>
                  <Link href={`${base}/progress`} className="text-link">
                    Track progress ↗
                  </Link>
                </div>
                {bookings.filter((b) => b.status !== "Cancelled").length ? (
                  bookings
                    .filter((b) => b.status !== "Cancelled")
                    .map((b) => {
                      const t = trainers.find((t) => t.id === b.trainerId)!;
                      const p = t.packages.find((p) => p.id === b.packageId)!;
                      const used =
                        b.completedSessions ||
                        (b.status === "Completed" ? p.sessions : 0);
                      return (
                        <div className="package-usage" key={b.id}>
                          <div>
                            <strong>
                              {p.title} · {t.firstName}
                            </strong>
                            <span>
                              {used} of {p.sessions} sessions used
                            </span>
                          </div>
                          <progress
                            value={used}
                            max={p.sessions}
                            aria-label={`${p.title} sessions used`}
                          />
                        </div>
                      );
                    })
                ) : (
                  <p className="muted mt-5">
                    Your session progress will appear after your first booking.
                  </p>
                )}
              </section>
            )}
            {isAdmin && (
              <section className="panel mt-6">
                <h2>Applications to review</h2>
                <p className="muted mt-3">
                  {
                    state.applications.filter((a) => a.status === "Pending")
                      .length
                  }{" "}
                  applications awaiting a decision.
                </p>
                <Link href="/admin/applications" className="btn mt-5">
                  Review applications →
                </Link>
              </section>
            )}
          </>
        ) : ["bookings", "calendar"].includes(tab) ? (
          bookings.length ? (
            bookingList
          ) : (
            empty(
              "Your calendar has room for something good.",
              "Confirmed sessions will appear here.",
            )
          )
        ) : tab === "saved" ? (
          saved.length ? (
            <div className="search-results">
              {saved.map((t) => (
                <TrainerCard key={t.id} trainer={t} />
              ))}
            </div>
          ) : (
            empty(
              "Keep your favorites close.",
              "Tap the heart on a trainer’s card to save them here.",
            )
          )
        ) : tab === "trainers" || tab === "clients" ? (
          isTrainer && bookings.length ? (
            <div className="client-grid">
              {Array.from(new Set(bookings.map((b) => b.name))).map((name) => (
                <article className="panel" key={name}>
                  <Users size={25} />
                  <h2 className="mt-5">{name}</h2>
                  <p className="muted mt-3">
                    {bookings.filter((b) => b.name === name).length} booked
                    sessions
                  </p>
                  <Link href={`${base}/messages`} className="text-link mt-5">
                    Open messages →
                  </Link>
                </article>
              ))}
            </div>
          ) : bookings.length ? (
            <div className="search-results">
              {trainers
                .filter((t) => bookings.some((b) => b.trainerId === t.id))
                .map((t) => (
                  <TrainerCard trainer={t} key={t.id} />
                ))}
            </div>
          ) : (
            empty(
              isTrainer
                ? "Ready for your first client?"
                : "Your coaching team starts with one person.",
              "Your connections will appear after a booking.",
              isTrainer ? `${base}/profile` : "/trainers",
              isTrainer ? "Complete your profile" : "Find a trainer",
            )
          )
        ) : tab === "messages" ? (
          <section className="panel message-panel">
            <label className="field">
              Conversation
              <select
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
              >
                {trainers.map((t) => (
                  <option value={t.id} key={t.id}>
                    {t.firstName} {t.lastName}
                  </option>
                ))}
              </select>
            </label>
            <div className="message-history">
              {state.messages.filter((m) => m.trainerId === recipient)
                .length ? (
                state.messages
                  .filter((m) => m.trainerId === recipient)
                  .map((m, i) => (
                    <div className="message-bubble" key={i}>
                      <p>{m.text}</p>
                      <small>Saved locally · Demo message</small>
                    </div>
                  ))
              ) : (
                <div className="empty-state compact">
                  <MessageCircle size={30} />
                  <h3>Start a conversation.</h3>
                  <p>Ask about training style, goals, or your next session.</p>
                </div>
              )}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const text = String(
                  new FormData(form).get("message") || "",
                ).trim();
                if (!text) return;
                update({
                  messages: [...state.messages, { trainerId: recipient, text }],
                });
                form.reset();
                notify("Message saved in this demo.");
              }}
            >
              <label className="field">
                Your message
                <textarea
                  name="message"
                  required
                  maxLength={2000}
                  placeholder="Say hello or ask a question…"
                />
              </label>
              <button className="btn">Send demo message →</button>
              <p className="fine-print">
                Messages stay on this device and are not sent to a real trainer.
              </p>
            </form>
          </section>
        ) : tab === "profile" ? (
          <section className="panel max-w-2xl">
            <h2>Make it personal.</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                update({
                  name: String(new FormData(e.currentTarget).get("name")),
                  goal: String(new FormData(e.currentTarget).get("goal")),
                });
                notify("Profile updated.");
              }}
            >
              <label className="field mt-6">
                Name
                <input
                  name="name"
                  required
                  defaultValue={state.name || (isTrainer ? "Ahmed Raza" : "")}
                />
              </label>
              <label className="field">
                Training goal
                <select name="goal" defaultValue={state.goal}>
                  <option>Build strength</option>
                  <option>Improve fitness</option>
                  <option>Mobility</option>
                </select>
              </label>
              <button className="btn">
                Save profile <Check size={17} />
              </button>
            </form>
          </section>
        ) : tab === "progress" ? (
          <section className="panel">
            <h2>Notice the little changes.</h2>
            <p className="muted mt-3">Your own record, at your own pace.</p>
            <form
              className="progress-form"
              onSubmit={(e) => {
                e.preventDefault();
                const f = e.currentTarget;
                const data = new FormData(f);
                update({
                  progress: [
                    ...state.progress,
                    {
                      date: String(data.get("date")),
                      weight: Number(data.get("weight")),
                    },
                  ],
                });
                f.reset();
                notify("Progress saved.");
              }}
            >
              <label className="field">
                Date
                <input
                  type="date"
                  name="date"
                  required
                  defaultValue={dateKey()}
                  max={dateKey()}
                />
              </label>
              <label className="field">
                Weight (kg)
                <input
                  type="number"
                  name="weight"
                  min="20"
                  max="400"
                  step="0.1"
                  required
                />
              </label>
              <button className="btn">Log progress</button>
            </form>
            {state.progress.length ? (
              <>
                <div
                  className="progress-chart"
                  role="img"
                  aria-label={state.progress
                    .map((p) => `${p.date}: ${p.weight} kilograms`)
                    .join("; ")}
                >
                  {state.progress.map((p, i) => (
                    <div key={i}>
                      <strong>{p.weight}</strong>
                      <span
                        style={{
                          height: `${(p.weight / Math.max(...state.progress.map((p) => p.weight))) * 100}px`,
                        }}
                      />
                      <small>{p.date.slice(5)}</small>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="muted">
                Your progress history starts with your first entry.
              </p>
            )}
          </section>
        ) : tab === "reviews" ? (
          <section className="panel">
            <h2>Share what it was like.</h2>
            {state.reviews.map((r) => (
              <article className="profile-review" key={r.bookingId}>
                <div>
                  <strong>Your review</strong>
                  <span className="stars">{"★".repeat(r.rating)}</span>
                </div>
                <p>{r.text}</p>
                <small>Completed demo booking · {r.bookingId}</small>
              </article>
            ))}
            {bookings.filter(
              (b) => b.status === "Completed" && !reviewed.includes(b.id),
            ).length
              ? bookings
                  .filter(
                    (b) => b.status === "Completed" && !reviewed.includes(b.id),
                  )
                  .map((b) => (
                    <form
                      className="mt-6"
                      key={b.id}
                      onSubmit={(e) => {
                        e.preventDefault();
                        update({
                          reviews: [
                            ...state.reviews,
                            {
                              bookingId: b.id,
                              rating: Number(rating),
                              text: String(
                                new FormData(e.currentTarget).get("review"),
                              ),
                            },
                          ],
                        });
                        notify("Review submitted in this demo.");
                      }}
                    >
                      <h3>
                        {trainers.find((t) => t.id === b.trainerId)?.firstName}
                      </h3>
                      <label className="field">
                        Rating
                        <select
                          value={rating}
                          onChange={(e) => setRating(e.target.value)}
                        >
                          {[5, 4, 3, 2, 1].map((n) => (
                            <option key={n}>{n}</option>
                          ))}
                        </select>
                      </label>
                      <label className="field">
                        Your experience
                        <textarea name="review" required />
                      </label>
                      <button className="btn">Submit review</button>
                    </form>
                  ))
              : empty(
                  "Your experience matters.",
                  "You can review a trainer after a completed session.",
                )}
          </section>
        ) : tab === "applications" ? (
          <section className="panel">
            <h2>Meet your next coaches.</h2>
            {state.applications.length
              ? state.applications.map((a, i) => (
                  <div className="application-row" key={i}>
                    <div>
                      <strong>{a.name}</strong>
                      <p>{a.specialty}</p>
                    </div>
                    <span className="status">{a.status}</span>
                    {a.status === "Pending" && (
                      <div className="flex gap-2">
                        {["Approved", "Declined"].map((s) => (
                          <button
                            className="btn outline small"
                            key={s}
                            onClick={() => {
                              update({
                                applications: state.applications.map((x, j) =>
                                  j === i ? { ...x, status: s } : x,
                                ),
                              });
                              notify(`Application ${s.toLowerCase()}.`);
                            }}
                          >
                            {s === "Approved" ? "Approve" : "Decline"}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              : empty(
                  "No applications to review.",
                  "New trainer applications will appear here.",
                  "/become-a-trainer",
                  "View trainer onboarding",
                )}
          </section>
        ) : ["payments", "earnings", "payouts"].includes(tab) ? (
          <section className="panel">
            <h2>{tab === "payouts" ? "Payouts" : "Your booking ledger"}</h2>
            <p className="muted mt-3">
              {tab === "payouts"
                ? "No payouts are due. This demo does not process money."
                : "All amounts are simulated. No money has changed hands."}
            </p>
            {bookings.length && tab !== "payouts" ? (
              <dl className="order-details">
                {bookings.map((b) => (
                  <div key={b.id}>
                    <dt>
                      {b.id} · {b.status}
                    </dt>
                    <dd>{money(b.price)}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <div className="empty-state compact">
                <CreditCard size={32} />
                <h3>Nothing to settle.</h3>
                <p>Transactions will appear alongside your bookings.</p>
                <Link href="/trainers" className="text-link">
                  Explore trainers →
                </Link>
              </div>
            )}
          </section>
        ) : tab === "disputes" ? (
          empty(
            "Nothing needs a resolution.",
            "Booking disputes will appear here when reported.",
            "/admin/bookings",
            "Review bookings",
          )
        ) : (
          empty(
            "Let’s get you back on track.",
            "Choose a section from your dashboard.",
            base,
            "Go to overview",
          )
        )}
      </div>
      <nav className="dashboard-mobile" aria-label="Dashboard navigation">
        {[
          ["Home", base, LayoutDashboard],
          [
            isTrainer ? "Calendar" : "Explore",
            isTrainer ? `${base}/calendar` : "/trainers",
            Search,
          ],
          ["Bookings", `${base}/bookings`, CalendarDays],
          ["Messages", `${base}/messages`, MessageCircle],
          ["Profile", `${base}/profile`, User],
        ].map(([l, h, I]) => {
          const Icon = I as typeof User;
          return (
            <Link
              href={h as string}
              key={l as string}
              className={path === h ? "active" : ""}
            >
              <Icon size={19} />
              <span>{l as string}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
function BadgeIcon() {
  return <TrendingUp size={28} />;
}
