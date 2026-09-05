"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "./navbar";
export function Footer() {
  const path = usePathname();
  if (
    ["/match", "/checkout", "/login", "/signup"].includes(path) ||
    path.startsWith("/dashboard") ||
    path.startsWith("/admin")
  )
    return null;
  return (
    <footer className="spotter-footer">
      <div className="container">
        <div className="footer-line">
          <Logo />
          <nav aria-label="Footer navigation">
            {[
              ["Find a Trainer", "/trainers"],
              ["For Trainers", "/become-a-trainer"],
              ["About", "/about"],
              ["Contact", "/contact"],
              ["Privacy", "/privacy"],
              ["Terms", "/terms"],
            ].map(([label, href]) => (
              <Link key={href} href={href}>
                {label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} SPOTTER.</span>
          <span>Made for your next chapter.</span>
          <span>Demo marketplace · Sample profiles & reviews</span>
        </div>
      </div>
    </footer>
  );
}
