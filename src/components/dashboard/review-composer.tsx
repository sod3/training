"use client";

import { useMemo, useState } from "react";
import { BadgeCheck, CheckCircle2, MessageSquareText } from "lucide-react";
import { api } from "@/lib/client-api";
import { date, rows, str, type Item } from "./panels";

const ratingLabels = ["", "Needs improvement", "Fair", "Good", "Very good", "Excellent"];

export function ReviewComposer({ eligible, onDone }: { eligible: unknown; onDone: () => void }) {
  const bookings = useMemo(() => rows(eligible).filter((item) => str(item, "orderId")), [eligible]);
  const [orderId, setOrderId] = useState(() => str(bookings[0] || {}, "orderId"));
  const [rating, setRating] = useState(5);
  const [review, setReview] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const selected = bookings.find((item) => str(item, "orderId") === orderId) || bookings[0] || ({} as Item);

  if (!bookings.length) return null;

  return (
    <section className="panel review-composer">
      <div className="review-composer-head">
        <span className="review-composer-icon" aria-hidden="true"><MessageSquareText size={24} /></span>
        <div>
          <p className="eyebrow"><BadgeCheck size={14} /> VERIFIED BOOKING REVIEW</p>
          <h2>How was your training experience?</h2>
          <p>Your review is tied to a completed Spotter booking and helps future customers choose with confidence.</p>
        </div>
      </div>

      <div className="review-booking-summary" aria-live="polite">
        <span>Reviewing</span>
        <strong>{str(selected, "trainerName") || "Your trainer"}</strong>
        <small>
          {str(selected, "bookingNumber") || `Booking ${str(selected, "orderId").slice(-8)}`}
          {str(selected, "packageName") ? ` · ${str(selected, "packageName")}` : ""}
          {selected.completedAt ? ` · Completed ${date(selected.completedAt)}` : ""}
        </small>
      </div>

      {bookings.length > 1 && (
        <label className="field">
          Completed booking
          <select value={orderId} onChange={(event) => setOrderId(event.target.value)}>
            {bookings.map((booking) => {
              const id = str(booking, "orderId");
              const label = [
                str(booking, "bookingNumber") || `Booking ${id.slice(-8)}`,
                str(booking, "trainerName"),
                str(booking, "packageName"),
              ].filter(Boolean).join(" · ");
              return <option key={id} value={id}>{label}</option>;
            })}
          </select>
        </label>
      )}

      <fieldset className="rating-picker">
        <legend>Your rating</legend>
        <div role="radiogroup" aria-label="Rating out of 5 stars">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              type="button"
              key={star}
              className={star <= rating ? "selected" : ""}
              aria-label={`${star} star${star === 1 ? "" : "s"}`}
              aria-pressed={rating === star}
              onClick={() => setRating(star)}
            >
              ★
            </button>
          ))}
        </div>
        <strong>{ratingLabels[rating]}</strong>
        <span>{rating}/5</span>
      </fieldset>

      <label className="field review-text-field">
        Share useful detail
        <textarea
          rows={6}
          maxLength={3000}
          minLength={10}
          value={review}
          onChange={(event) => setReview(event.target.value)}
          placeholder="How was the coaching, communication, session structure and overall experience?"
        />
        <small>{review.length}/3000 characters · minimum 10</small>
      </label>

      <div className="review-trust-note">
        <CheckCircle2 size={18} />
        <span>Only customers with an eligible completed booking can publish here.</span>
      </div>

      {message && (
        <p className={message.toLowerCase().includes("published") ? "form-success" : "form-error"} role="status">
          {message}
        </p>
      )}
      <button
        type="button"
        className="btn review-submit"
        disabled={busy || !orderId || review.trim().length < 10}
        onClick={async () => {
          setBusy(true);
          setMessage("");
          try {
            const result = await api<{ message?: string }>("reviews", {
              orderId,
              rating,
              review: review.trim(),
            });
            setMessage(result.message || "Review published.");
            setReview("");
            onDone();
          } catch (error) {
            setMessage((error as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? "Publishing…" : "Publish verified review"}
      </button>
    </section>
  );
}
