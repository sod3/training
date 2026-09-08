"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Bell,
  ChevronDown,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Settings,
  User as UserIcon,
  X,
} from "lucide-react";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useStore } from "@/components/marketplace/store";
import { api } from "@/lib/client-api";

export function Logo() {
  return (
    <Link href="/" className="brand" aria-label="Spotter home">
      SPOTTER<span className="brand-period">.</span>
    </Link>
  );
}

function roleLabel(role: string) {
  if (role === "admin") return "Admin";
  if (role === "trainer") return "Trainer";
  if (role === "customer") return "Customer";
  return "Visitor";
}

function getNavConfig(role: string) {
  switch (role) {
    case "customer":
      return {
        mainNav: [
          { title: "Overview", href: "/dashboard/customer" },
          { title: "Trainers", href: "/trainers" },
          { title: "How It Works", href: "/how-it-works" },
        ],
        showGetMatched: true,
        showLogIn: false,
      };
    case "trainer":
      return {
        mainNav: [
          { title: "Overview", href: "/trainer" },
          { title: "Trainers", href: "/trainers" },
          { title: "How It Works", href: "/how-it-works" },
        ],
        showGetMatched: false,
        showLogIn: false,
      };
    case "admin":
      return {
        mainNav: [
          { title: "Applications", href: "/admin/applications" },
          { title: "Bookings", href: "/admin/bookings" },
          { title: "Users", href: "/admin/users" },
          { title: "Payouts", href: "/admin/payouts" },
        ],
        showGetMatched: false,
        showLogIn: false,
      };
    case "visitor":
    default:
      return {
        mainNav: [
          { title: "Trainers", href: "/trainers" },
          { title: "How It Works", href: "/how-it-works" },
          { title: "Become a Trainer", href: "/become-a-trainer" },
        ],
        showGetMatched: true,
        showLogIn: true,
      };
  }
}

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const [scrolled, setScrolled] = useState(false);
  const { state, notify, refresh } = useStore();

  const dashboard =
    state.role === "admin"
      ? "/admin"
      : state.role === "trainer"
        ? "/trainer"
        : "/dashboard/customer";

  const config = getNavConfig(state.role);

  useEffect(() => {
    const scroll = () => setScrolled(window.scrollY > 24);
    scroll();
    window.addEventListener("scroll", scroll, { passive: true });
    return () => window.removeEventListener("scroll", scroll);
  }, []);

  useEffect(() => {
    if (!accountOpen) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!accountMenuRef.current?.contains(event.target as Node)) {
        setAccountOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setAccountOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [accountOpen]);

  const minimal = ["/match", "/checkout", "/login", "/signup"].includes(
    pathname,
  );

  const handleLogout = async () => {
    setAccountOpen(false);
    setOpen(false);
    try {
      await api("auth/logout", {});
      refresh();
      router.push("/");
      notify("Signed out successfully.");
    } catch (e) {
      notify((e as Error).message);
    }
  };

  return (
    <header
      className={`site-nav ${pathname === "/" ? "on-hero" : ""} ${scrolled ? "scrolled" : ""}`}
    >
      <div className="container nav-inner">
        <Logo />
        {minimal ? (
          <Link href="/trainers" className="text-link">
            Exit ↗
          </Link>
        ) : (
          <>
            <nav className="desktop-nav" aria-label="Main navigation">
              {config.mainNav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={pathname === item.href ? "page" : undefined}
                >
                  {item.title}
                </Link>
              ))}
            </nav>
            <div className="nav-actions">
              {state.role !== "visitor" && (
                <Link
                  href={`${dashboard}/notifications`}
                  className="nav-notification-btn"
                  aria-label="Notifications"
                  title="Notifications"
                >
                  <Bell size={17} />
                  {state.unread > 0 && (
                    <span className="nav-notification-badge">{state.unread}</span>
                  )}
                </Link>
              )}

              {config.showLogIn && (
                <Link href="/login" className="login-link">
                  Log in
                </Link>
              )}

              {state.role !== "visitor" && (
                <div className="account-menu" ref={accountMenuRef}>
                  <button
                    type="button"
                    className="account-trigger"
                    aria-expanded={accountOpen}
                    aria-haspopup="menu"
                    aria-controls="account-menu-items"
                    onClick={() => setAccountOpen((value) => !value)}
                  >
                    <UserIcon size={14} className="account-trigger-icon" />
                    <span>Account</span>
                    <ChevronDown
                      size={14}
                      className={`dropdown-chevron ${accountOpen ? "open" : ""}`}
                    />
                  </button>

                  {accountOpen && (
                    <div id="account-menu-items" role="menu" className="account-dropdown-panel">
                      <div className="account-profile-header">
                        <div className="account-profile-name">
                          {state.name || "User Account"}
                        </div>
                        {state.email && (
                          <div className="account-profile-email">{state.email}</div>
                        )}
                        <div className="account-profile-badge-wrapper">
                          <span className="account-role-badge">
                            {roleLabel(state.role)}
                          </span>
                        </div>
                      </div>

                      <div className="account-menu-divider" />

                      <div className="account-menu-items-list">
                        <Link
                          href={dashboard}
                          onClick={() => setAccountOpen(false)}
                          role="menuitem"
                          className="account-menu-link"
                        >
                          <LayoutDashboard size={15} className="menu-icon" />
                          <span>Dashboard</span>
                        </Link>

                        <Link
                          href={`${dashboard}/notifications`}
                          onClick={() => setAccountOpen(false)}
                          role="menuitem"
                          className="account-menu-link"
                        >
                          <Bell size={15} className="menu-icon" />
                          <span>Notifications</span>
                          {state.unread > 0 && (
                            <span className="menu-item-badge">{state.unread}</span>
                          )}
                        </Link>

                        {state.role !== "admin" && (
                          <Link
                            href={`${dashboard}/messages`}
                            onClick={() => setAccountOpen(false)}
                            role="menuitem"
                            className="account-menu-link"
                          >
                            <MessageSquare size={15} className="menu-icon" />
                            <span>Messages</span>
                            {state.unreadMessages > 0 && (
                              <span className="menu-item-badge">
                                {state.unreadMessages}
                              </span>
                            )}
                          </Link>
                        )}

                        <Link
                          href={`${dashboard}/settings`}
                          onClick={() => setAccountOpen(false)}
                          role="menuitem"
                          className="account-menu-link"
                        >
                          <Settings size={15} className="menu-icon" />
                          <span>Settings</span>
                        </Link>
                      </div>

                      <div className="account-menu-divider" />

                      <button
                        type="button"
                        className="account-logout-btn"
                        onClick={handleLogout}
                        role="menuitem"
                      >
                        <LogOut size={15} className="menu-icon" />
                        <span>Log out</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {config.showGetMatched && (
                <Link href="/match" className="btn lime small desktop-only-cta">
                  Get Matched <ArrowRight size={16} />
                </Link>
              )}
            </div>

            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger
                className="mobile-menu icon-button"
                aria-label="Open navigation"
              >
                <Menu size={20} />
              </SheetTrigger>
              <SheetContent className="spotter-mobile-menu" showCloseButton={false}>
                <div className="mobile-menu-head">
                  <Logo />
                  <SheetTitle className="sr-only">Explore Spotter</SheetTitle>
                  <SheetClose
                    className="mobile-menu-close-btn"
                    aria-label="Close navigation"
                  >
                    <X size={20} />
                  </SheetClose>
                </div>

                <div className="mobile-menu-body">
                  <nav className="mobile-links" aria-label="Mobile navigation">
                    <div className="mobile-nav-group">
                      {config.mainNav.map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          className="mobile-main-link"
                          onClick={() => setOpen(false)}
                        >
                          <span>{item.title}</span>
                          <ArrowRight size={16} className="mobile-arrow" />
                        </Link>
                      ))}
                    </div>

                    {state.role === "visitor" ? (
                      <div className="mobile-visitor-actions">
                        <Link
                          href="/login"
                          className="mobile-account-link"
                          onClick={() => setOpen(false)}
                        >
                          <UserIcon size={18} className="mobile-link-icon" />
                          <span>Log in</span>
                          <ArrowRight size={16} className="mobile-arrow" />
                        </Link>
                      </div>
                    ) : (
                      <div className="mobile-user-section">
                        <div className="mobile-user-card">
                          <div className="mobile-avatar">
                            <UserIcon size={16} />
                          </div>
                          <div className="mobile-user-info">
                            <div className="mobile-user-name">
                              {state.name || "User Account"}
                            </div>
                            {state.email && (
                              <div className="mobile-user-email">{state.email}</div>
                            )}
                          </div>
                          <span className="account-role-badge">
                            {roleLabel(state.role)}
                          </span>
                        </div>

                        <div className="mobile-account-links">
                          <Link
                            href={dashboard}
                            className="mobile-account-link"
                            onClick={() => setOpen(false)}
                          >
                            <LayoutDashboard size={18} className="mobile-link-icon" />
                            <span>Dashboard</span>
                            <ArrowRight size={16} className="mobile-arrow" />
                          </Link>

                          <Link
                            href={`${dashboard}/notifications`}
                            className="mobile-account-link"
                            onClick={() => setOpen(false)}
                          >
                            <div className="mobile-link-left">
                              <Bell size={18} className="mobile-link-icon" />
                              <span>Notifications</span>
                            </div>
                            <div className="mobile-link-right">
                              {state.unread > 0 && (
                                <span className="menu-item-badge">{state.unread}</span>
                              )}
                              <ArrowRight size={16} className="mobile-arrow" />
                            </div>
                          </Link>

                          {state.role !== "admin" && (
                            <Link
                              href={`${dashboard}/messages`}
                              className="mobile-account-link"
                              onClick={() => setOpen(false)}
                            >
                              <div className="mobile-link-left">
                                <MessageSquare size={18} className="mobile-link-icon" />
                                <span>Messages</span>
                              </div>
                              <div className="mobile-link-right">
                                {state.unreadMessages > 0 && (
                                  <span className="menu-item-badge">
                                    {state.unreadMessages}
                                  </span>
                                )}
                                <ArrowRight size={16} className="mobile-arrow" />
                              </div>
                            </Link>
                          )}

                          <Link
                            href={`${dashboard}/settings`}
                            className="mobile-account-link"
                            onClick={() => setOpen(false)}
                          >
                            <Settings size={18} className="mobile-link-icon" />
                            <span>Settings</span>
                            <ArrowRight size={16} className="mobile-arrow" />
                          </Link>

                          <button
                            type="button"
                            className="mobile-logout-btn"
                            onClick={handleLogout}
                          >
                            <LogOut size={16} />
                            <span>Log out</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {config.showGetMatched && (
                      <Link
                        href="/match"
                        className="btn lime mobile-match-cta"
                        onClick={() => setOpen(false)}
                      >
                        <span>Get Matched</span>
                        <ArrowRight size={16} />
                      </Link>
                    )}
                  </nav>

                  <p className="mobile-menu-note">
                    Identity reviewed · Transparent pricing · Live coaching
                  </p>
                </div>
              </SheetContent>
            </Sheet>
          </>
        )}
      </div>
    </header>
  );
}


