import Link from "next/link";
import { ArrowUpRight, BadgeCheck, FileCheck2, MessagesSquare } from "lucide-react";
import { Reveal } from "@/components/motion/reveal";

const trustItems = [
  {
    label: "Identity",
    title: "Know who you’re meeting.",
    copy: "Identity status is shown separately, so customers can understand what has been reviewed at a glance.",
    icon: BadgeCheck,
  },
  {
    label: "Qualifications",
    title: "Credentials, made visible.",
    copy: "Professional qualifications and credential-review status live directly on each trainer profile.",
    icon: FileCheck2,
  },
  {
    label: "Reviews",
    title: "Context, not just stars.",
    copy: "Reviews show the customer’s training goal and whether the feedback is linked to a completed booking in the product model.",
    icon: MessagesSquare,
  },
];

export function TrustSection() {
  return (
    <section className="home-trust-section" aria-labelledby="home-trust-title">
      <div className="container">
        <Reveal>
          <div className="home-trust-heading">
            <div>
              <p className="eyebrow">
                <span className="section-index">03 /</span> TRUST, WITHOUT THE NOISE
              </p>
              <h2 id="home-trust-title">
                Know who you’re
                <br />
                <span className="quiet-heading">training with.</span>
              </h2>
            </div>
            <Link href="/safety" className="text-link">
              How trust works <ArrowUpRight size={17} />
            </Link>
          </div>
        </Reveal>

        <div className="home-trust-grid">
          {trustItems.map(({ label, title, copy, icon: Icon }) => (
            <Reveal key={label}>
              <article className="home-trust-item">
                <div className="home-trust-icon" aria-hidden="true">
                  <Icon size={19} />
                </div>
                <p className="eyebrow">{label}</p>
                <h3>{title}</h3>
                <p>{copy}</p>
              </article>
            </Reveal>
          ))}
        </div>

        <p className="home-trust-disclaimer">
          This prototype uses illustrative verification and review data. The interface is structured so live verification services can replace sample status later.
        </p>
      </div>
    </section>
  );
}
