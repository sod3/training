"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, ArrowRight, Menu, MapPin } from "lucide-react";
import { siteConfig } from "@/config/site";
import {
  Sheet,
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
export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const [scrolled, setScrolled] = useState(false);
  const { state, notify } = useStore();
  const dashboard =
    state.role === "admin"
      ? "/admin"
      : state.role === "trainer"
        ? "/trainer"
        : "/dashboard/customer";
  useEffect(() => {
    const scroll = () => setScrolled(window.scrollY > 24);
    scroll();
    window.addEventListener("scroll", scroll, { passive: true });
    return () => window.removeEventListener("scroll", scroll);
  }, []);
  useEffect(() => {
    if (!accountOpen) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!accountMenuRef.current?.contains(event.target as Node))
        setAccountOpen(false);
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
              {siteConfig.mainNav.map((item) => (
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
              <Link
                href="/locations"
                className="nav-location"
                aria-label="Explore trainers by location"
              >
                <MapPin size={14} /> Karachi
              </Link>
              <Link
                href={
                  state.role === "visitor"
                    ? "/login"
                    : state.role === "admin"
                      ? "/admin"
                      : `/dashboard/${state.role}`
                }
                className="login-link"
              >
                {state.role === "visitor"
                  ? "Log in"
                  : state.name.split(" ")[0] || "Dashboard"}
              </Link>
              {state.role !== "visitor" && (
                <div className="account-menu" ref={accountMenuRef}>
                  <button
                    type="button"
                    className="account-trigger"
                    aria-expanded={accountOpen}
                    aria-controls="account-menu-items"
                    onClick={() => setAccountOpen((value) => !value)}
                  >
                    Account <span aria-hidden="true">⌄</span>
                  </button>
                  {accountOpen && (
                    <div id="account-menu-items">
                      <Link href={dashboard}>Dashboard</Link>
                      <Link href={`${dashboard}/notifications`}>
                        Notifications {state.unread || ""}
                      </Link>
                      {state.role !== "admin" && (
                        <Link href={`${dashboard}/messages`}>
                          Messages {state.unreadMessages || ""}
                        </Link>
                      )}
                      <button
                        onClick={async () => {
                          setAccountOpen(false);
                          try {
                            await api("auth/logout", {});
                            router.push("/");
                          } catch (e) {
                            notify((e as Error).message);
                          }
                        }}
                      >
                        Log out
                      </button>
                    </div>
                  )}
                </div>
              )}
              <Link href="/match" className="btn lime small">
                Find my trainer <ArrowRight size={16} />
              </Link>
            </div>
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger
                className="mobile-menu icon-button"
                aria-label="Open navigation"
              >
                <Menu />
              </SheetTrigger>
              <SheetContent className="p-7">
                <SheetTitle>Explore Spotter</SheetTitle>
                <nav className="mobile-links">
                  {siteConfig.mainNav.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setOpen(false)}
                    >
                      {item.title}
                      <ArrowUpRight size={20} />
                    </Link>
                  ))}
                  <Link
                    href={state.role === "visitor" ? "/login" : dashboard}
                    onClick={() => setOpen(false)}
                  >
                    {state.role === "visitor" ? "Log in" : "Dashboard"}
                  </Link>
                  <Link
                    href="/match"
                    className="btn"
                    onClick={() => setOpen(false)}
                  >
                    Find my trainer <ArrowRight size={18} />
                  </Link>
                </nav>
                <p className="muted mt-8">
                  Good training starts with the right person.
                </p>
              </SheetContent>
            </Sheet>
          </>
        )}
      </div>
    </header>
  );
}
