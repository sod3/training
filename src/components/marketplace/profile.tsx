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
  const [selectedPackageId, setSelectedPackageId] = useState(t.packages[0]?.id || "");
  const [selectedDate, setSelectedDate] = useState("");
  const [time, setTime] = useState("");
  const [showMobileBooking, setShowMobileBooking] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);
  const saved = state.saved.includes(t.id);

  const selectedPkg = t.packages.find((p) => p.id === selectedPackageId) || t.packages[0];

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
    selectedPkg
      ? `trainers/${t.id}/availability?${new URLSearchParams({
          date: t.availabilityWeekStart,
          days: "7",
          packageId: selectedPkg.id,
        })}`
      : null,
  );

  const availableDays = availability?.days.filter((day) => day.slots.length) || [];
  const currentDayObj = availableDays.find((day) => day.date === selectedDate) || availableDays[0];
  const activeDate = currentDayObj?.date || "";
  const activeSlots = currentDayObj?.slots || [];

  useEffect(() => {
    const node = heroRef.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => {
      setShowMobileBooking(!entry.isIntersecting);
    }, { threshold: 0.08 });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const bookUrl = `/booking?${new URLSearchParams({
    trainer: t.slug,
    package: selectedPackageId,
    date: activeDate || t.nextAvailableDate || t.availabilityWeekStart,
    time: time,
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
        {selectedPkg && <span><small>From</small><strong>{money(selectedPkg.price)}</strong></span>}
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
            {["Overview", "Booking", "Reviews"].map((n) => (
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
                <Link href={bookUrl} className="text-link">
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

        {/* UNIFIED SINGLE BOOKING CARD */}
        <aside className="booking-sidebar" id="booking">
          <p className="eyebrow">STEP 1: CHOOSE SERVICE</p>
          {t.packages.length > 0 ? (
            <div className="choice-chips flex-col gap-2 mb-4">
              {t.packages.map((pkg) => (
                <button
                  key={pkg.id}
                  type="button"
                  className={`text-left p-3 border rounded-lg transition-all ${
                    selectedPackageId === pkg.id ? "selected border-primary bg-primary/5" : ""
                  }`}
                  onClick={() => {
                    setSelectedPackageId(pkg.id);
                    setTime("");
                  }}
                >
                  <div className="flex justify-between items-center w-full">
                    <strong className="text-base">{pkg.title}</strong>
                    <strong className="text-primary">{money(pkg.price)}</strong>
                  </div>
                  <p className="text-xs text-muted mt-1">
                    {pkg.sessions} {pkg.sessions === 1 ? "session" : "sessions"} · {pkg.duration} mins each
                  </p>
                </button>
              ))}
            </div>
          ) : (
            <p className="muted">This trainer has not published a bookable package yet.</p>
          )}

          {selectedPkg && (
            <>
              <p className="eyebrow mt-4">STEP 2: CHOOSE DAY</p>
              {slotsLoading ? (
                <p className="fine-print" role="status">Checking available slots…</p>
              ) : availableDays.length > 0 ? (
                <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
                  {availableDays.map((day) => (
                    <button
                      key={day.date}
                      type="button"
                      className={`px-3 py-2 border rounded-lg text-center min-w-[70px] ${
                        activeDate === day.date ? "selected border-primary bg-primary/10 font-bold" : ""
                      }`}
                      onClick={() => {
                        setSelectedDate(day.date);
                        setTime("");
                      }}
                    >
                      <div className="text-xs">{day.label.split(",")[0]}</div>
                      <div className="text-sm font-semibold">{day.label.split(",")[1] || day.date.slice(5)}</div>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="fine-print text-muted mb-4">No open days available in the next 7 days.</p>
              )}

              <p className="eyebrow mt-2">STEP 3: CHOOSE TIME</p>
              {activeSlots.length > 0 ? (
                <div className="choice-chips flex-wrap gap-2 mb-6">
                  {activeSlots.map((slot) => (
                    <button
                      key={slot.start}
                      type="button"
                      className={time === slot.start ? "selected" : ""}
                      onClick={() => setTime(slot.start)}
                    >
                      {new Date(slot.start).toLocaleTimeString(undefined, {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="fine-print text-muted mb-6">Select a date to view available start times.</p>
              )}

              <div className="border-t pt-4">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-sm text-muted">Selected Plan Total</span>
                  <strong className="text-xl font-bold">{money(selectedPkg.price)}</strong>
                </div>
                <Link href={bookUrl} className="btn w-full">
                  Continue to Booking <ArrowRight size={17} />
                </Link>
              </div>
            </>
          )}

          <Link
            href={`/dashboard/customer/messages?trainer=${t.id}`}
            className="btn outline w-full mt-3"
          >
            <MessageCircle size={16} />
            Message {t.firstName}
          </Link>
          <p className="fine-print text-center mt-3">
            Times shown in your device timezone.
          </p>
          <Link href="/cancellation" className="cancellation-note">
            <BadgeCheck size={16} />
            See cancellation policy before booking.
          </Link>
        </aside>
      </div>

      {/* ALSO RECOMMENDED: Hidden for logged-in trainers */}
      {recommended.length > 0 && state.role !== "trainer" && (
        <section className="profile-section mt-10" aria-labelledby="recommended-trainers">
          <p className="eyebrow">MORE COACHES TO CONSIDER</p>
          <h2 id="recommended-trainers">Also Recommended</h2>
          <p>Approved online trainers with a similar category or coaching focus.</p>
          <div className="trainer-grid mt-6">
            {recommended.map((trainer) => <TrainerCard key={trainer.id} trainer={trainer} />)}
          </div>
        </section>
      )}

      {selectedPkg && (
        <div className={`mobile-booking-bar ${showMobileBooking ? "visible" : ""}`}>
          <div>
            <small>{selectedPkg.title}</small>
            <strong>{money(selectedPkg.price)}</strong>
          </div>
          <Link href={bookUrl} className="btn">
            Book session <ArrowRight size={17} />
          </Link>
        </div>
      )}
    </div>
  );
}
