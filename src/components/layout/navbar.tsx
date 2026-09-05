"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowUpRight, ArrowRight, Menu, MapPin } from "lucide-react";
import { siteConfig } from "@/config/site";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useStore } from "@/components/marketplace/store";
export function Logo() {
  return (
    <Link href="/" className="brand" aria-label="Elevate home">
      <span className="brand-mark">
        <ArrowUpRight strokeWidth={3} />
      </span>
      elevate<span className="brand-period">.</span>
    </Link>
  );
}
export function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { state } = useStore();
  useEffect(() => {
    const scroll = () => setScrolled(window.scrollY > 24);
    scroll();
    window.addEventListener("scroll", scroll, { passive: true });
    return () => window.removeEventListener("scroll", scroll);
  }, []);
  const minimal = ["/match", "/checkout", "/login", "/signup"].includes(
    pathname,
  );
  return (
    <motion.header
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className={`site-nav ${scrolled ? "scrolled" : ""}`}
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
              <span className="nav-city">
                <MapPin size={14} /> Karachi
              </span>
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
                {state.role === "visitor" ? "Log in" : "Dashboard"}
              </Link>
              <Link href="/match" className="btn small">
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
                <SheetTitle>Explore Elevate</SheetTitle>
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
                  <Link href="/login" onClick={() => setOpen(false)}>
                    Log in
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
    </motion.header>
  );
}
