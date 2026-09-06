import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import {
  ShieldCheck,
  BadgeCheck,
  CalendarDays,
  MapPin,
  ArrowUpRight,
} from "lucide-react";
import { Reveal } from "@/components/motion/reveal";
import { FAQ } from "@/components/marketplace/faq";
import {
  TrainerApplication,
  ContactForm,
} from "@/components/marketplace/forms";
import { locations } from "@/lib/marketplace";
export const dynamicParams = false;
export function generateStaticParams() {
  return [
    "about",
    "safety",
    "cancellation",
    "privacy",
    "terms",
    "careers",
    "help",
    "contact",
    "how-it-works",
    "locations",
    "become-a-trainer",
  ].map((info) => ({ info }));
}
const copy: Record<
  string,
  {
    eyebrow: string;
    title: string;
    intro: string;
    sections: [string, string][];
  }
> = {
  about: {
    eyebrow: "GOOD TRAINING STARTS WITH GOOD PEOPLE",
    title: "Better trainers.\nBetter matches.\nBetter training.",
    intro:
      "Spotter brings personal trainers and people together around goals, comfort, location, and time.",
    sections: [
      [
        "A better place to start.",
        "Compare coaching approaches, available times, and transparent package prices in one place.",
      ],
      [
        "Built for the way you live.",
        "Train at home, in a gym, outdoors, or online with a coach who fits your life.",
      ],
    ],
  },
  safety: {
    eyebrow: "TRUST IS IN THE DETAILS",
    title: "A clearer picture.\nA more confident start.",
    intro: "Understand what has been reviewed before you book.",
    sections: [
      [
        "Identity and credentials.",
        "Trainers submit identity documents and professional credentials for review. Each badge reflects its own approved check; expired credentials are not presented as verified.",
      ],
      [
        "Reviews tied to sessions.",
        "Only customers who completed a session through Spotter can review their trainer.",
      ],
      [
        "Your comfort matters.",
        "Agree on a meeting place and discuss your preferences with your trainer. Document review does not guarantee safety or fitness outcomes. Contact support about concerns.",
      ],
    ],
  },
  cancellation: {
    eyebrow: "CLEAR BEFORE YOU COMMIT",
    title: "Plans change.\nHere’s what happens next.",
    intro:
      "Your booking preserves the cancellation terms in effect when you purchased it.",
    sections: [
      [
        "Before the cancellation deadline.",
        "Cancel or reschedule from your dashboard before the booking’s cancellation window closes. The standard window is 12 hours; check your specific booking for its saved terms.",
      ],
      [
        "Late cancellations.",
        "Late cancellations forfeit the affected session’s proportional package price. Unused eligible sessions remain refundable when you cancel a package.",
      ],
      [
        "Refund review.",
        "Eligible refunds are reviewed by support and returned through the payment provider. A refund request is not a completed refund. Your dashboard shows its status.",
      ],
      [
        "Trainer cancellations.",
        "When a trainer cancels, unused sessions are eligible for refund review. Contact support if you need help arranging another trainer.",
      ],
    ],
  },
  privacy: {
    eyebrow: "YOUR INFORMATION",
    title: "Your data.\nHandled with care.",
    intro:
      "Spotter uses information needed to manage accounts, training bookings, payments, and support.",
    sections: [
      [
        "Information we store.",
        "We store account and profile details, bookings, favorites, reviews, messages, and support requests. Trainer verification documents are held in private file storage.",
      ],
      [
        "Account and payment security.",
        "Passwords are stored as hashes. Spotter records the payment method, payer name, transaction reference, screenshot, and review status needed to verify manual transfers.",
      ],
      [
        "Access and retention.",
        "Customers and trainers can access their own records. Authorized administrators review applications and handle support. Request account deletion in your security settings; booking and financial records may be retained where required.",
      ],
      [
        "Service providers and device storage.",
        "Hosting, database, payment, and file-storage providers process information needed for these services. Secure cookies keep you signed in. Session storage remembers only your selected comparison identifiers.",
      ],
    ],
  },
  terms: {
    eyebrow: "A SHARED UNDERSTANDING",
    title: "Clear expectations.\nA better experience.",
    intro: "These terms describe how to use Spotter’s training marketplace.",
    sections: [
      [
        "Your account.",
        "Provide accurate details, protect your password, and use only your own account. Trainers must submit accurate experience and credentials.",
      ],
      [
        "Bookings and payment.",
        "Package details, price, and cancellation terms are saved with your purchase. A temporary reservation expires unless payment is confirmed. Multi-session packages are scheduled as individual appointments.",
      ],
      [
        "Fitness is individual.",
        "Training approaches and progress vary. Discuss your needs and limitations with your trainer. Spotter does not promise a particular fitness outcome.",
      ],
      [
        "Respectful communication.",
        "Messages and reviews must be truthful and respectful. Misuse may lead to moderation or account restrictions. Contact support to raise a concern about an account, session, or payment.",
      ],
    ],
  },
  careers: {
    eyebrow: "BUILD SOMETHING THAT MOVES PEOPLE",
    title: "Good people.\nA shared direction.",
    intro: "Help more people find training that fits.",
    sections: [
      [
        "For coaches.",
        "Apply to offer personal training through Spotter. Complete your professional profile and submit your credentials for review.",
      ],
    ],
  },
  help: {
    eyebrow: "LET’S CLEAR THINGS UP",
    title: "A little help.\nA smoother start.",
    intro:
      "Find answers about booking, choosing a trainer, and managing your account.",
    sections: [],
  },
  contact: {
    eyebrow: "WE’RE GLAD YOU’RE HERE",
    title: "Let’s talk\nabout your next step.",
    intro:
      "Send a question or tell us about an issue. Our support team can review your request.",
    sections: [],
  },
};
export default async function Page({
  params,
}: {
  params: Promise<{ info: string }>;
}) {
  const { info } = await params;
  if (info === "how-it-works")
    return (
      <>
        <div className="container page-heading section">
          <p className="eyebrow">A CLEAR PATH TO YOUR FIRST SESSION</p>
          <h1>
            Less searching.
            <br />
            More showing up.
          </h1>
          <p>
            From a few preferences to a coach you connect with. Here’s how it
            works.
          </p>
        </div>
        <div className="container journey-grid">
          <div className="journey-image">
            <Image
              src="/images/coaching.webp"
              alt="A male trainer coaching a male client"
              fill
              sizes="(max-width:768px) 100vw, 45vw"
            />
          </div>
          <div>
            {[
              [
                "Tell us where you’re going.",
                "Choose your goal, location, setting and usual training time.",
              ],
              [
                "Meet your matches.",
                "See which trainers fit your preferences.",
              ],
              [
                "Choose your trainer.",
                "Get to know their approach, credentials and pricing.",
              ],
              [
                "Book your first session.",
                "Pick your date, time and session. Review before confirming.",
              ],
              [
                "Start training.",
                "One session. A clear plan. A stronger routine.",
              ],
            ].map(([title, copy], i) => (
              <Reveal key={title}>
                <article className="journey-step">
                  <span>0{i + 1}</span>
                  <div>
                    <h2>{title}</h2>
                    <p>{copy}</p>
                  </div>
                </article>
              </Reveal>
            ))}
            <Link className="btn" href="/match">
              Find my trainer →
            </Link>
          </div>
        </div>
      </>
    );
  if (info === "locations")
    return (
      <div className="container section">
        <div className="page-heading">
          <p className="eyebrow">YOUR CITY. YOUR COACH.</p>
          <h1>Good training, closer to home.</h1>
          <p>Explore personal trainers across Karachi.</p>
        </div>
        <div className="location-page-grid">
          {locations.map((l, i) => (
            <Link
              href={`/trainers?location=${encodeURIComponent(l)}`}
              className="panel"
              key={l}
            >
              <MapPin size={28} />
              <span className="eyebrow mt-8">KARACHI / 0{i + 1}</span>
              <h2>{l}</h2>
              <span className="text-link mt-5">
                Find trainers <ArrowUpRight size={18} />
              </span>
            </Link>
          ))}
        </div>
      </div>
    );
  if (info === "become-a-trainer")
    return (
      <div className="container section">
        <div className="onboarding-grid">
          <div>
            <p className="eyebrow">YOUR EXPERTISE DESERVES A PLATFORM</p>
            <h1>
              Do great work.
              <br />
              We’ll help people find it.
            </h1>
            <p className="section-copy">
              Find clients who fit your approach, manage your sessions, and
              build a reputation that speaks for itself.
            </p>
            <a className="btn lime mt-6" href="#apply">
              Apply to join →
            </a>
            <div className="onboarding-benefits">
              {[
                [ShieldCheck, "Let your credentials speak."],
                [CalendarDays, "A calendar you can manage."],
                [BadgeCheck, "Build trust with every session."],
              ].map(([I, t]) => {
                const Icon = I as typeof ShieldCheck;
                return (
                  <p key={t as string}>
                    <Icon size={24} />
                    {t as string}
                  </p>
                );
              })}
            </div>
            <div className="onboarding-photo">
              <Image
                src="/images/coaching.webp"
                alt="A coach guiding a client"
                fill
                sizes="50vw"
              />
            </div>
          </div>
          <TrainerApplication />
        </div>
      </div>
    );
  const data = copy[info];
  if (!data) notFound();
  return (
    <>
      <div className="container section info-page">
        <div className="page-heading">
          <p className="eyebrow">{data.eyebrow}</p>
          <h1 style={{ whiteSpace: "pre-line" }}>{data.title}</h1>
          <p>{data.intro}</p>
        </div>
        {data.sections.length > 0 && (
          <div className="info-sections">
            {data.sections.map(([title, body], i) => (
              <section className="panel" key={title}>
                <span className="eyebrow">0{i + 1}</span>
                <h2>{title}</h2>
                <p>{body}</p>
              </section>
            ))}
          </div>
        )}
        {info === "contact" && <ContactForm />}
        {info !== "contact" && (
          <div className="flex flex-wrap gap-4 mt-10">
            <Link href="/trainers" className="btn">
              Find a trainer →
            </Link>
            <Link
              href={info === "help" ? "/contact" : "/how-it-works"}
              className="btn outline"
            >
              {info === "help" ? "Contact & support" : "How it works"} ↗
            </Link>
          </div>
        )}
      </div>
      {info === "help" && <FAQ />}
    </>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ info: string }>;
}) {
  const { info } = await params;
  return {
    title: info
      .split("-")
      .map((s) => s[0].toUpperCase() + s.slice(1))
      .join(" "),
    alternates: { canonical: "/" + info },
  };
}
