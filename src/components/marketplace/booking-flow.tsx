"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { api, apiResult, useApi } from "@/lib/client-api";
import { useStore } from "./store";
import { money } from "@/lib/marketplace";
import type { Trainer } from "@/types/trainer";

function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="btn outline small copy-btn"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.25rem",
        padding: "0.2rem 0.5rem",
        fontSize: "0.78rem",
        marginLeft: "0.5rem",
        cursor: "pointer",
        borderRadius: "6px",
      }}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {}
      }}
      title={`Copy ${label || text}`}
    >
      {copied ? "✓ Copied!" : "📋 Copy"}
    </button>
  );
}

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
          Browse trainers →
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
        <h1>Getting your booking ready.</h1>
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
  const initialStep = useMemo(() => {
    if (params.package && params.date && params.time) return 2;
    if (params.package) return 1;
    return 0;
  }, [params.package, params.date, params.time]);

  const [step, setStep] = useState(initialStep);
  const [packageId, setPackage] = useState(
    params.package || t.packages[0]?.id || "",
  );
  const [date, setDate] = useState(params.date || "");
  const [start, setStart] = useState(params.time || "");
  const [paymentMethod, setPaymentMethod] = useState<
    "EASYPAISA" | "BANK_TRANSFER" | "JAZZCASH"
  >("EASYPAISA");
  const [showAllSlots, setShowAllSlots] = useState(false);
  const [payerName, setPayerName] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [proof, setProof] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [orderId, setOrderId] = useState("");
  const [key] = useState(() => crypto.randomUUID());
  const pkg = t.packages.find((p) => p.id === packageId);
  const scheduleDays = useMemo(
    () =>
      Array.from({ length: 7 }, (_, offset) => {
        const value = new Date();
        value.setHours(12, 0, 0, 0);
        value.setDate(value.getDate() + offset);
        const key = `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
        return {
          key,
          day: value.toLocaleDateString(undefined, { weekday: "short" }),
          date: value.toLocaleDateString(undefined, { day: "2-digit" }),
          month: value.toLocaleDateString(undefined, { month: "short" }),
        };
      }),
    [],
  );
  const {
    data,
    loading,
    error: availabilityError,
  } = useApi<{ slots: { start: string; label: string }[] }>(
    date && packageId
      ? `trainers/${t.id}/availability?${new URLSearchParams({ date, packageId })}`
      : null,
  );
  const allSlots = data?.slots || [];
  const visibleSlots = showAllSlots
    ? allSlots
    : allSlots.filter((s, i) => i < 6 || s.start === start);

  const {
    data: paymentAccounts,
    loading: paymentMethodsLoading,
    error: paymentMethodsError,
  } = useApi<{
    accountName: string;
    jazzcash: string;
    easypaisa: string;
    bankTransfer: {
      accountName: string;
      accountNumber: string;
      iban: string;
      branch: string;
    };
    configured: boolean;
  }>("payment-methods");

  const easypaisaNumber = paymentAccounts?.easypaisa || "03362226174";
  const bankDetails = paymentAccounts?.bankTransfer || {
    accountName: "ZAID UMER",
    accountNumber: "10530113545140",
    iban: "PK21MEZN0010530113545140",
    branch: "ANCHOLI BRANCH KHI",
  };
  const selectedPaymentMethod = paymentMethod;
  const selectedPaymentNumber =
    paymentMethod === "EASYPAISA"
      ? easypaisaNumber
      : paymentMethod === "BANK_TRANSFER"
        ? bankDetails.accountNumber
        : paymentAccounts?.jazzcash || "";
  const resume = `/checkout?${new URLSearchParams({ trainer: t.slug, package: packageId, date, time: start })}`;
  const localSlot = start
    ? new Date(start).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "Choose a time";
  const trainerSlot =
    start && t.timezone
      ? new Date(start).toLocaleString("en", {
          timeZone: t.timezone,
          dateStyle: "medium",
          timeStyle: "short",
        })
      : "";

  return (
    <div className="container section booking-page">
      <div className="page-heading">
        <p className="eyebrow">LIVE ONLINE TRAINING</p>
        <h1>Book your session.</h1>
        <p>
          Train online with {t.firstName} {t.lastName}, from wherever you are.
        </p>
      </div>
      <div className="checkout-steps">
        {["Package", "Schedule", "Payment"].map((label, index) => (
          <span className={step === index ? "active" : ""} key={label}>
            {index + 1}. {label}
          </span>
        ))}
      </div>
      <div className="production-checkout">
        <section className="panel">
          {step === 0 && (
            <>
              <h2>Choose your training plan.</h2>
              <p>
                All Spotter sessions are delivered online, one-to-one with your
                trainer.
              </p>
              <div className="package-grid">
                {t.packages.map((p) => (
                  <button
                    type="button"
                    key={p.id}
                    className={`package-card ${p.id === packageId ? "popular" : ""}`}
                    aria-pressed={p.id === packageId}
                    onClick={() => {
                      setPackage(p.id);
                      setStart("");
                      setShowAllSlots(false);
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
            </>
          )}

          {step === 1 && (
            <>
              <h2>Choose a real available time.</h2>
              <fieldset className="schedule-picker">
                <legend>Next seven days</legend>
                <div className="schedule-days">
                  {scheduleDays.map((item) => (
                    <button
                      type="button"
                      key={item.key}
                      className={date === item.key ? "selected" : ""}
                      aria-pressed={date === item.key}
                      onClick={() => {
                        setDate(item.key);
                        setStart("");
                        setShowAllSlots(false);
                      }}
                    >
                      <small>{item.day}</small>
                      <strong>{item.date}</strong>
                      <span>{item.month}</span>
                    </button>
                  ))}
                </div>
              </fieldset>
              <p>
                <strong>Times are shown in your device timezone.</strong>
                {t.timezone ? ` Trainer schedule: ${t.timezone}.` : ""}
              </p>
              {loading && <p role="status">Checking live availability…</p>}
              {availabilityError && (
                <p role="alert" className="form-error">
                  {availabilityError}
                </p>
              )}
              <div className="choice-chips booking-time-slots">
                {visibleSlots.map((slot) => (
                  <button
                    type="button"
                    key={slot.start}
                    className={start === slot.start ? "selected" : ""}
                    onClick={() => setStart(slot.start)}
                    title={
                      t.timezone
                        ? `Trainer time: ${new Date(slot.start).toLocaleTimeString("en", { timeZone: t.timezone, hour: "numeric", minute: "2-digit" })}`
                        : undefined
                    }
                  >
                    {new Date(slot.start).toLocaleTimeString(undefined, {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </button>
                ))}
              </div>
              {!showAllSlots && allSlots.length > visibleSlots.length && (
                <button
                  type="button"
                  className="btn outline small"
                  style={{ marginTop: "0.75rem" }}
                  onClick={() => setShowAllSlots(true)}
                >
                  Show more times ({allSlots.length - visibleSlots.length} more)
                </button>
              )}
              {showAllSlots && allSlots.length > 6 && (
                <button
                  type="button"
                  className="text-link small"
                  style={{ marginTop: "0.75rem", display: "inline-block" }}
                  onClick={() => setShowAllSlots(false)}
                >
                  Show fewer times
                </button>
              )}
              {data && !allSlots.length && (
                <p>No open times on this date. Choose another day.</p>
              )}
              {start && (
                <div className="payment-notice">
                  <strong>{localSlot} — your time</strong>
                  {trainerSlot && <p>{trainerSlot} — trainer time</p>}
                </div>
              )}
              <p>
                For multi-session packages, this reserves the first session. You
                can schedule remaining sessions from your dashboard after
                payment approval.
              </p>
            </>
          )}

          {step === 2 && (
            <>
              <h2>Select Payment Method</h2>
              <p>
                Transfer the exact amount to your chosen account below, then submit your
                payer name, transaction ID, and payment screenshot. An admin will verify the transfer
                to confirm your booking.
              </p>
              {paymentMethodsLoading ? (
                <p role="status">Loading payment account details…</p>
              ) : paymentMethodsError ? (
                <div className="empty-state compact" role="alert">
                  <h3>We could not load payment details.</h3>
                  <p>{paymentMethodsError}</p>
                </div>
              ) : (
                <div>
                  <div className="payment-method-cards">
                    <button
                      type="button"
                      className={`package-card ${selectedPaymentMethod === "EASYPAISA" ? "popular" : ""}`}
                      aria-pressed={selectedPaymentMethod === "EASYPAISA"}
                      onClick={() => setPaymentMethod("EASYPAISA")}
                    >
                      <strong>Easypaisa</strong>
                      <span>{easypaisaNumber}</span>
                      <small>Mobile Transfer</small>
                    </button>

                    <button
                      type="button"
                      className={`package-card ${selectedPaymentMethod === "BANK_TRANSFER" ? "popular" : ""}`}
                      aria-pressed={selectedPaymentMethod === "BANK_TRANSFER"}
                      onClick={() => setPaymentMethod("BANK_TRANSFER")}
                    >
                      <strong>Bank Transfer</strong>
                      <span>{bankDetails.accountNumber}</span>
                      <small>{bankDetails.accountName}</small>
                    </button>

                    {Boolean(paymentAccounts?.jazzcash) && (
                      <button
                        type="button"
                        className={`package-card ${selectedPaymentMethod === "JAZZCASH" ? "popular" : ""}`}
                        aria-pressed={selectedPaymentMethod === "JAZZCASH"}
                        onClick={() => setPaymentMethod("JAZZCASH")}
                      >
                        <strong>JazzCash</strong>
                        <span>{paymentAccounts?.jazzcash}</span>
                        <small>Mobile Wallet</small>
                      </button>
                    )}
                  </div>

                  <div
                    className="panel payment-details-card mt-4"
                    style={{
                      background: "rgba(15, 23, 42, 0.6)",
                      borderRadius: "12px",
                      padding: "1.25rem",
                      border: "1px solid rgba(255, 255, 255, 0.12)",
                      marginTop: "1rem",
                      marginBottom: "1rem",
                    }}
                  >
                    {selectedPaymentMethod === "EASYPAISA" && (
                      <div>
                        <h3 style={{ margin: "0 0 1rem 0", color: "#38bdf8", fontSize: "1.1rem" }}>
                          Easypaisa Account Details
                        </h3>
                        <div style={{ display: "grid", gap: "0.75rem" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255, 255, 255, 0.08)", paddingBottom: "0.5rem" }}>
                            <span style={{ color: "#94a3b8" }}>Account Title</span>
                            <strong style={{ color: "#f8fafc" }}>{paymentAccounts?.accountName || "Spotter Training"}</strong>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ color: "#94a3b8" }}>Easypaisa Number</span>
                            <div style={{ display: "flex", alignItems: "center" }}>
                              <strong style={{ color: "#f8fafc", fontFamily: "monospace", fontSize: "1.1rem" }}>
                                {easypaisaNumber}
                              </strong>
                              <CopyButton text={easypaisaNumber} label="Easypaisa Number" />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {selectedPaymentMethod === "BANK_TRANSFER" && (
                      <div>
                        <h3 style={{ margin: "0 0 1rem 0", color: "#38bdf8", fontSize: "1.1rem" }}>
                          Bank Transfer Details
                        </h3>
                        <div style={{ display: "grid", gap: "0.75rem" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255, 255, 255, 0.08)", paddingBottom: "0.5rem" }}>
                            <span style={{ color: "#94a3b8" }}>Account Name</span>
                            <strong style={{ color: "#f8fafc" }}>{bankDetails.accountName}</strong>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255, 255, 255, 0.08)", paddingBottom: "0.5rem" }}>
                            <span style={{ color: "#94a3b8" }}>Account Number</span>
                            <div style={{ display: "flex", alignItems: "center" }}>
                              <strong style={{ color: "#f8fafc", fontFamily: "monospace", fontSize: "1.05rem" }}>
                                {bankDetails.accountNumber}
                              </strong>
                              <CopyButton text={bankDetails.accountNumber} label="Account Number" />
                            </div>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255, 255, 255, 0.08)", paddingBottom: "0.5rem" }}>
                            <span style={{ color: "#94a3b8" }}>IBAN</span>
                            <div style={{ display: "flex", alignItems: "center" }}>
                              <strong style={{ color: "#f8fafc", fontFamily: "monospace", fontSize: "0.92rem" }}>
                                {bankDetails.iban}
                              </strong>
                              <CopyButton text={bankDetails.iban} label="IBAN" />
                            </div>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ color: "#94a3b8" }}>Branch</span>
                            <strong style={{ color: "#f8fafc" }}>{bankDetails.branch}</strong>
                          </div>
                        </div>
                      </div>
                    )}

                    {selectedPaymentMethod === "JAZZCASH" && (
                      <div>
                        <h3 style={{ margin: "0 0 1rem 0", color: "#38bdf8", fontSize: "1.1rem" }}>
                          JazzCash Account Details
                        </h3>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ color: "#94a3b8" }}>JazzCash Number</span>
                          <div style={{ display: "flex", alignItems: "center" }}>
                            <strong style={{ color: "#f8fafc", fontFamily: "monospace", fontSize: "1.1rem" }}>
                              {paymentAccounts?.jazzcash}
                            </strong>
                            <CopyButton text={paymentAccounts?.jazzcash || ""} label="JazzCash Number" />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
              <div className="payment-notice">
                <strong>Pay {money(pkg?.price || 0)}</strong>
                <p>
                  After you submit valid payment proof, Spotter keeps this
                  reservation pending while an admin reviews it.
                </p>
              </div>
              <label className="field">
                Name used for transfer
                <input
                  value={payerName}
                  onChange={(e) => setPayerName(e.target.value)}
                  maxLength={120}
                />
              </label>
              <label className="field">
                Transaction ID
                <input
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                  maxLength={120}
                />
              </label>
              <label className="field">
                Payment screenshot
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp"
                  onChange={(e) => setProof(e.target.files?.[0] || null)}
                />
                <small>JPG, PNG, or WebP up to 4 MB.</small>
              </label>
              <p>
                Cancellation and refund outcomes follow the policy saved with
                your booking.
              </p>
              {state.role === "visitor" ? (
                <Link
                  className="btn"
                  href={`/login?next=${encodeURIComponent(resume)}`}
                >
                  Sign in to finish booking →
                </Link>
              ) : state.role !== "customer" ? (
                <div className="empty-state compact" role="alert">
                  <h3>Customer account required.</h3>
                  <p>
                    Trainer and admin accounts cannot place customer bookings.
                    Sign in with a customer account to continue.
                  </p>
                </div>
              ) : (
                <button
                  type="button"
                  className="btn"
                  aria-busy={busy}
                  disabled={
                    busy ||
                    !selectedPaymentNumber ||
                    !payerName.trim() ||
                    !transactionId.trim() ||
                    !proof ||
                    !start ||
                    !packageId
                  }
                  onClick={async () => {
                    if (busy) return;
                    setBusy(true);
                    setError("");
                    try {
                      let id = orderId;
                      if (!id) {
                        const order = await api<{ _id: string }>("bookings", {
                          packageId,
                          start,
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
                      const uploadResult = await apiResult<{ id: string }>(
                        uploadResponse,
                      );
                      await api(`bookings/${id}/pay`, {
                        method: selectedPaymentMethod,
                        payerName: payerName.trim(),
                        transactionId: transactionId.trim(),
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
                    ? "Submitting payment proof…"
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
                type="button"
                className="btn outline"
                onClick={() => setStep(step - 1)}
                disabled={busy}
              >
                Back
              </button>
            )}
            {step < 2 && (
              <button
                type="button"
                className="btn"
                disabled={
                  !pkg ||
                  (step === 1 &&
                    (!start ||
                      !data?.slots.some((slot) => slot.start === start)))
                }
                onClick={() => setStep(step + 1)}
              >
                Continue →
              </button>
            )}
          </div>
        </section>

        <aside className="panel order-summary premium-order-summary">
          <div className="order-summary-media premium-media-container">
            <Image
              src={t.profileImage || "/media/fallback-trainer-profile.avif"}
              alt={`${t.firstName} ${t.lastName}, your selected trainer`}
              fill
              quality={90}
              className="premium-image"
              sizes="(max-width: 768px) 100vw, 30vw"
            />
          </div>
          <p className="eyebrow">YOUR ONLINE TRAINING PLAN</p>
          <h2>
            {t.firstName} {t.lastName}
          </h2>
          <h3>{pkg?.title || "Select a package"}</h3>
          <p>
            {pkg?.sessions || 0} sessions · {pkg?.duration || 0} minutes
          </p>
          <p>Live online · 1-on-1</p>
          <p>{localSlot}</p>
          {trainerSlot && start && <small>Trainer time: {trainerSlot}</small>}
          <strong className="order-total">{money(pkg?.price || 0)}</strong>
          <p>
            Price, service terms and cancellation policy are snapshotted into
            the booking before payment.
          </p>
          <Link href="/cancellation" className="text-link">
            Cancellation policy →
          </Link>
        </aside>
      </div>
    </div>
  );
}
