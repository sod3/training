"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, useApi } from "@/lib/client-api";
import { useStore } from "./store";
import { money } from "@/lib/marketplace";
import type { Trainer } from "@/types/trainer";
export function BookingFlow({
  params,
}: {
  params: Record<string, string>;
  checkout?: boolean;
}) {
  const { data, error, loading } = useApi<{ trainer: Trainer }>(
    params.trainer ? `trainers/${encodeURIComponent(params.trainer)}` : null,
  );
  if (!params.trainer)
    return (
      <div className="container section empty-state">
        <h1>Choose your trainer first.</h1>
        <Link href="/trainers" className="btn">
          Find a trainer →
        </Link>
      </div>
    );
  if (error)
    return (
      <div className="container section">
        <h1>Unable to load this trainer.</h1>
        <p role="alert">{error}</p>
        <Link href="/trainers">Browse trainers</Link>
      </div>
    );
  if (loading || !data)
    return (
      <div className="container section" role="status">
        <h1>Getting ready for your next session.</h1>
        <p>Loading trainer details…</p>
      </div>
    );
  return <Checkout trainer={data.trainer} params={params} />;
}
function Checkout({
  trainer: t,
  params,
}: {
  trainer: Trainer;
  params: Record<string, string>;
}) {
  const router = useRouter();
  const { state } = useStore();
  const [step, setStep] = useState(0);
  const [packageId, setPackage] = useState(
    params.package || t.packages[0]?.id || "",
  );
  const [type, setType] = useState(params.type || t.trainingTypes[0] || "gym");
  const [date, setDate] = useState(params.date || "");
  const [start, setStart] = useState(params.time || "");
  const [address, setAddress] = useState(params.address || "");
  const [paymentMethod, setPaymentMethod] = useState<"JAZZCASH" | "EASYPAISA">(
    "JAZZCASH",
  );
  const [payerName, setPayerName] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [proof, setProof] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [orderId, setOrderId] = useState("");
  const [key] = useState(() => crypto.randomUUID());
  const pkg = t.packages.find((p) => p.id === packageId);
  const {
    data,
    loading,
    error: availabilityError,
  } = useApi<{ slots: { start: string; label: string }[] }>(
    date && packageId
      ? `trainers/${t.id}/availability?${new URLSearchParams({ date, packageId, type })}`
      : null,
  );
  const { data: paymentAccounts } = useApi<{
    accountName: string;
    jazzcash: string;
    easypaisa: string;
  }>("payment-methods");
  const resume = `/checkout?${new URLSearchParams({ trainer: t.slug, package: packageId, type, date, time: start, address })}`;
  return (
    <div className="container section booking-page">
      <div className="page-heading">
        <p className="eyebrow">A LITTLE TIME FOR YOU</p>
        <h1>Your next good decision.</h1>
        <p>
          Train with {t.firstName} {t.lastName}.
        </p>
      </div>
      <div className="checkout-steps">
        {["Package", "Schedule", "Details", "Payment"].map((s, i) => (
          <span className={step === i ? "active" : ""} key={s}>
            {i + 1}. {s}
          </span>
        ))}
      </div>
      <div className="production-checkout">
        <section className="panel">
          {step === 0 && (
            <>
              <h2>Find your rhythm.</h2>
              <div className="package-grid">
                {t.packages.map((p) => (
                  <button
                    key={p.id}
                    className={`package-card ${p.id === packageId ? "popular" : ""}`}
                    aria-pressed={p.id === packageId}
                    onClick={() => {
                      setPackage(p.id);
                      setStart("");
                    }}
                  >
                    <h3>{p.title}</h3>
                    <strong>{money(p.price)}</strong>
                    <p>
                      {p.sessions} sessions · {p.duration} minutes
                    </p>
                    <p>{p.description}</p>
                  </button>
                ))}
              </div>
              <fieldset className="filter-group">
                <legend>How would you like to train?</legend>
                <div className="choice-chips">
                  {t.trainingTypes.map((value) => (
                    <button
                      key={value}
                      className={type === value ? "selected" : ""}
                      onClick={() => {
                        setType(value);
                        setStart("");
                      }}
                    >
                      {value}
                    </button>
                  ))}
                </div>
              </fieldset>
            </>
          )}
          {step === 1 && (
            <>
              <h2>A time that fits.</h2>
              <label className="field">
                Choose a date
                <input
                  type="date"
                  value={date}
                  onChange={(e) => {
                    setDate(e.target.value);
                    setStart("");
                  }}
                />
              </label>
              <p>All times shown in {t.timezone}.</p>
              {loading && <p role="status">Checking availability…</p>}
              {availabilityError && <p role="alert">{availabilityError}</p>}
              <div className="choice-chips">
                {data?.slots.map((s) => (
                  <button
                    key={s.start}
                    className={start === s.start ? "selected" : ""}
                    onClick={() => setStart(s.start)}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
              {data && !data.slots.length && (
                <p>No open times on this date. Try another day.</p>
              )}
            </>
          )}
          {step === 2 && (
            <>
              <h2>Make it yours.</h2>
              {type === "home" ? (
                <label className="field">
                  Training address
                  <textarea
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    maxLength={1000}
                  />
                </label>
              ) : (
                <p>
                  Your trainer will coordinate the {type} session details with
                  you through messages.
                </p>
              )}
              <p>
                For a multi-session package, this reserves your first
                appointment. Schedule the remaining sessions in your dashboard
                after payment.
              </p>
            </>
          )}
          {step === 3 && (
            <>
              <h2>Pay in two simple steps.</h2>
              <p>
                Transfer the total to JazzCash or EasyPaisa, then send the
                screenshot and transaction details below. An admin checks the
                transfer and confirms your booking.
              </p>
              <div className="payment-method-cards">
                {(["JAZZCASH", "EASYPAISA"] as const).map((method) => (
                  <button
                    key={method}
                    type="button"
                    className={`package-card ${paymentMethod === method ? "popular" : ""}`}
                    aria-pressed={paymentMethod === method}
                    onClick={() => setPaymentMethod(method)}
                  >
                    <strong>
                      {method === "JAZZCASH" ? "JazzCash" : "EasyPaisa"}
                    </strong>
                    <span>
                      {method === "JAZZCASH"
                        ? paymentAccounts?.jazzcash || "Add JazzCash number"
                        : paymentAccounts?.easypaisa || "Add EasyPaisa number"}
                    </span>
                    <small>
                      Account:{" "}
                      {paymentAccounts?.accountName || "Spotter Training"}
                    </small>
                  </button>
                ))}
              </div>
              <div className="payment-notice">
                <strong>Pay {money(pkg?.price || 0)} now</strong>
                <p>
                  Use the receiving number shown above. Keep your transaction ID
                  and screenshot ready. Your slot stays held while the admin
                  reviews the proof.
                </p>
              </div>
              <label className="field">
                Name used for the transfer
                <input
                  value={payerName}
                  onChange={(e) => setPayerName(e.target.value)}
                  maxLength={120}
                  required
                />
              </label>
              <label className="field">
                Transaction ID
                <input
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                  maxLength={120}
                  required
                />
              </label>
              <label className="field">
                Payment screenshot
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp"
                  onChange={(e) => setProof(e.target.files?.[0] || null)}
                  required
                />
                <small>JPG, PNG, or WebP up to 4 MB.</small>
              </label>
              <p>
                Free cancellation until the window shown in your reservation.
                Late cancellations forfeit the affected session’s portion of the
                package.
              </p>
              {state.role === "visitor" ? (
                <Link
                  className="btn"
                  href={`/login?next=${encodeURIComponent(resume)}`}
                >
                  Sign in to finish booking →
                </Link>
              ) : (
                <button
                  className="btn"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    setError("");
                    try {
                      let id = orderId;
                      if (!id) {
                        const order = await api<{ _id: string }>("bookings", {
                          packageId,
                          start,
                          trainingType: type,
                          address,
                          idempotencyKey: key,
                        });
                        id = order._id;
                        setOrderId(id);
                      }
                      if (!proof)
                        throw new Error("Upload your payment screenshot first");
                      const upload = new FormData();
                      upload.set("file", proof);
                      upload.set("purpose", "PAYMENT_PROOF");
                      const uploadResponse = await fetch("/api/uploads", {
                        method: "POST",
                        body: upload,
                      });
                      const uploadResult = await uploadResponse.json();
                      if (!uploadResponse.ok)
                        throw new Error(
                          uploadResult.error || "Screenshot upload failed",
                        );
                      await api(`bookings/${id}/pay`, {
                        method: paymentMethod,
                        payerName,
                        transactionId,
                        proofUploadId: uploadResult.id,
                      });
                      router.push(`/booking/success?id=${id}`);
                    } catch (e) {
                      setError((e as Error).message);
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  {busy
                    ? "Sending payment proof…"
                    : "Submit payment for review →"}
                </button>
              )}
              {orderId && (
                <Link
                  className="text-link mt-4"
                  href={`/booking/success?id=${orderId}`}
                >
                  View reservation and payment status
                </Link>
              )}
            </>
          )}
          {error && (
            <p role="alert" className="form-error">
              {error}
            </p>
          )}
          <div className="workspace-actions">
            {step > 0 && (
              <button
                className="btn outline"
                onClick={() => setStep(step - 1)}
                disabled={busy}
              >
                Back
              </button>
            )}
            {step < 3 && (
              <button
                className="btn"
                disabled={
                  !pkg ||
                  (step === 1 &&
                    (!start || !data?.slots.some((s) => s.start === start))) ||
                  (step === 2 && type === "home" && address.length < 10) ||
                  (step === 3 &&
                    (!payerName.trim() || !transactionId.trim() || !proof))
                }
                onClick={() => setStep(step + 1)}
              >
                Continue →
              </button>
            )}
          </div>
        </section>
        <aside className="panel order-summary">
          <p className="eyebrow">YOUR TRAINING PLAN</p>
          <h2>
            {t.firstName} {t.lastName}
          </h2>
          <h3>{pkg?.title || "Select a package"}</h3>
          <p>
            {pkg?.sessions || 0} sessions · {pkg?.duration || 0} minutes
          </p>
          <p>{type}</p>
          <p>
            {start
              ? new Date(start).toLocaleString("en-PK", {
                  timeZone: t.timezone,
                })
              : "Choose a time"}
          </p>
          <strong className="order-total">{money(pkg?.price || 0)}</strong>
          <p>
            Final price and terms are calculated and saved by Spotter before
            payment.
          </p>
          <Link href="/cancellation" className="text-link">
            Cancellation policy →
          </Link>
        </aside>
      </div>
    </div>
  );
}
