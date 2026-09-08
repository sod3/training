"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  BadgeCheck,
  Star,
  Video,
  Heart,
  Share2,
  ArrowRight,
  Check,
  Clock,
  MessageCircle,
} from "lucide-react";
import { Trainer } from "@/types/trainer";
import { useApi } from "@/lib/client-api";
import { localAvailabilityLabel, money } from "@/lib/marketplace";
import { useStore } from "./store";
import { VerifiedBadge } from "./verified-badge";
import { TrainerCard } from "./trainer-card";

export function Profile({ trainer: t, recommended = [] }: { trainer: Trainer; recommended?: Trainer[] }) {
  const { state, notify, toggleSaved } = useStore();
  const [time, setTime] = useState("");
  const [showMobileBooking, setShowMobileBooking] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);
  const saved = state.saved.includes(t.id);
  const {
    data: availability,
    error: slotError,
    loading: slotsLoading,
  } = useApi<{
    days: {
      date: string;
      label: string;
      slots: { start: string; label: string }[];
    }[];
  }>(
    t.packages.length
      ? `trainers/${t.id}/availability?${new URLSearchParams({
          date: t.availabilityWeekStart,
          days: "7",
          packageId: t.packages[0].id,
        })}`
      : null,
  );
  const availableDays =
    availability?.days.filter((day) => day.slots.length) || [];
  const selectedDate = availableDays.find((day) =>
    day.slots.some((slot) => slot.start === time),
  )?.date;
  useEffect(() => {
    const node = heroRef.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => {
      setShowMobileBooking(!entry.isIntersecting);
    }, { threshold: 0.08 });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const book = `/booking?${new URLSearchParams({
    trainer: t.slug,
    date: selectedDate || t.nextAvailableDate || t.availabilityWeekStart,
    time,
  })}`;
  return (
    <div className="container profile-page">
      <Link href="/trainers" className="text-link">
        ← All trainers
      </Link>
      <div className="profile-heading" ref={heroRef}>
        <div>
          <p className="eyebrow">A GOOD CONNECTION STARTS HERE</p>
          <h1>
            {t.firstName} {t.lastName} {t.verifiedIdentity && <BadgeCheck />}
          </h1>
          <p>{t.headline}</p>
          <p className="profile-online-line">
            <span>Next available: {localAvailabilityLabel(t)}</span>
          </p>
        </div>
        <div className="profile-actions">
          <button
            className="btn outline small"
            aria-pressed={saved}
            onClick={() => void toggleSaved(t.id)}
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
      <div className="mobile-profile-summary" aria-label="Trainer booking summary">
        {t.packages.length > 0 && <span><small>From</small><strong>{money(t.basePrice)}</strong></span>}
        <span><small>Next</small><strong>{localAvailabilityLabel(t)}</strong></span>
        {t.reviewCount > 0 && <span><small>Rating</small><strong>{t.rating.toFixed(1)} / 5</strong></span>}
        {t.verifiedIdentity && <span><small>Status</small><strong>Identity reviewed</strong></span>}
      </div>
      <div className="profile-gallery">
        <div>
          <Image
            src={t.profileImage || "/media/fallback-trainer-profile.avif"}
            alt={`${t.firstName} ${t.lastName}`}
            fill
            priority
            sizes="(max-width:768px) 100vw, 45vw"
          />
        </div>
        <div>
          <Image
            src={t.coverImage || "/media/fallback-trainer-profile.avif"}
            alt={`${t.firstName}'s online coaching approach`}
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
              <strong>{t.reviewCount ? t.rating.toFixed(1) : "No reviews yet"}</strong>{t.reviewCount ? ` · ${t.reviewCount} reviews` : ""}
            </span>
            {t.sessionsCompleted > 0 && <span>{t.sessionsCompleted} sessions completed</span>}
            {t.responseTime && <span>
              <Clock size={16} />
              Replies {t.responseTime}
            </span>}
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
            <p>{t.bio.slice(0, 220)}</p>
            {t.bio.length > 220 && (
              <details>
                <summary>Read more</summary>
                <p>{t.bio.slice(220)}</p>
              </details>
            )}
            <div className="trust-pills">
              {t.verifiedIdentity && (
                <VerifiedBadge credentials={t.verifiedCredentials} />
              )}
              {t.verifiedIdentity && (
                <span>
                  <BadgeCheck size={16} />
                  Identity reviewed
                </span>
              )}
              {t.verifiedCredentials && (
                <span>
                  <BadgeCheck size={16} />
                  Credentials reviewed
                </span>
              )}
            </div>
            {t.category && <>
              <h3>Primary category</h3>
              <div className="choice-chips"><span>{t.category}</span></div>
            </>}
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
            <h3>How sessions happen</h3>
            <p className="flex gap-2 items-center">
              <Video size={17} />
              Live 1-on-1 online video sessions
            </p>

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
                    {p.sessions === 1 ? "Book session" : "Choose package"}
                    <ArrowRight size={16} />
                  </Link>
                </article>
              ))}
            </div>
          </section>
          <section className="profile-section" id="availability">
            <p className="eyebrow">MAKE ROOM FOR YOU</p>
            <h2>A time that fits.</h2>
            <p>
              See real available sessions for the next seven days. Booking shows times in your device timezone, with {t.timezone} shown as the trainer timezone.
            </p>
            <Link href={book} className="btn outline mt-5">
              Explore available sessions <ArrowRight size={17} />
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
                    {r.verified ? "Verified booking" : "Review"}
                  </small>
                </article>
              ))
            ) : (
              <div className="empty-state compact">
                <Star size={28} />
                <h3>Room for your experience.</h3>
                <p>
                  This coach has no published reviews yet. Reviews appear after
                  completed bookings.
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
          <p className="eyebrow">START WITH THE RIGHT SESSION</p>
          {t.packages[0] ? (
            <>
              <p className="booking-price">
                {money(t.packages[0].price)}{" "}
                <span>/ {t.packages[0].sessions === 1 ? "session" : "package"}</span>
              </p>
              <p className="muted text-sm">
                {t.packages[0].sessions > 1
                  ? `${money(Math.round(t.packages[0].price / t.packages[0].sessions))} / session · ${t.packages[0].sessions} sessions`
                  : `${t.packages[0].duration} minutes · A plan built around you`}
              </p>
            </>
          ) : (
            <p className="muted">This trainer has not published a bookable package yet.</p>
          )}
          <fieldset className="filter-group weekly-availability">
            <legend>Available times · your device timezone</legend>
            <p className="fine-print">Next 7 days</p>
            <div className="availability-week">
              {availableDays.map((day) => (
                <DaySlots
                  key={day.date}
                  day={day}
                  selectedTime={time}
                  onSelectTime={setTime}
                />
              ))}
            </div>
            {slotsLoading && <p role="status">Checking availability…</p>}
            {!t.packages.length && (
              <p className="fine-print">
                Availability will appear after this trainer adds a package.
              </p>
            )}

            {slotError && <p role="alert">{slotError}</p>}
            {!slotsLoading &&
              availability &&
              !availableDays.length &&
              !slotError && (
                <p className="fine-print">
                  No open times in the next seven days.
                </p>
              )}
          </fieldset>
          {t.packages[0] && (
            <Link href={book} className="btn w-full">
              Book online session <ArrowRightIcon />
            </Link>
          )}
          <Link
            href={`/dashboard/customer/messages?trainer=${t.id}`}
            className="btn outline w-full mt-3"
          >
            <MessageCircle size={16} />
            Message {t.firstName}
          </Link>
          <p className="fine-print text-center">
            Choose the service and time that fits your goals.
          </p>
          <Link href="/cancellation" className="cancellation-note">
            <BadgeCheck size={16} />
            See the cancellation terms before booking.
          </Link>
        </aside>
      </div>
      {recommended.length > 0 && (
        <section className="profile-section mt-10" aria-labelledby="recommended-trainers">
          <p className="eyebrow">MORE COACHES TO CONSIDER</p>
          <h2 id="recommended-trainers">Also Recommended</h2>
          <p>Approved online trainers with a similar category or coaching focus.</p>
          <div className="trainer-grid mt-6">
            {recommended.map((trainer) => <TrainerCard key={trainer.id} trainer={trainer} />)}
          </div>
        </section>
      )}
      {t.packages[0] && (
        <div className={`mobile-booking-bar ${showMobileBooking ? "visible" : ""}`}>
          <div>
            <small>Online coaching</small>
            <strong>{money(t.packages[0].price)}</strong>
          </div>
          <Link href={book} className="btn">
            Book session <ArrowRight size={17} />
          </Link>
        </div>
      )}
    </div>
  );
}
function ArrowRightIcon() {
  return <ArrowRight size={17} />;
}

function DaySlots({
  day,
  selectedTime,
  onSelectTime,
}: {
  day: { date: string; label: string; slots: { start: string; label: string }[] };
  selectedTime: string;
  onSelectTime: (t: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const slots = day.slots;
  const visible = expanded
    ? slots
    : slots.filter((s, i) => i < 6 || s.start === selectedTime);
  return (
    <section className="availability-day">
      <h3>{day.label}</h3>
      <div className="choice-chips">
        {visible.map((slot) => (
          <button
            key={slot.start}
            aria-pressed={selectedTime === slot.start}
            className={selectedTime === slot.start ? "selected" : ""}
            onClick={() => onSelectTime(slot.start)}
          >
            {new Date(slot.start).toLocaleTimeString(undefined, {
              hour: "numeric",
              minute: "2-digit",
            })}
          </button>
        ))}
      </div>
      {!expanded && slots.length > visible.length && (
        <button
          type="button"
          className="text-link small"
          style={{ marginTop: "0.25rem", display: "inline-block", fontSize: "0.8rem" }}
          onClick={() => setExpanded(true)}
        >
          + {slots.length - visible.length} more times
        </button>
      )}
      {expanded && slots.length > 6 && (
        <button
          type="button"
          className="text-link small"
          style={{ marginTop: "0.25rem", display: "inline-block", fontSize: "0.8rem" }}
          onClick={() => setExpanded(false)}
        >
          Show fewer
        </button>
      )}
    </section>
  );
}
