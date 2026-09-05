"use client";
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BadgeCheck,
  ArrowRight,
  Check,
  CalendarDays,
  MapPin,
} from "lucide-react";
import { trainers } from "@/data/trainers";
import { dateKey, money, slots } from "@/lib/marketplace";
import { Booking, useStore } from "./store";
export function BookingFlow({
  params,
  checkout = false,
}: {
  params: Record<string, string>;
  checkout?: boolean;
}) {
  const { state, update, notify, ready } = useStore();
  const router = useRouter();
  const t =
    trainers.find((t) => t.slug === params.trainer) ||
    trainers.find((t) => t.packages.some((p) => p.id === params.package));
  const [packageId, setPackageId] = useState(
    params.package || t?.packages[0].id || "",
  );
  const pkg = t?.packages.find((p) => p.id === packageId);
  const [date, setDate] = useState(
    params.date || dateKey(t?.nextAvailable.startsWith("Today") ? 0 : 1),
  );
  const [time, setTime] = useState(params.time || "");
  const [type, setType] = useState(
    params.type || t?.trainingTypes[0] || "home",
  );
  const [address, setAddress] = useState(params.address || "");
  const [step, setStep] = useState(checkout ? 2 : 0);
  const [details, setDetails] = useState({ name: "", email: "", phone: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [simulate, setSimulate] = useState(false);
  if (!t || !pkg)
    return (
      <div className="container section empty-state">
        <CalendarDays size={40} />
        <h1>Let’s find your session.</h1>
        <p>
          {params.trainer || params.package
            ? "That trainer or package is unavailable."
            : "Choose a trainer before starting your booking."}
        </p>
        <Link href="/trainers" className="btn">
          Find a trainer →
        </Link>
      </div>
    );
  const available = slots(t, date).filter(
    (s) =>
      !state.bookings.some(
        (b) =>
          b.trainerId === t.id &&
          b.date === date &&
          b.time === s &&
          b.status !== "Cancelled",
      ),
  );
  const valid =
    available.includes(time) &&
    date >= dateKey() &&
    date <= dateKey(30) &&
    t.trainingTypes.some((v) => v === type) &&
    (type !== "home" || address.trim().length > 0);
  const summaryParams = () =>
    new URLSearchParams({
      trainer: t.slug,
      package: pkg.id,
      date,
      time,
      type,
      address,
    });
  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    if (step === 0) {
      setStep(1);
      return;
    }
    if (!valid) {
      setError(
        "This time is no longer available. Choose another date or time.",
      );
      return;
    }
    if (!checkout) {
      router.push(`/checkout?${summaryParams()}`);
      return;
    }
    if (step === 2) {
      const f = new FormData(e.currentTarget);
      setDetails({
        name: String(f.get("name")),
        email: String(f.get("email")),
        phone: String(f.get("phone")),
      });
      setStep(3);
      return;
    }
    if (!navigator.onLine) {
      setError(
        "You appear to be offline. Reconnect and try again; your details are still here.",
      );
      return;
    }
    if (simulate) {
      setError(
        "The demo payment did not go through. Turn off the simulation and try again. Nothing was charged.",
      );
      return;
    }
    setBusy(true);
    const booking: Booking = {
      id: `SPT-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
      trainerId: t.id,
      packageId: pkg.id,
      date,
      time,
      type,
      address:
        type === "home"
          ? address
          : type === "online"
            ? "Online session"
            : t.locations[0],
      name: String(details.name || state.name || "Guest"),
      price: pkg.price,
      status: "Confirmed",
    };
    update({ bookings: [...state.bookings, booking], name: booking.name });
    notify("Demo booking confirmed.");
    router.push(`/booking/success?reference=${booking.id}`);
  };
  return (
    <div className="container booking-page">
      <Link
        className="text-link"
        href={checkout ? `/booking?${summaryParams()}` : `/trainers/${t.slug}`}
      >
        ← {checkout ? "Edit session" : "Back to profile"}
      </Link>
      <div className="page-heading">
        <p className="eyebrow">
          {checkout ? "02 / CONFIRM YOUR SESSION" : "01 / MAKE TIME FOR YOU"}
        </p>
        <h1>
          {checkout ? "One step closer." : "Your first session starts here."}
        </h1>
        <p>
          {checkout
            ? "Review the details. We’ll save your booking right here."
            : "Pick a session that fits your life. All times are in Karachi (PKT)."}
        </p>
      </div>
      <div className="booking-steps" aria-label="Booking progress">
        {["Session", "Schedule", "Details", "Payment"].map((label, i) => (
          <span
            key={label}
            className={step === i ? "active" : ""}
            aria-current={step === i ? "step" : undefined}
          >
            {i + 1} · {label}
          </span>
        ))}
      </div>
      <form onSubmit={submit} className="checkout-grid">
        <div className="booking-form">
          {!checkout ? (
            <>
              {step === 0 && (
                <section className="panel">
                  <h2>Choose your session</h2>
                  <div className="booking-packages">
                    {t.packages.map((p) => (
                      <button
                        type="button"
                        key={p.id}
                        className={packageId === p.id ? "selected" : ""}
                        aria-pressed={packageId === p.id}
                        onClick={() => setPackageId(p.id)}
                      >
                        <div>
                          <strong>{p.title}</strong>
                          <small>
                            {p.sessions} sessions · {p.duration} min each
                          </small>
                        </div>
                        <span>{money(p.price)}</span>
                      </button>
                    ))}
                  </div>
                </section>
              )}
              {step === 1 && (
                <section className="panel">
                  <h2>A time for you</h2>
                  <label className="field">
                    Date
                    <input
                      type="date"
                      required
                      min={dateKey()}
                      max={dateKey(30)}
                      value={date}
                      onChange={(e) => {
                        setDate(e.target.value);
                        setTime("");
                      }}
                    />
                  </label>
                  <fieldset className="filter-group">
                    <legend>Available times</legend>
                    <div className="choice-chips">
                      {available.map((s) => (
                        <button
                          type="button"
                          key={s}
                          className={time === s ? "selected" : ""}
                          aria-pressed={time === s}
                          onClick={() => setTime(s)}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                    {!available.length && (
                      <p className="fine-print">
                        No sessions left on this date. Try a different date.
                      </p>
                    )}
                  </fieldset>
                </section>
              )}
            </>
          ) : step === 2 ? (
            <section className="panel">
              <h2>Your details</h2>
              <label className="field">
                Full name
                <input
                  name="name"
                  autoComplete="name"
                  required
                  defaultValue={details.name || state.name}
                  placeholder="Your name"
                />
              </label>
              <label className="field">
                Email
                <input
                  type="email"
                  name="email"
                  defaultValue={details.email}
                  autoComplete="email"
                  required
                  placeholder="you@example.com"
                />
              </label>
              <label className="field">
                Phone number
                <input
                  type="tel"
                  name="phone"
                  defaultValue={details.phone}
                  autoComplete="tel"
                  required
                  placeholder="03XX XXXXXXX"
                />
              </label>
              <p className="fine-print">
                Demo booking only. No confirmation email or SMS is sent.
              </p>
            </section>
          ) : null}
          {step === 0 && (
            <section className="panel">
              <h2>Where you’ll train</h2>
              <div className="choice-chips">
                {t.trainingTypes.map((v) => (
                  <button
                    type="button"
                    key={v}
                    aria-pressed={type === v}
                    className={type === v ? "selected" : ""}
                    onClick={() => setType(v)}
                  >
                    {v}
                  </button>
                ))}
              </div>
              {type === "home" ? (
                <label className="field mt-5">
                  Training address
                  <input
                    required
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Street, building, and area"
                  />
                </label>
              ) : (
                <p className="muted mt-5">
                  {type === "online"
                    ? "Your trainer will coordinate the online session details in messages."
                    : `Training in ${t.locations[0]}. Coordinate the exact meeting point in messages.`}
                </p>
              )}
            </section>
          )}
          {step === 3 && (
            <section className="panel">
              <h2>Payment preview</h2>
              <div className="payment-demo">
                <BadgeCheck size={24} />
                <div>
                  <strong>Simulated payment</strong>
                  <p>No card details needed. No money will be charged.</p>
                </div>
              </div>
              <label className="check-label mt-5">
                <input
                  type="checkbox"
                  checked={simulate}
                  onChange={(e) => setSimulate(e.target.checked)}
                />
                Test a failed demo payment
              </label>
            </section>
          )}
        </div>
        <aside className="order-summary panel">
          <p className="eyebrow">YOUR NEXT CHAPTER</p>
          <div className="order-trainer">
            <Image
              src={t.profileImage}
              alt={t.firstName}
              width={70}
              height={80}
            />
            <div>
              <h2>
                {t.firstName} {t.lastName}
              </h2>
              <p>
                <BadgeCheck size={14} />
                Sample profile
              </p>
            </div>
          </div>
          <h3>{pkg.title}</h3>
          <p className="muted text-sm">
            {pkg.sessions} sessions · {pkg.duration} minutes each
          </p>
          <dl className="order-details">
            <div>
              <dt>
                <CalendarDays size={15} />
                Date
              </dt>
              <dd>{date}</dd>
            </div>
            <div>
              <dt>Time · PKT</dt>
              <dd>{time || "Choose a time"}</dd>
            </div>
            <div>
              <dt>
                <MapPin size={15} />
                Location
              </dt>
              <dd>
                {type === "online"
                  ? "Online"
                  : type === "home"
                    ? address || "Your home"
                    : t.locations[0]}
              </dd>
            </div>
            <div>
              <dt>Session package</dt>
              <dd>{money(pkg.price)}</dd>
            </div>
            <div>
              <dt>Service fee</dt>
              <dd>PKR 0</dd>
            </div>
            <div className="order-total">
              <dt>Total</dt>
              <dd>{money(pkg.price)}</dd>
            </div>
          </dl>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          {checkout && !valid && (
            <p className="form-error">
              Please return to edit your session and select an available time.
            </p>
          )}
          <button
            type="submit"
            className="btn w-full"
            disabled={!ready || busy || (step > 0 && !valid)}
          >
            {busy
              ? "Saving your booking…"
              : step === 3
                ? "Confirm demo booking"
                : step === 2
                  ? "Review & payment"
                  : step === 0
                    ? "Choose a time"
                    : "Continue to booking"}
            <ArrowRight size={17} />
          </button>
          {step > 0 && step !== 2 && (
            <button
              type="button"
              className="text-link mt-4"
              onClick={() => setStep(step - 1)}
            >
              ← Back
            </button>
          )}
          <p className="cancellation-note">
            <Check size={15} />
            Free cancellation 12+ hours before
          </p>
          <Link href="/cancellation" className="text-link text-xs">
            View cancellation policy
          </Link>
        </aside>
      </form>
    </div>
  );
}
