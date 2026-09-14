"use client";
import { useCallback, useEffect, useRef, useState } from "react";
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
  Headphones,
  Layers,
  LayoutDashboard,
  Lock,
  LogOut,
  Menu,
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
import { AdminPanel, AdminSettings } from "./admin-panel";
import {
  ClientsPanel,
  CustomerTrainingPanel,
  EarningsPanel,
  ProfilePanel,
  SchedulePanel,
  TrainerProfilePanel,
  amount,
  date,
  num,
  record,
  rows,
  str,
  type Item,
} from "./panels";
import { BookingList, StartConversation } from "./bookings-panel";

const primaryTabsByRole: Record<string, string[]> = {
  customer: ["overview", "training", "saved"],
  trainer: ["overview", "clients", "schedule", "earnings"],
  admin: ["overview", "users", "bookings", "operations", "settings"],
};

const accountTabsByRole: Record<string, string[]> = {
  customer: ["profile"],
  trainer: ["profile"],
  admin: ["notifications", "security"],
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
    case "operations":
      return <Layers size={18} className="sidebar-nav-icon" />;
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
  if (t === "overview") return "Overview";
  if (t === "users") return "Users";
  if (t === "bookings") return "Bookings & Payments";
  if (t === "operations") return "Operations";
  if (t === "settings") return "Settings";
  if (t === "training") return "My Training";
  if (t === "schedule") return "Schedule & Pricing";
  if (t === "earnings") return "Earnings";
  if (t === "clients") return "Clients";
  if (t === "profile") return "Profile";
  if (t === "saved") return "Saved Trainers";
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

function AdminOverviewAlerts({
  metrics,
}: {
  metrics: Record<string, unknown>;
}) {
  const pendingPayments = Number(metrics["Pending payments"] || 0);
  const pendingApplications = Number(metrics["Pending applications"] || 0);
  const refundRequests = Number(metrics["Refund requests"] || 0);
  const totalPending = pendingPayments + pendingApplications + refundRequests;

  return (
    <section className="panel admin-alerts-section mb-6">
      <div className="admin-alerts-header flex items-center justify-between pb-3 border-b mb-4">
        <div>
          <h2 className="text-lg font-bold">Operational Action Items</h2>
          <p className="muted text-sm">
            Immediate review items requiring administrative decision
          </p>
        </div>
        {totalPending > 0 ? (
          <span className="admin-badge badge-pending font-semibold px-3 py-1 text-xs rounded-full">
            {totalPending} Action{totalPending === 1 ? "" : "s"} Pending
          </span>
        ) : (
          <span className="admin-badge badge-approved font-semibold px-3 py-1 text-xs rounded-full">
            ✓ All Clear
          </span>
        )}
      </div>

      {totalPending === 0 ? (
        <div className="admin-alert-clean p-3 bg-emerald-50/60 text-emerald-800 rounded-md border border-emerald-200 text-sm">
          <p>
            🎉 All pending payment verifications, trainer applications, and
            refund requests are up to date.
          </p>
        </div>
      ) : (
        <div className="admin-alerts-grid grid grid-cols-1 md:grid-cols-3 gap-4">
          {pendingPayments > 0 && (
            <div className="admin-alert-card urgent-payment p-4 bg-amber-50/70 border border-amber-200 rounded-lg flex flex-col justify-between">
              <div className="admin-alert-info mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-800 block mb-1">
                  Payment Verification
                </span>
                <strong className="text-base text-amber-950 block">
                  {pendingPayments} Payment proof
                  {pendingPayments === 1 ? "" : "s"} pending
                </strong>
                <p className="text-xs text-amber-800 mt-1">
                  Verify bank & JazzCash screenshots to confirm bookings.
                </p>
              </div>
              <Link
                href="/admin/payments"
                className="btn lime small w-full text-center"
              >
                Review Payments →
              </Link>
            </div>
          )}
          {pendingApplications > 0 && (
            <div className="admin-alert-card urgent-application p-4 bg-blue-50/70 border border-blue-200 rounded-lg flex flex-col justify-between">
              <div className="admin-alert-info mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-800 block mb-1">
                  Trainer Onboarding
                </span>
                <strong className="text-base text-blue-950 block">
                  {pendingApplications} Application
                  {pendingApplications === 1 ? "" : "s"} pending
                </strong>
                <p className="text-xs text-blue-800 mt-1">
                  Inspect identity documents and approve trainer profiles.
                </p>
              </div>
              <Link
                href="/admin/applications"
                className="btn outline small w-full text-center"
              >
                Review Applications →
              </Link>
            </div>
          )}
          {refundRequests > 0 && (
            <div className="admin-alert-card urgent-refund p-4 bg-purple-50/70 border border-purple-200 rounded-lg flex flex-col justify-between">
              <div className="admin-alert-info mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-purple-800 block mb-1">
                  Refund Requests
                </span>
                <strong className="text-base text-purple-950 block">
                  {refundRequests} Request{refundRequests === 1 ? "" : "s"}{" "}
                  pending
                </strong>
                <p className="text-xs text-purple-800 mt-1">
                  Review refund requests and record manual transfer reference.
                </p>
              </div>
              <Link
                href="/admin/refunds"
                className="btn outline small w-full text-center"
              >
                Review Refunds →
              </Link>
            </div>
          )}
        </div>
      )}
    </section>
  );
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
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const sidebarRef = useRef<HTMLElement>(null);
  const menuRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!mobileNavOpen) return;
    const sidebar = sidebarRef.current;
    if (!sidebar) return;
    const trigger = menuRef.current;
    const background = Array.from(
      document.querySelectorAll<HTMLElement>(".site-nav, .workspace-main"),
    );
    const previousInert = background.map((element) => element.inert);
    background.forEach((element) => {
      element.inert = true;
    });
    const focusable = () =>
      Array.from(
        sidebar.querySelectorAll<HTMLElement>(
          "a[href], button:not([disabled])",
        ),
      ).filter((element) => element.getClientRects().length > 0);
    focusable()[0]?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileNavOpen(false);
      if (event.key !== "Tab") return;
      const items = focusable();
      const first = items[0];
      const last = items.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    const media = window.matchMedia("(max-width: 768px)");
    const resize = () => {
      if (!media.matches) setMobileNavOpen(false);
    };
    document.addEventListener("keydown", keydown);
    media.addEventListener("change", resize);
    return () => {
      document.removeEventListener("keydown", keydown);
      media.removeEventListener("change", resize);
      background.forEach((element, index) => {
        element.inert = previousInert[index];
      });
      trigger?.focus();
    };
  }, [mobileNavOpen]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [days, setDays] = useState("30");
  const debouncedQuery = useDebouncedValue(q);
  const debouncedStatus = useDebouncedValue(status);

  const adminMainTabMap: Record<string, string> = {
    overview: "overview",
    users: "users",
    customers: "users",
    trainers: "users",
    applications: "users",
    verification: "users",
    bookings: "bookings",
    payments: "bookings",
    refunds: "bookings",
    payouts: "bookings",
    operations: "operations",
    categories: "operations",
    specialties: "operations",
    content: "operations",
    sessions: "operations",
    reviews: "operations",
    support: "operations",
    reports: "operations",
    "audit-logs": "operations",
    settings: "settings",
    security: "security",
    notifications: "notifications",
  };

  const adminDefaultApiTab: Record<string, string> = {
    operations: "categories",
  };

  const targetTab =
    selectedRole === "admin" && adminDefaultApiTab[tab]
      ? adminDefaultApiTab[tab]
      : tab;
  const endpoint = `${selectedRole === "admin" ? "admin" : selectedRole === "trainer" ? "trainer" : "dashboard"}/${targetTab}?${new URLSearchParams({ q: debouncedQuery, status: debouncedStatus, page: String(page), days })}`;
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
  const activeAdminMainTab =
    selectedRole === "admin" ? adminMainTabMap[tab] || "overview" : tab;

  return (
    <div
      className={`workspace ${collapsed ? "collapsed" : ""} ${mobileNavOpen ? "mobile-nav-open" : ""}`}
    >
      <aside
        ref={sidebarRef}
        id="workspace-navigation"
        className="workspace-sidebar"
        role={mobileNavOpen ? "dialog" : undefined}
        aria-modal={mobileNavOpen ? true : undefined}
        aria-label="Workspace navigation"
        onClick={(event) => {
          if ((event.target as HTMLElement).closest("a[href]"))
            setMobileNavOpen(false);
        }}
      >
        {/* Identity Header */}
        <div className="sidebar-identity">
          <div className="sidebar-identity-info">
            <p className="eyebrow">SPOTTER / {selectedRole}</p>
            <strong
              className="sidebar-user-name"
              title={state.name || "Workspace"}
            >
              {state.name || "Workspace"}
            </strong>
          </div>
          <button
            type="button"
            className="sidebar-collapse-btn"
            onClick={() => {
              if (!mobileNavOpen) setCollapsed(!collapsed);
              setMobileNavOpen(false);
            }}
            aria-label={
              mobileNavOpen
                ? "Close navigation"
                : collapsed
                  ? "Expand navigation sidebar"
                  : "Collapse navigation sidebar"
            }
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <PanelLeftOpen size={18} />
            ) : (
              <PanelLeftClose size={18} />
            )}
          </button>
        </div>

        {/* Scrollable Navigation Area */}
        <div className="sidebar-scroll-area">
          <div className="sidebar-section">
            {!collapsed && (
              <p className="eyebrow sidebar-section-title">WORKSPACE</p>
            )}
            <nav aria-label="Dashboard primary navigation">
              {primaryNavItems.map((t) => {
                const isActive =
                  selectedRole === "admin"
                    ? activeAdminMainTab === t
                    : tab === t;
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
                    aria-current={isActive ? "page" : undefined}
                    title={label}
                  >
                    <span className="sidebar-nav-icon-container">
                      {getNavIcon(t)}
                    </span>
                    <span
                      className={`sidebar-nav-label ${collapsed ? "desktop-collapsed-label" : ""}`}
                    >
                      {label}
                    </span>
                    {unreadCount > 0 && (
                      <span className="sidebar-nav-badge">{unreadCount}</span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="sidebar-section sidebar-account-section">
            {!collapsed && (
              <p className="eyebrow sidebar-section-title">ACCOUNT</p>
            )}
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
                    aria-current={isActive ? "page" : undefined}
                    title={label}
                  >
                    <span className="sidebar-nav-icon-container">
                      {getNavIcon(t)}
                    </span>
                    <span
                      className={`sidebar-nav-label ${collapsed ? "desktop-collapsed-label" : ""}`}
                    >
                      {label}
                    </span>
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
            <span className={collapsed ? "desktop-collapsed-label" : undefined}>
              Log out
            </span>
          </button>
        </div>
      </aside>
      {mobileNavOpen && (
        <button
          type="button"
          className="workspace-sidebar-overlay"
          aria-label="Close navigation"
          onClick={() => setMobileNavOpen(false)}
        />
      )}
      <div className="workspace-main">
        <button
          ref={menuRef}
          type="button"
          className="workspace-mobile-menu"
          aria-label="Open workspace navigation"
          aria-expanded={mobileNavOpen}
          aria-controls="workspace-navigation"
          onClick={() => setMobileNavOpen(true)}
        >
          <Menu size={20} />
          <span>Menu</span>
        </button>
        <div className="page-heading">
          <p className="eyebrow">YOUR SPACE TO MOVE FORWARD</p>
          <h1>
            {tab === "overview"
              ? `Welcome${state.name ? `, ${state.name.split(" ")[0]}` : ""}.`
              : tab === "packages"
                ? "Services & Pricing."
                : tab === "application"
                  ? "Application status."
                  : getTabLabel(tab)}
          </h1>
        </div>
        {trainerId &&
          (tab === "messages" || tab === "training") &&
          !rows(data?.conversations).some(
            (c) => str(c, "trainerId") === trainerId,
          ) && <StartConversation trainerId={trainerId} onStarted={update} />}
        <div className="workspace-toolbar">
          {loading && data && (
            <span
              className="status-badge status-badge-processing"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.35rem",
                fontSize: "0.8rem",
                padding: "0.25rem 0.6rem",
              }}
            >
              <RefreshCw
                size={12}
                style={{ animation: "spin 1s linear infinite" }}
              />{" "}
              Updating data…
            </span>
          )}
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
                  {selectedRole === "admin" && (
                    <AdminOverviewAlerts metrics={record(data.metrics)} />
                  )}
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
                        <article
                          className="panel workspace-stat-card"
                          key={key}
                        >
                          <span className="stat-label">
                            {formatMetricKey(key)}
                          </span>
                          <strong className="stat-value">
                            {String(value)}
                          </strong>
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
                            <span className="financial-metric-label">
                              {formatMetricKey(key)}
                            </span>
                            <strong className="financial-metric-value">
                              {amount(value)}
                            </strong>
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
                              aria-label={`Bookings on ${str(r, "_id")}`}
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
              {tab === "schedule" && selectedRole === "trainer" && (
                <SchedulePanel data={data} reload={reload} />
              )}
              {tab === "clients" && selectedRole === "trainer" && (
                <ClientsPanel data={data} reload={reload} />
              )}
              {tab === "earnings" && selectedRole === "trainer" && (
                <EarningsPanel data={data} reload={reload} />
              )}
              {tab === "profile" && selectedRole === "trainer" && (
                <TrainerProfilePanel data={data} reload={update} />
              )}
              {tab === "training" && selectedRole === "customer" && (
                <CustomerTrainingPanel
                  data={data}
                  reload={update}
                  trainerId={trainerId}
                  bookingContent={
                    <BookingList
                      items={rows(data.orders || data.items)}
                      role="customer"
                      reload={update}
                    />
                  }
                />
              )}
              {tab === "profile" && selectedRole === "customer" && (
                <ProfilePanel data={data} role="customer" reload={update} />
              )}
              {tab === "settings" && selectedRole === "admin" && (
                <AdminSettings
                  settings={record(data.settings)}
                  reload={reload}
                />
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
                !overview &&
                !items.length &&
                ![
                  "training",
                  "packages",
                  "availability",
                  "messages",
                  "earnings",
                ].includes(tab) && (
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
