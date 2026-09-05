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
import { HowItWorks } from "@/components/marketplace/how-it-works";
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
    title: "Fitness is personal.\nFinding a trainer should be, too.",
    intro:
      "Elevate brings personal trainers and people in Karachi together, around the things that actually matter: goals, comfort, location, and time.",
    sections: [
      [
        "A better place to start.",
        "Finding a coach shouldn’t mean scrolling endlessly or guessing what a session costs. Elevate puts approach, availability, and prices in one place.",
      ],
      [
        "Built for the way you live.",
        "At home, in a gym, outdoors, or online. A good training routine begins with a coach who fits your everyday life.",
      ],
      [
        "An honest preview.",
        "This is a working frontend prototype. Trainers, ratings, verification, and client stories are sample content. Bookings and account actions are simulated on your device.",
      ],
    ],
  },
  safety: {
    eyebrow: "TRUST IS IN THE DETAILS",
    title: "A clearer picture.\nA more confident start.",
    intro:
      "Know who you’re training with, what you’re booking, and where to find the details that matter.",
    sections: [
      [
        "Identity and credentials are separate.",
        "Profile badges distinguish identity verification from credential checks. Sample verification badges demonstrate how the live experience would communicate reviewed information.",
      ],
      [
        "Reviews tied to sessions.",
        "A verified booking review means the reviewer completed a session through the platform. Reviews displayed in this demo are illustrative.",
      ],
      [
        "Make your first session comfortable.",
        "Agree on your meeting place, share your preferences with your trainer, and choose an environment where you feel comfortable. Tell your trainer if an exercise doesn’t feel right.",
      ],
      [
        "A prototype, with clear limits.",
        "This demo doesn’t perform background checks, process payments, or provide live support. Nothing here is a guarantee of safety or fitness results.",
      ],
    ],
  },
  cancellation: {
    eyebrow: "CLEAR BEFORE YOU COMMIT",
    title: "Plans change.\nHere’s what happens next.",
    intro:
      "The sample cancellation policy is shown before every booking, so there are no surprises.",
    sections: [
      [
        "12 hours or more before your session.",
        "Cancel without a fee from Dashboard → Bookings. The session status changes to Cancelled, and that time becomes available again.",
      ],
      [
        "Less than 12 hours before your session.",
        "The sample policy treats the session price as non-refundable. You’ll see this reminder before cancelling.",
      ],
      [
        "If your trainer can’t make it.",
        "In a live service, support would coordinate a replacement time or applicable refund. This demo does not move money or send real notifications.",
      ],
      [
        "No real charges.",
        "Every checkout is simulated. Cancellation and booking amounts are recorded only in this browser.",
      ],
    ],
  },
  privacy: {
    eyebrow: "YOUR INFORMATION",
    title: "Simple, transparent\ndemo privacy.",
    intro:
      "This prototype stores your activity in your browser so you can try the complete experience.",
    sections: [
      [
        "What stays on this device.",
        "Saved trainers, comparisons, demo bookings, messages, application details, and progress entries are stored in browser local storage. Use sample details rather than sensitive personal information.",
      ],
      [
        "What is not collected.",
        "There is no real payment processing or account authentication. Passwords and payment card details are not stored by this demo.",
      ],
      [
        "Clearing your data.",
        "You can clear this site’s browser storage to remove your demo activity. This also removes saved bookings and messages.",
      ],
      [
        "Images and hosting.",
        "The site loads sample photography from Unsplash and assets through its hosting provider. Those services may receive normal technical request information.",
      ],
    ],
  },
  terms: {
    eyebrow: "A SHARED UNDERSTANDING",
    title: "A place to explore.\nA prototype to try.",
    intro:
      "Elevate is a frontend demonstration of a personal training marketplace, not a live booking service.",
    sections: [
      [
        "Sample marketplace content.",
        "Profiles, trainer identities, reviews, verification statuses, statistics, and stories are fictional or illustrative. Photographs are representative.",
      ],
      [
        "Demo bookings and accounts.",
        "Submitting a booking does not reserve a real trainer or create a payment obligation. Login only switches the local demo role and is not secure authentication.",
      ],
      [
        "Fitness is individual.",
        "Training approaches and progress vary from person to person. Nothing shown promises a particular physical outcome.",
      ],
      [
        "Availability and support.",
        "Schedules are sample data. Messages and support requests are not delivered to real recipients.",
      ],
    ],
  },
  careers: {
    eyebrow: "BUILD SOMETHING THAT MOVES PEOPLE",
    title: "Good people.\nA shared direction.",
    intro:
      "We’re exploring a better way for Karachi to find personal training.",
    sections: [
      [
        "No open positions right now.",
        "There are no active job listings in this demo. If you’re a coach, you can explore the trainer application and business workspace.",
      ],
    ],
  },
  help: {
    eyebrow: "LET’S CLEAR THINGS UP",
    title: "A little help.\nA smoother start.",
    intro:
      "Find answers about booking, choosing a trainer, and using your demo workspace.",
    sections: [],
  },
  contact: {
    eyebrow: "WE’RE GLAD YOU’RE HERE",
    title: "Let’s talk\nabout your next step.",
    intro:
      "Explore the support request experience below. This demo does not connect to a live inbox.",
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
        <HowItWorks />
        <FAQ />
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
              Do the coaching.
              <br />
              We’ll help with the rest.
            </h1>
            <p className="section-copy">
              Find clients who fit your approach, manage your sessions, and
              build a reputation that speaks for itself.
            </p>
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
                src="https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?auto=format&fit=crop&w=900&q=80"
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
