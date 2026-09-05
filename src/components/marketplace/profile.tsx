"use client";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import {
  BadgeCheck,
  Star,
  MapPin,
  Heart,
  Share2,
  ArrowUpRight,
  Check,
  Clock,
  MessageCircle,
} from "lucide-react";
import { Trainer } from "@/types/trainer";
import { trainers } from "@/data/trainers";
import { money, dateKey, slots } from "@/lib/marketplace";
import { useStore } from "./store";
import { TrainerCard } from "./trainer-card";
export function Profile({ trainer: t }: { trainer: Trainer }) {
  const { state, update, notify } = useStore();
  const [date, setDate] = useState(
    dateKey(t.nextAvailable.startsWith("Today") ? 0 : 1),
  );
  const [time, setTime] = useState("");
  const saved = state.saved.includes(t.id);
  const times = slots(t, date).filter(
    (s) =>
      !state.bookings.some(
        (b) =>
          b.trainerId === t.id &&
          b.date === date &&
          b.time === s &&
          b.status !== "Cancelled",
      ),
  );
  const book = `/booking?${new URLSearchParams({ trainer: t.slug, date, time })}`;
  return (
    <div className="container profile-page">
      <Link href="/trainers" className="text-link">
        ← All trainers
      </Link>
      <div className="profile-heading">
        <div>
          <p className="eyebrow">A GOOD CONNECTION STARTS HERE</p>
          <h1>
            {t.firstName} {t.lastName} <BadgeCheck />
          </h1>
          <p>{t.headline}</p>
        </div>
        <div className="profile-actions">
          <button
            className="btn outline small"
            aria-pressed={saved}
            onClick={() => {
              update({
                saved: saved
                  ? state.saved.filter((id) => id !== t.id)
                  : [...state.saved, t.id],
              });
              notify(saved ? "Removed from saved." : "Trainer saved.");
            }}
          >
            <Heart size={16} fill={saved ? "currentColor" : "none"} />
            {saved ? "Saved" : "Save"}
          </button>
          <button
            className="btn outline small"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(window.location.href);
                notify("Profile link copied.");
              } catch {
                notify("Copy this page’s address to share the profile.");
              }
            }}
          >
            <Share2 size={16} />
            Share
          </button>
        </div>
      </div>
      <div className="profile-gallery">
        <div>
          <Image
            src={t.profileImage}
            alt={`${t.firstName} ${t.lastName}`}
            fill
            priority
            sizes="(max-width:768px) 100vw, 45vw"
          />
        </div>
        <div>
          <Image
            src={
              t.coverImage ||
              "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1000&q=80"
            }
            alt="Example training environment"
            fill
            sizes="(max-width:768px) 50vw, 35vw"
          />
          <span>SPACE TO GET STRONGER</span>
        </div>
        <div className="gallery-note">
          <span className="eyebrow">THE APPROACH</span>
          <h2>
            Your goals.
            <br />A clear plan.
            <br />
            Real support.
          </h2>
          <p>{t.experienceYears} years of coaching experience</p>
          <BadgeCheck size={38} />
        </div>
      </div>
      <div className="profile-grid">
        <div>
          <div className="profile-facts">
            <span>
              <Star size={17} />
              <strong>{t.rating}</strong> · {t.reviewCount} reviews
            </span>
            <span>{t.sessionsCompleted} sessions completed</span>
            <span>
              <Clock size={16} />
              Replies {t.responseTime}
            </span>
          </div>
          <nav className="profile-anchors" aria-label="Profile sections">
            {["Overview", "Packages", "Availability", "Reviews"].map((n) => (
              <a href={`#${n.toLowerCase()}`} key={n}>
                {n}
              </a>
            ))}
          </nav>
          <section className="profile-section" id="overview">
            <p className="eyebrow">MEET YOUR COACH</p>
            <h2>A little about {t.firstName}.</h2>
            <p>{t.bio}</p>
            <div className="trust-pills">
              {t.verifiedIdentity && (
                <span>
                  <BadgeCheck size={16} />
                  Identity verified
                </span>
              )}
              {t.verifiedCredentials && (
                <span>
                  <BadgeCheck size={16} />
                  Credentials verified
                </span>
              )}
            </div>
            <h3>What we can work on</h3>
            <div className="choice-chips">
              {t.specialties.map((s) => (
                <span key={s}>{s}</span>
              ))}
            </div>
            <h3>How I train</h3>
            <p>
              We begin with a conversation about your goals and experience. Your
              sessions combine guided movement, technique feedback, and a plan
              you can build on at your own pace.
            </p>
            <h3>Certifications</h3>
            <ul className="credential-list">
              {t.certifications.map((c) => (
                <li key={c}>
                  <Check size={16} />
                  {c}
                </li>
              ))}
            </ul>
            {!t.verifiedCredentials && (
              <p className="fine-print">
                Credentials are trainer-provided and have not been verified.
              </p>
            )}
            <h3>Places we can train</h3>
            <p className="flex gap-2 items-center">
              <MapPin size={17} />
              {t.locations.join(" · ")}
            </p>
            <div className="choice-chips mt-4">
              {t.trainingTypes.map((type) => (
                <span key={type}>{type}</span>
              ))}
            </div>
          </section>
          <section className="profile-section" id="packages">
            <p className="eyebrow">START SMALL. BUILD FROM THERE.</p>
            <h2>Find your rhythm.</h2>
            <div className="package-grid">
              {t.packages.map((p) => (
                <article
                  className={`package-card ${p.isPopular ? "popular" : ""}`}
                  key={p.id}
                >
                  {p.isPopular && (
                    <span className="package-badge">MOST POPULAR</span>
                  )}
                  <h3>{p.title}</h3>
                  <strong>{money(p.price)}</strong>
                  <small>
                    {p.sessions} {p.sessions === 1 ? "session" : "sessions"} ·{" "}
                    {p.duration} minutes each
                  </small>
                  <p>{p.description}</p>
                  <Link
                    href={`/booking?trainer=${t.slug}&package=${p.id}`}
                    className={`btn ${p.isPopular ? "" : "outline"}`}
                  >
                    {p.sessions === 1 ? "Book a trial" : "Choose package"}
                    <ArrowUpRight size={16} />
                  </Link>
                </article>
              ))}
            </div>
          </section>
          <section className="profile-section" id="availability">
            <p className="eyebrow">MAKE ROOM FOR YOU</p>
            <h2>A time that fits.</h2>
            <p>
              Choose a date and see this coach’s sample availability. All times
              are Karachi time (PKT).
            </p>
            <Link href={book} className="btn outline mt-5">
              Explore available sessions <ArrowUpRight size={17} />
            </Link>
          </section>
          <section className="profile-section" id="reviews">
            <p className="eyebrow">FROM THE PEOPLE WHO SHOWED UP</p>
            <h2>Training, in their words.</h2>
            {t.reviews.length ? (
              t.reviews.map((r) => (
                <article className="profile-review" key={r.id}>
                  <div>
                    <strong>{r.clientName}</strong>
                    <span className="stars">{"★".repeat(r.rating)}</span>
                  </div>
                  <p>{r.comment}</p>
                  <small>
                    {r.goal} · {r.date} ·{" "}
                    {r.verified ? "Sample verified booking" : "Sample review"}
                  </small>
                </article>
              ))
            ) : (
              <div className="empty-state compact">
                <Star size={28} />
                <h3>Room for your experience.</h3>
                <p>
                  Detailed sample reviews haven’t been added for this coach.
                  Reviews appear after completed sessions.
                </p>
                <Link href={book} className="text-link">
                  Start with one session →
                </Link>
              </div>
            )}
          </section>
          <section className="profile-section">
            <h3>Before your first session</h3>
            <p>
              Wear comfortable clothes, bring water, and tell your trainer about
              your experience and anything they should consider when planning
              your session.
            </p>
            <Link href="/cancellation" className="text-link mt-5">
              Read the cancellation policy →
            </Link>
          </section>
        </div>
        <aside className="booking-sidebar">
          <p className="eyebrow">ONE SESSION IS A GREAT START</p>
          <p className="booking-price">
            {money(t.packages[0].price)}{" "}
            <span>/ {t.packages[0].sessions === 1 ? "trial" : "package"}</span>
          </p>
          <p className="muted text-sm">
            {t.packages[0].duration} minutes · A plan built around you
          </p>
          <label className="field mt-6">
            Choose a date
            <input
              type="date"
              value={date}
              min={dateKey()}
              max={dateKey(30)}
              onChange={(e) => {
                setDate(e.target.value);
                setTime("");
              }}
            />
          </label>
          <fieldset className="filter-group">
            <legend>Available times · PKT</legend>
            <div className="choice-chips">
              {times.map((s) => (
                <button
                  key={s}
                  aria-pressed={time === s}
                  className={time === s ? "selected" : ""}
                  onClick={() => setTime(s)}
                >
                  {s}
                </button>
              ))}
            </div>
            {!times.length && (
              <p className="fine-print">
                No slots for this date. Try tomorrow.
              </p>
            )}
          </fieldset>
          <Link href={book} className="btn w-full">
            Book trial <ArrowRightIcon />
          </Link>
          <Link
            href={`/dashboard/customer/messages?trainer=${t.id}`}
            className="btn outline w-full mt-3"
          >
            <MessageCircle size={16} />
            Message {t.firstName}
          </Link>
          <p className="fine-print text-center">
            Try one session before committing to a package.
          </p>
          <Link href="/cancellation" className="cancellation-note">
            <BadgeCheck size={16} />
            Free cancellation 12+ hours before.
          </Link>
        </aside>
      </div>
      <section className="section">
        <div className="section-heading">
          <h2>More good people.</h2>
          <Link href="/trainers" className="text-link">
            Explore all trainers ↗
          </Link>
        </div>
        <div className="trainer-grid swipe-row">
          {trainers
            .filter((tr) => tr.id !== t.id)
            .slice(0, 4)
            .map((tr) => (
              <TrainerCard trainer={tr} key={tr.id} />
            ))}
        </div>
      </section>
      <div className="mobile-booking-bar">
        <div>
          <small>Trial session</small>
          <strong>{money(t.packages[0].price)}</strong>
        </div>
        <Link href={book} className="btn">
          Book trial <ArrowUpRight size={17} />
        </Link>
      </div>
    </div>
  );
}
function ArrowRightIcon() {
  return <ArrowUpRight size={17} />;
}
