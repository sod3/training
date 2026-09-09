"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, Mail } from "lucide-react";
import { Logo } from "./navbar";
import { Reveal } from "@/components/motion/reveal";

function InstagramIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

function TwitterIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" />
    </svg>
  );
}

function LinkedinIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect width="4" height="12" x="2" y="9" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  );
}

export function Footer() {
  const path = usePathname();
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  if (
    ["/match", "/checkout", "/login", "/signup"].includes(path) ||
    path.startsWith("/dashboard") ||
    path.startsWith("/admin")
  ) {
    return null;
  }

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim() && email.includes("@")) {
      setSubscribed(true);
      setEmail("");
    }
  };

  return (
    <footer className="spotter-footer" id="site-footer">
      <div className="container">
        <Reveal start="top 90%">
          <div className="footer-main-grid">
            <div className="footer-brand-col">
              <Logo />
              <p className="footer-brand-desc">
                The online marketplace connecting you with verified personal trainers
                tailored around your goals, schedule, and coaching style.
              </p>
              <div className="footer-status-pill">
                <span className="footer-status-dot" aria-hidden="true" />
                <span>All Systems Operational</span>
              </div>

              <div className="footer-newsletter">
                <span className="footer-newsletter-title">
                  Get Trainer Spotlights &amp; Insights
                </span>
                {subscribed ? (
                  <p className="footer-newsletter-feedback">
                    ✓ Thank you! You&apos;re subscribed to Spotter updates.
                  </p>
                ) : (
                  <form onSubmit={handleSubscribe} className="footer-newsletter-form">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email"
                      className="footer-newsletter-input"
                      required
                      aria-label="Email address for newsletter"
                    />
                    <button type="submit" className="btn lime footer-newsletter-btn">
                      Subscribe <ArrowRight size={14} />
                    </button>
                  </form>
                )}
              </div>
            </div>

            <div className="footer-nav-columns">
              <div>
                <h3 className="footer-col-title">Marketplace</h3>
                <ul className="footer-col-list">
                  <li>
                    <Link href="/trainers">Browse Trainers</Link>
                  </li>
                  <li>
                    <Link href="/match">Get Matched</Link>
                  </li>
                  <li>
                    <Link href="/how-it-works">How It Works</Link>
                  </li>
                  <li>
                    <Link href="/compare">Compare Packages</Link>
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="footer-col-title">For Trainers</h3>
                <ul className="footer-col-list">
                  <li>
                    <Link href="/become-a-trainer">Become a Trainer</Link>
                  </li>
                  <li>
                    <Link href="/login">Trainer Login</Link>
                  </li>
                  <li>
                    <Link href="/signup">Join Platform</Link>
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="footer-col-title">Company &amp; Legal</h3>
                <ul className="footer-col-list">
                  <li>
                    <Link href="/about">About Spotter</Link>
                  </li>
                  <li>
                    <Link href="/contact">Contact Support</Link>
                  </li>
                  <li>
                    <Link href="/privacy">Privacy Policy</Link>
                  </li>
                  <li>
                    <Link href="/terms">Terms of Service</Link>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div className="footer-bottom-row">
            <div className="footer-bottom-meta">
              <span>© {new Date().getFullYear()} SPOTTER Inc. All rights reserved.</span>
              <span>Made for your next chapter.</span>
            </div>

            <div className="footer-social-links">
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noreferrer"
                className="footer-social-icon"
                aria-label="Spotter on Instagram"
              >
                <InstagramIcon size={16} />
              </a>
              <a
                href="https://x.com"
                target="_blank"
                rel="noreferrer"
                className="footer-social-icon"
                aria-label="Spotter on X (Twitter)"
              >
                <TwitterIcon size={16} />
              </a>
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noreferrer"
                className="footer-social-icon"
                aria-label="Spotter on LinkedIn"
              >
                <LinkedinIcon size={16} />
              </a>
              <a
                href="mailto:support@spotter.fit"
                className="footer-social-icon"
                aria-label="Email Spotter Support"
              >
                <Mail size={16} />
              </a>
            </div>
          </div>
        </Reveal>
      </div>
    </footer>
  );
}
