"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, useApi } from "@/lib/client-api";
import { useStore } from "./store";
import { money } from "@/lib/marketplace";
import type { Trainer } from "@/types/trainer";

export function BookingFlow({ params }: { params: Record<string, string>; checkout?: boolean }) {
  const { data, error, loading } = useApi<{ trainer: Trainer }>(
    params.trainer ? `trainers/${encodeURIComponent(params.trainer)}` : null,
  );
  if (!params.trainer)
    return (
      <div className="container section empty-state">
        <h1>Choose your trainer first.</h1>
        <Link href="/trainers" className="btn">Browse trainers →</Link>
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
    return <div className="container section" role="status"><h1>Getting your booking ready.</h1><p>Loading trainer details…</p></div>;
  return <Checkout trainer={data.trainer} params={params} />;
}

function Checkout({ trainer: t, params }: { trainer: Trainer; params: Record<string, string> }) {
  const router = useRouter();
  const { state } = useStore();
  const [step, setStep] = useState(0);
  const [packageId, setPackage] = useState(params.package || t.packages[0]?.id || "");
  const [date, setDate] = useState(params.date || "");
  const [start, setStart] = useState(params.time || "");
  const [paymentMethod, setPaymentMethod] = useState<"JAZZCASH" | "EASYPAISA">("JAZZCASH");
  const [payerName, setPayerName] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [proof, setProof] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [orderId, setOrderId] = useState("");
  const [key] = useState(() => crypto.randomUUID());
  const pkg = t.packages.find((p) => p.id === packageId);
  const { data, loading, error: availabilityError } = useApi<{ slots: { start: string; label: string }[] }>(
    date && packageId
      ? `trainers/${t.id}/availability?${new URLSearchParams({ date, packageId })}`
      : null,
  );
  const {
    data: paymentAccounts,
    loading: paymentMethodsLoading,
    error: paymentMethodsError,
  } = useApi<{ accountName: string; jazzcash: string; easypaisa: string; configured: boolean }>("payment-methods");
  const availablePaymentMethods = ([
    ["JAZZCASH", paymentAccounts?.jazzcash],
    ["EASYPAISA", paymentAccounts?.easypaisa],
  ] as const).filter(([, number]) => Boolean(number));
  const selectedPaymentNumber = paymentMethod === "JAZZCASH" ? paymentAccounts?.jazzcash : paymentAccounts?.easypaisa;
  useEffect(() => {
    if (paymentMethod === "JAZZCASH" && !paymentAccounts?.jazzcash && paymentAccounts?.easypaisa)
      setPaymentMethod("EASYPAISA");
    if (paymentMethod === "EASYPAISA" && !paymentAccounts?.easypaisa && paymentAccounts?.jazzcash)
      setPaymentMethod("JAZZCASH");
  }, [paymentAccounts?.easypaisa, paymentAccounts?.jazzcash, paymentMethod]);
  const resume = `/checkout?${new URLSearchParams({ trainer: t.slug, package: packageId, date, time: start })}`;
  const localSlot = start
    ? new Date(start).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
    : "Choose a time";
  const trainerSlot = start && t.timezone
    ? new Date(start).toLocaleString("en", { timeZone: t.timezone, dateStyle: "medium", timeStyle: "short" })
    : "";

  return (
    <div className="container section booking-page">
      <div className="page-heading">
        <p className="eyebrow">LIVE ONLINE TRAINING</p>
        <h1>Book your session.</h1>
        <p>Train online with {t.firstName} {t.lastName}, from wherever you are.</p>
      </div>
      <div className="checkout-steps">
        {["Package", "Schedule", "Payment"].map((label, index) => (
          <span className={step === index ? "active" : ""} key={label}>{index + 1}. {label}</span>
        ))}
      </div>
      <div className="production-checkout">
        <section className="panel">
          {step === 0 && (
            <>
              <h2>Choose your training plan.</h2>
              <p>All Spotter sessions are delivered online, one-to-one with your trainer.</p>
              <div className="package-grid">
                {t.packages.map((p) => (
                  <button
                    type="button"
                    key={p.id}
                    className={`package-card ${p.id === packageId ? "popular" : ""}`}
                    aria-pressed={p.id === packageId}
                    onClick={() => { setPackage(p.id); setStart(""); }}
                  >
                    <h3>{p.title}</h3>
                    <strong>{money(p.price)}</strong>
                    <p>{p.sessions} sessions · {p.duration} minutes</p>
                    <p>{p.description}</p>
                  </button>
                ))}
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <h2>Choose a real available time.</h2>
              <label className="field">
                Date
                <input type="date" value={date} onChange={(e) => { setDate(e.target.value); setStart(""); }} />
              </label>
              <p><strong>Times are shown in your device timezone.</strong>{t.timezone ? ` Trainer schedule: ${t.timezone}.` : ""}</p>
              {loading && <p role="status">Checking live availability…</p>}
              {availabilityError && <p role="alert" className="form-error">{availabilityError}</p>}
              <div className="choice-chips">
                {data?.slots.map((slot) => (
                  <button
                    type="button"
                    key={slot.start}
                    className={start === slot.start ? "selected" : ""}
                    onClick={() => setStart(slot.start)}
                    title={t.timezone ? `Trainer time: ${new Date(slot.start).toLocaleTimeString("en", { timeZone: t.timezone, hour: "numeric", minute: "2-digit" })}` : undefined}
                  >
                    {new Date(slot.start).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                  </button>
                ))}
              </div>
              {data && !data.slots.length && <p>No open times on this date. Choose another day.</p>}
              {start && (
                <div className="payment-notice">
                  <strong>{localSlot} — your time</strong>
                  {trainerSlot && <p>{trainerSlot} — trainer time</p>}
                </div>
              )}
              <p>For multi-session packages, this reserves the first session. You can schedule remaining sessions from your dashboard after payment approval.</p>
            </>
          )}

          {step === 2 && (
            <>
              <h2>Pay with JazzCash or EasyPaisa.</h2>
              <p>Transfer the total to the account below, then submit your transaction ID and screenshot. An admin verifies the transfer before confirming the booking.</p>
              {paymentMethodsLoading ? (
                <p role="status">Loading payment account details…</p>
              ) : paymentMethodsError ? (
                <div className="empty-state compact" role="alert">
                  <h3>We could not load payment details.</h3>
                  <p>{paymentMethodsError}</p>
                </div>
              ) : !paymentAccounts?.configured ? (
                <div className="empty-state compact" role="alert">
                  <h3>Manual payments are temporarily unavailable.</h3>
                  <p>The Spotter payment account numbers have not been configured. No booking will be created until a payment method is available.</p>
                </div>
              ) : (
                <div className="payment-method-cards">
                  {availablePaymentMethods.map(([method, number]) => (
                    <button
                      type="button"
                      key={method}
                      className={`package-card ${paymentMethod === method ? "popular" : ""}`}
                      aria-pressed={paymentMethod === method}
                      onClick={() => setPaymentMethod(method)}
                    >
                      <strong>{method === "JAZZCASH" ? "JazzCash" : "EasyPaisa"}</strong>
                      <span>{number}</span>
                      <small>Account: {paymentAccounts?.accountName || "Spotter Training"}</small>
                    </button>
                  ))}
                </div>
              )}
              <div className="payment-notice">
                <strong>Pay {money(pkg?.price || 0)}</strong>
                <p>After you submit valid payment proof, Spotter keeps this reservation pending while an admin reviews it.</p>
              </div>
              <label className="field">Name used for transfer<input value={payerName} onChange={(e) => setPayerName(e.target.value)} maxLength={120} /></label>
              <label className="field">Transaction ID<input value={transactionId} onChange={(e) => setTransactionId(e.target.value)} maxLength={120} /></label>
              <label className="field">
                Payment screenshot
                <input type="file" accept=".jpg,.jpeg,.png,.webp" onChange={(e) => setProof(e.target.files?.[0] || null)} />
                <small>JPG, PNG, or WebP up to 4 MB.</small>
              </label>
              <p>Cancellation and refund outcomes follow the policy saved with your booking.</p>
              {state.role === "visitor" ? (
                <Link className="btn" href={`/login?next=${encodeURIComponent(resume)}`}>Sign in to finish booking →</Link>
              ) : state.role !== "customer" ? (
                <div className="empty-state compact" role="alert">
                  <h3>Customer account required.</h3>
                  <p>Trainer and admin accounts cannot place customer bookings. Sign in with a customer account to continue.</p>
                </div>
              ) : (
                <button
                  type="button"
                  className="btn"
                  disabled={busy || !selectedPaymentNumber || !payerName.trim() || !transactionId.trim() || !proof || !start || !packageId}
                  onClick={async () => {
                    setBusy(true);
                    setError("");
                    try {
                      let id = orderId;
                      if (!id) {
                        const order = await api<{ _id: string }>("bookings", { packageId, start, idempotencyKey: key });
                        id = order._id;
                        setOrderId(id);
                      }
                      if (!proof) throw new Error("Upload your payment screenshot first");
                      const upload = new FormData();
                      upload.set("file", proof);
                      upload.set("purpose", "PAYMENT_PROOF");
                      const uploadResponse = await fetch("/api/uploads", { method: "POST", body: upload });
                      const uploadResult = await uploadResponse.json();
                      if (!uploadResponse.ok) throw new Error(uploadResult.error || "Screenshot upload failed");
                      await api(`bookings/${id}/pay`, { method: paymentMethod, payerName: payerName.trim(), transactionId: transactionId.trim(), proofUploadId: uploadResult.id });
                      router.push(`/booking/success?id=${id}`);
                    } catch (e) {
                      setError((e as Error).message);
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  {busy ? "Submitting payment proof…" : "Submit payment for review →"}
                </button>
              )}
              {orderId && <Link className="text-link mt-4" href={`/booking/success?id=${orderId}`}>View reservation and payment status</Link>}
            </>
          )}

          {error && <p role="alert" className="form-error">{error}</p>}
          <div className="workspace-actions">
            {step > 0 && <button type="button" className="btn outline" onClick={() => setStep(step - 1)} disabled={busy}>Back</button>}
            {step < 2 && (
              <button
                type="button"
                className="btn"
                disabled={!pkg || (step === 1 && (!start || !data?.slots.some((slot) => slot.start === start)))}
                onClick={() => setStep(step + 1)}
              >Continue →</button>
            )}
          </div>
        </section>

        <aside className="panel order-summary">
          <p className="eyebrow">YOUR ONLINE TRAINING PLAN</p>
          <h2>{t.firstName} {t.lastName}</h2>
          <h3>{pkg?.title || "Select a package"}</h3>
          <p>{pkg?.sessions || 0} sessions · {pkg?.duration || 0} minutes</p>
          <p>Live online · 1-on-1</p>
          <p>{localSlot}</p>
          {trainerSlot && start && <small>Trainer time: {trainerSlot}</small>}
          <strong className="order-total">{money(pkg?.price || 0)}</strong>
          <p>Price, service terms and cancellation policy are snapshotted into the booking before payment.</p>
          <Link href="/cancellation" className="text-link">Cancellation policy →</Link>
        </aside>
      </div>
    </div>
  );
}
