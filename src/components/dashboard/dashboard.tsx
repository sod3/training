"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Award,
  BarChart3,
  Bell,
  Bookmark,
  CalendarCheck,
  Clock,
  CreditCard,
  FileCode,
  FileText,
  Folder,
  Headphones,
  Layers,
  LayoutDashboard,
  Lock,
  LogOut,
  MessageSquare,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  RefreshCw,
  Settings,
  ShieldCheck,
  Star,
  Tag,
  TrendingUp,
  User,
  Users,
} from "lucide-react";
import { api, useApi } from "@/lib/client-api";
import { useStore } from "@/components/marketplace/store";
import { ActionForm } from "./action-form";
import { AdminPanel, AdminSettings, RecordDetails } from "./admin-panel";
import {
  AvailabilityPanel,
  EarningsPanel,
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
import { ReviewComposer } from "./review-composer";

const primaryTabsByRole: Record<string, string[]> = {
  customer: [
    "overview",
    "bookings",
    "trainers",
    "saved",
    "messages",
    "reviews",
    "payments",
  ],
  trainer: [
    "overview",
    "bookings",
    "clients",
    "availability",
    "packages",
    "messages",
    "reviews",
    "earnings",
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
    "categories",
    "specialties",
    "content",
    "support",
    "reports",
    "audit-logs",
  ],
};

const accountTabsByRole: Record<string, string[]> = {
  customer: ["notifications", "profile", "security"],
  trainer: ["profile", "verification", "application", "notifications", "security"],
  admin: ["notifications", "settings", "security"],
};

function getNavIcon(tabKey: string) {
  switch (tabKey) {
    case "overview":
      return <LayoutDashboard size={18} className="sidebar-nav-icon" />;
    case "bookings":
      return <CalendarCheck size={18} className="sidebar-nav-icon" />;
    case "clients":
    case "users":
    case "customers":
      return <Users size={18} className="sidebar-nav-icon" />;
    case "trainers":
      return <Award size={18} className="sidebar-nav-icon" />;
    case "availability":
    case "sessions":
      return <Clock size={18} className="sidebar-nav-icon" />;
    case "packages":
      return <Package size={18} className="sidebar-nav-icon" />;
    case "messages":
      return <MessageSquare size={18} className="sidebar-nav-icon" />;
    case "reviews":
      return <Star size={18} className="sidebar-nav-icon" />;
    case "earnings":
    case "payouts":
      return <TrendingUp size={18} className="sidebar-nav-icon" />;
    case "saved":
      return <Bookmark size={18} className="sidebar-nav-icon" />;
    case "payments":
      return <CreditCard size={18} className="sidebar-nav-icon" />;
    case "refunds":
      return <RefreshCw size={18} className="sidebar-nav-icon" />;
    case "profile":
      return <User size={18} className="sidebar-nav-icon" />;
    case "verification":
      return <ShieldCheck size={18} className="sidebar-nav-icon" />;
    case "application":
    case "applications":
      return <FileText size={18} className="sidebar-nav-icon" />;
    case "notifications":
      return <Bell size={18} className="sidebar-nav-icon" />;
    case "security":
      return <Lock size={18} className="sidebar-nav-icon" />;
    case "settings":
      return <Settings size={18} className="sidebar-nav-icon" />;
    case "categories":
      return <Folder size={18} className="sidebar-nav-icon" />;
    case "specialties":
      return <Tag size={18} className="sidebar-nav-icon" />;
    case "content":
      return <Layers size={18} className="sidebar-nav-icon" />;
    case "support":
      return <Headphones size={18} className="sidebar-nav-icon" />;
    case "reports":
      return <BarChart3 size={18} className="sidebar-nav-icon" />;
    case "audit-logs":
      return <FileCode size={18} className="sidebar-nav-icon" />;
    default:
      return <LayoutDashboard size={18} className="sidebar-nav-icon" />;
  }
}

function getTabLabel(t: string) {
  if (t === "packages") return "Services & Pricing";
  if (t === "application") return "Application status";
  if (t === "audit-logs") return "Audit logs";
  return t.charAt(0).toUpperCase() + t.slice(1).replaceAll("-", " ");
}

function formatMetricKey(key: string) {
  const customMap: Record<string, string> = {
    grossRs: "Gross Revenue",
    feesRs: "Platform Fees",
    earningsRs: "Net Earnings",
    gross: "Gross Revenue",
    fees: "Platform Fees",
    earnings: "Net Earnings",
    totalBookings: "Total Bookings",
    activeTrainers: "Active Trainers",
    totalCustomers: "Total Customers",
    activePackages: "Active Packages",
    completedSessions: "Completed Sessions",
    upcomingSessions: "Upcoming Sessions",
    netEarnings: "Net Earnings",
    totalRevenue: "Total Revenue",
    platformFees: "Platform Fees",
  };
  if (customMap[key]) return customMap[key];
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/_/g, " ")
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

function useDebouncedValue(value: string, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [delay, value]);
  return debounced;
}

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
  const selectedRole = role in primaryTabsByRole ? role : "customer";
  const base =
    selectedRole === "admin"
      ? "/admin"
      : selectedRole === "trainer"
        ? "/trainer"
        : "/dashboard/customer";
  const { state, notify, refresh } = useStore();
  const [collapsed, setCollapsed] = useState(false);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [days, setDays] = useState("30");
  const debouncedQuery = useDebouncedValue(q);
  const debouncedStatus = useDebouncedValue(status);
  const endpoint = `${selectedRole === "admin" ? "admin" : selectedRole === "trainer" ? "trainer" : "dashboard"}/${tab}?${new URLSearchParams({ q: debouncedQuery, status: debouncedStatus, page: String(page), days })}`;
  const { data, error, loading, reload } = useApi<Item>(endpoint);
  const items = rows(data?.items);
  const update = useCallback(() => {
    reload();
    refresh();
  }, [refresh, reload]);
  const overview =
    ["overview", "analytics", "reports"].includes(tab) ||
    (tab === "earnings" && selectedRole !== "trainer");

  const primaryNavItems = primaryTabsByRole[selectedRole] || [];
  const accountNavItems = accountTabsByRole[selectedRole] || [];

  return (
    <div className={`workspace ${collapsed ? "collapsed" : ""}`}>
      <aside className="workspace-sidebar">
        {/* Identity Header */}
        <div className="sidebar-identity">
          <div className="sidebar-identity-info">
            <p className="eyebrow">SPOTTER / {selectedRole}</p>
            <strong className="sidebar-user-name" title={state.name || "Workspace"}>
              {state.name || "Workspace"}
            </strong>
          </div>
          <button
            type="button"
            className="sidebar-collapse-btn"
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? "Expand navigation sidebar" : "Collapse navigation sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>
        </div>

        {/* Scrollable Navigation Area */}
        <div className="sidebar-scroll-area">
          <div className="sidebar-section">
            {!collapsed && <p className="eyebrow sidebar-section-title">WORKSPACE</p>}
            <nav aria-label="Dashboard primary navigation">
              {primaryNavItems.map((t) => {
                const isActive = tab === t;
                const label = getTabLabel(t);
                const href = t === "overview" ? base : `${base}/${t}`;
                const unreadCount =
                  t === "notifications"
                    ? state.unread
                    : t === "messages"
                      ? state.unreadMessages
                      : 0;

                return (
                  <Link
                    key={t}
                    className={`sidebar-nav-item ${isActive ? "active" : ""}`}
                    href={href}
                    title={label}
                  >
                    <span className="sidebar-nav-icon-container">{getNavIcon(t)}</span>
                    {!collapsed && <span className="sidebar-nav-label">{label}</span>}
                    {unreadCount > 0 && (
                      <span className="sidebar-nav-badge">{unreadCount}</span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="sidebar-section sidebar-account-section">
            {!collapsed && <p className="eyebrow sidebar-section-title">ACCOUNT</p>}
            <nav aria-label="Account navigation">
              {accountNavItems.map((t) => {
                const isActive = tab === t;
                const label = getTabLabel(t);
                const href = `${base}/${t}`;
                const unreadCount = t === "notifications" ? state.unread : 0;

                return (
                  <Link
                    key={t}
                    className={`sidebar-nav-item ${isActive ? "active" : ""}`}
                    href={href}
                    title={label}
                  >
                    <span className="sidebar-nav-icon-container">{getNavIcon(t)}</span>
                    {!collapsed && <span className="sidebar-nav-label">{label}</span>}
                    {unreadCount > 0 && (
                      <span className="sidebar-nav-badge">{unreadCount}</span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Footer Area with Log Out */}
        <div className="sidebar-footer">
          <button
            type="button"
            className="sidebar-logout-btn"
            title="Log out"
            onClick={async () => {
              try {
                await api("auth/logout", {});
                refresh();
                router.push("/");
                notify("Signed out successfully.");
              } catch (e) {
                notify((e as Error).message);
              }
            }}
          >
            <LogOut size={18} className="sidebar-logout-icon" />
            {!collapsed && <span>Log out</span>}
          </button>
        </div>
      </aside>
      <div className="workspace-main">
        <div className="page-heading">
          <p className="eyebrow">YOUR SPACE TO MOVE FORWARD</p>
          <h1>
            {tab === "overview"
              ? `Welcome${state.name ? `, ${state.name.split(" ")[0]}` : ""}.`
              : tab === "packages"
                ? "Services & Pricing."
                : tab === "application"
                  ? "Application status."
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
                  {selectedRole !== "admin" && (
                    <section className="panel dashboard-primary">
                      <div>
                        <p className="eyebrow">
                          {selectedRole === "customer"
                            ? "YOUR NEXT SESSION"
                            : "UP NEXT"}
                        </p>
                        {rows(data.upcoming).length ? (
                          <>
                            <h2>{date(rows(data.upcoming)[0].start)}</h2>
                            <p>
                              Session{" "}
                              {num(rows(data.upcoming)[0], "sessionNumber")} ·
                              Live online coaching
                            </p>
                          </>
                        ) : (
                          <>
                            <h2>No session scheduled yet.</h2>
                            <p>
                              {selectedRole === "customer"
                                ? "Your next confirmed session will appear here."
                                : "Confirmed client sessions will appear here."}
                            </p>
                          </>
                        )}
                      </div>
                      <div className="dashboard-primary-actions">
                        {rows(data.upcoming).length > 0 &&
                          str(rows(data.upcoming)[0], "meetingUrl") && (
                            <a
                              className="btn lime"
                              href={str(rows(data.upcoming)[0], "meetingUrl")}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Join session →
                            </a>
                          )}
                        <Link
                          className="btn outline"
                          href={
                            selectedRole === "customer"
                              ? `${base}/bookings`
                              : `${base}/availability`
                          }
                        >
                          {selectedRole === "customer"
                            ? "Manage booking"
                            : "Manage availability"}
                        </Link>
                      </div>
                    </section>
                  )}
                  <div className="workspace-stats">
                    {Object.entries(record(data.metrics)).map(
                      ([key, value]) => (
                        <article className="panel workspace-stat-card" key={key}>
                          <span className="stat-label">{formatMetricKey(key)}</span>
                          <strong className="stat-value">{String(value)}</strong>
                        </article>
                      ),
                    )}
                  </div>
                  <section className="panel financial-overview-section">
                    <h2>
                      {selectedRole === "customer"
                        ? "Your payments"
                        : "Financial overview"}
                    </h2>
                    <div className="financial-overview-grid">
                      {Object.entries(record(data.finance))
                        .filter(([key]) => key !== "_id")
                        .map(([key, value]) => (
                          <article className="financial-metric-card" key={key}>
                            <span className="financial-metric-label">{formatMetricKey(key)}</span>
                            <strong className="financial-metric-value">{amount(value)}</strong>
                          </article>
                        ))}
                    </div>
                    <p className="financial-notice-text">
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
              {tab === "earnings" && selectedRole === "trainer" && (
                <EarningsPanel data={data} reload={reload} />
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
                        name: "newEmail",
                        label: "New email address (optional)",
                        type: "email",
                        value: str(record(data.profile), "normalizedEmail"),
                        hint: "Email verification is not required. This becomes your sign-in email immediately.",
                      },
                      {
                        name: "newPassword",
                        label: "New password (optional)",
                        type: "password",
                      },
                      {
                        name: "confirmPassword",
                        label: "Confirm new password",
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
                      newEmail: v.newEmail || undefined,
                      newPassword: v.newPassword || undefined,
                      confirmPassword: v.newPassword
                        ? v.confirmPassword
                        : undefined,
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
              {tab === "availability" && selectedRole === "trainer" && (
                <>
                  <AvailabilityPanel
                    key={JSON.stringify(data.rules)}
                    data={data}
                    reload={reload}
                  />
                  <section className="panel mt-5">
                    <h2>Session calendar</h2>
                    {items.length ? (
                      items.map((s) => (
                        <p key={str(s, "_id")}>
                          {date(s.start)} — {date(s.end)} · {str(s, "status")}
                        </p>
                      ))
                    ) : (
                      <p>No sessions on your calendar.</p>
                    )}
                  </section>
                </>
              )}
              {tab === "verification" && selectedRole === "trainer" && (
                <VerificationPanel data={data} reload={reload} />
              )}
              {tab === "application" &&
                selectedRole === "trainer" &&
                (() => {
                  const application = record(data.application);
                  const trainer = record(data.trainer);
                  const applicationStatus =
                    str(application, "status") ||
                    str(trainer, "applicationStatus") ||
                    "DRAFT";
                  const editable = [
                    "DRAFT",
                    "ACTION_REQUIRED",
                    "REJECTED",
                  ].includes(applicationStatus);
                  return (
                    <section className="panel application-status-panel">
                      <p className="eyebrow">TRAINER APPLICATION</p>
                      <div className="panel-title">
                        <h2>{applicationStatus.replaceAll("_", " ")}</h2>
                        <span className="status">{applicationStatus}</span>
                      </div>
                      <p>
                        {applicationStatus === "APPROVED"
                          ? "Your trainer application is approved. Continue managing your public profile, services and availability from the dashboard."
                          : ["SUBMITTED", "UNDER_REVIEW"].includes(
                                applicationStatus,
                              )
                            ? "Your complete application has been submitted. You can review your verification status while the Spotter admin team checks your profile, identity and certification."
                            : "Complete every onboarding step before submitting your application for admin review."}
                      </p>
                      {str(application, "adminNotes") && (
                        <div className="payment-notice">
                          <strong>Admin feedback</strong>
                          <p>{str(application, "adminNotes")}</p>
                        </div>
                      )}
                      {editable && (
                        <Link className="btn mt-5" href="/trainer/onboarding">
                          Continue onboarding →
                        </Link>
                      )}
                      {["SUBMITTED", "UNDER_REVIEW"].includes(
                        applicationStatus,
                      ) && (
                        <Link
                          className="btn outline mt-5"
                          href="/trainer/verification"
                        >
                          View verification status →
                        </Link>
                      )}
                    </section>
                  );
                })()}
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
                    <article className="panel review-card" key={str(r, "_id")}>
                      <div className="review-card-head">
                        <div
                          className="review-stars"
                          aria-label={`${num(r, "rating")} out of 5 stars`}
                        >
                          {"★".repeat(num(r, "rating"))}
                          <span>
                            {"★".repeat(Math.max(0, 5 - num(r, "rating")))}
                          </span>
                        </div>
                        <span className="status">Verified booking</span>
                      </div>
                      <blockquote>{str(r, "review")}</blockquote>
                      <small>
                        {str(r, "status")} · {date(r.createdAt)}
                      </small>
                    </article>
                  ))}
                  {selectedRole === "customer" && (
                    <ReviewComposer eligible={data.eligible} onDone={reload} />
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
                !["packages", "availability", "messages", "earnings"].includes(
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
                        Browse trainers →
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
