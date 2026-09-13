"use client";
import { useState } from "react";
import Link from "next/link";
import { api } from "@/lib/client-api";
import { useStore } from "@/components/marketplace/store";
import { ActionForm, type Field } from "./action-form";
import { amount, date, num, rows, str, type Item } from "./panels";
import { formatFieldLabel, isIdKey, isLongIdValue, truncateId } from "@/lib/admin-formatters";
import { IdCopyChip } from "@/components/ui/id-copy-chip";

export function AdminSubNav({ section }: { section: string }) {
  const usersSections = ["users", "customers", "trainers", "applications", "verification"];
  const bookingsSections = ["bookings", "payments", "refunds", "payouts"];
  const operationsSections = ["categories", "specialties", "content", "sessions", "reviews", "support", "audit-logs"];

  if (usersSections.includes(section)) {
    const tabs = [
      { key: "users", label: "All Users", href: "/admin/users" },
      { key: "customers", label: "Customers", href: "/admin/customers" },
      { key: "trainers", label: "Trainers", href: "/admin/trainers" },
      { key: "applications", label: "Applications", href: "/admin/applications" },
      { key: "verification", label: "Verifications", href: "/admin/verification" },
    ];
    return (
      <div className="admin-subnav-bar mb-6">
        <span className="admin-subnav-title">Users & Verification</span>
        <div className="admin-subnav-pills">
          {tabs.map((tab) => (
            <Link
              key={tab.key}
              href={tab.href}
              className={`admin-subnav-pill ${section === tab.key ? "active" : ""}`}
            >
              {tab.label}
            </Link>
          ))}
        </div>
      </div>
    );
  }

  if (bookingsSections.includes(section)) {
    const tabs = [
      { key: "bookings", label: "All Bookings", href: "/admin/bookings" },
      { key: "payments", label: "Pending Payments & Proof", href: "/admin/payments" },
      { key: "refunds", label: "Refund Requests", href: "/admin/refunds" },
      { key: "payouts", label: "Trainer Payouts", href: "/admin/payouts" },
    ];
    return (
      <div className="admin-subnav-bar mb-6">
        <span className="admin-subnav-title">Bookings & Payments</span>
        <div className="admin-subnav-pills">
          {tabs.map((tab) => (
            <Link
              key={tab.key}
              href={tab.href}
              className={`admin-subnav-pill ${section === tab.key ? "active" : ""}`}
            >
              {tab.label}
            </Link>
          ))}
        </div>
      </div>
    );
  }

  if (operationsSections.includes(section)) {
    const tabs = [
      { key: "categories", label: "Catalog (Categories)", href: "/admin/categories" },
      { key: "specialties", label: "Specialties", href: "/admin/specialties" },
      { key: "content", label: "FAQ & Content", href: "/admin/content" },
      { key: "sessions", label: "Sessions", href: "/admin/sessions" },
      { key: "reviews", label: "Reviews Moderation", href: "/admin/reviews" },
      { key: "support", label: "Support Tickets", href: "/admin/support" },
      { key: "audit-logs", label: "Audit Logs", href: "/admin/audit-logs" },
    ];
    return (
      <div className="admin-subnav-bar mb-6">
        <span className="admin-subnav-title">Operations & Catalog</span>
        <div className="admin-subnav-pills">
          {tabs.map((tab) => (
            <Link
              key={tab.key}
              href={tab.href}
              className={`admin-subnav-pill ${section === tab.key ? "active" : ""}`}
            >
              {tab.label}
            </Link>
          ))}
        </div>
      </div>
    );
  }

  return null;
}

export function StatusBadge({ status }: { status: string }) {
  if (!status) return null;
  const s = status.toUpperCase();
  const formatted = status.replace(/_/g, " ");

  if (
    [
      "SUBMITTED",
      "PENDING",
      "PENDING_PAYMENT",
      "REQUESTED",
      "UNDER_REVIEW",
      "ACTION_REQUIRED",
      "PROCESSING",
      "IN_PROGRESS",
      "OPEN",
    ].includes(s)
  ) {
    return (
      <span className="admin-badge badge-pending">
        <span className="badge-dot dot-pending" aria-hidden="true" />
        {formatted}
      </span>
    );
  }

  if (
    [
      "APPROVED",
      "PAID",
      "ACTIVE",
      "CONFIRMED",
      "COMPLETED",
      "VISIBLE",
      "PUBLIC",
      "REFUNDED",
    ].includes(s)
  ) {
    return (
      <span className="admin-badge badge-approved">
        <span className="badge-dot dot-approved" aria-hidden="true" />
        {formatted}
      </span>
    );
  }

  if (
    [
      "REJECTED",
      "DISABLED",
      "SUSPENDED",
      "CANCELLED",
      "HIDDEN",
      "FLAGGED",
      "NO_SHOW",
    ].includes(s)
  ) {
    return (
      <span className="admin-badge badge-rejected">
        <span className="badge-dot dot-rejected" aria-hidden="true" />
        {formatted}
      </span>
    );
  }

  return (
    <span className="admin-badge badge-neutral">
      <span className="badge-dot dot-neutral" aria-hidden="true" />
      {formatted}
    </span>
  );
}

export function AdminSettings({
  settings,
  reload,
}: {
  settings: Item;
  reload: () => void;
}) {
  return (
    <section className="panel">
      <h2>Marketplace settings</h2>
      <ActionForm
        endpoint="admin/settings"
        fields={[
          {
            name: "platformName",
            label: "Platform name",
            value: str(settings, "platformName"),
            required: true,
          },
          {
            name: "supportEmail",
            label: "Support email",
            type: "email",
            value: str(settings, "supportEmail"),
            required: true,
          },
          {
            name: "defaultTimezone",
            label: "Default timezone",
            value: str(settings, "defaultTimezone"),
          },
          ...[
            "commissionBps",
            "cancellationWindowHours",
            "minimumBookingNoticeHours",
            "maximumAdvanceBookingDays",
            "holdMinutes",
          ].map((name) => ({
            name,
            label: formatFieldLabel(name),
            type: "number" as const,
            value: num(settings, name),
            hint:
              name === "commissionBps"
                ? "100 basis points = 1%. Changes apply to new purchases."
                : undefined,
          })),
          {
            name: "trainerApplicationEnabled",
            label: "Accept trainer applications",
            type: "checkbox",
            value: !!settings.trainerApplicationEnabled,
          },
          {
            name: "maintenanceMode",
            label: "Pause new bookings",
            type: "checkbox",
            value: !!settings.maintenanceMode,
          },
        ]}
        confirmation="Apply these marketplace settings to future activity?"
        onDone={reload}
      />
    </section>
  );
}

function ApplicationReviewSummary({ item }: { item: Item }) {
  const trainer = (item.trainer as Item) || {};
  const account = (item.account as Item) || {};
  const credentials = rows(item.credentials);
  const packages = rows(item.packages);
  const availability = rows(item.availability);
  const [now] = useState(() => Date.now());

  const identityReady = credentials.some(
    (credential) =>
      str(credential, "type") === "IDENTITY" && str(credential, "uploadId"),
  );
  const certificationReady = credentials.some((credential) => {
    if (
      str(credential, "type") !== "CERTIFICATION" ||
      !str(credential, "uploadId")
    )
      return false;
    const expiry = str(credential, "expiryDate");
    return !expiry || new Date(expiry).getTime() > now;
  });
  const profileReady = Boolean(
    str(trainer, "displayName") &&
      str(trainer, "headline") &&
      str(trainer, "biography").length >= 100 &&
      str(trainer, "profileImage") &&
      str(trainer, "cnicUploadId"),
  );
  const packageReady = packages.some((pkg) => pkg.active !== false);
  const availabilityReady = availability.some((slot) => slot.active !== false);
  const accountReady = str(account, "status") === "ACTIVE";

  const checks = [
    ["Profile", profileReady],
    ["Identity", identityReady],
    ["Certification", certificationReady],
    ["Package", packageReady],
    ["Availability", availabilityReady],
    ["Account", accountReady],
  ] as const;

  return (
    <div className="admin-application-review">
      <div className="admin-applicant-summary">
        <div>
          <span>Trainer Name</span>
          <strong>{str(trainer, "displayName") || "Unnamed trainer"}</strong>
        </div>
        <div>
          <span>Email Address</span>
          <strong>{str(account, "normalizedEmail") || "—"}</strong>
        </div>
        <div>
          <span>Phone Number</span>
          <strong>{str(trainer, "phone") || str(account, "phone") || "—"}</strong>
        </div>
        <div>
          <span>Category</span>
          <strong>{str(trainer, "category") || "—"}</strong>
        </div>
      </div>
      <div className="admin-approval-checks" aria-label="Approval readiness">
        {checks.map(([label, ready]) => (
          <span className={ready ? "ready" : "missing"} key={label}>
            <i aria-hidden="true">{ready ? "✓" : "!"}</i>
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

function QuickApproveTrainer({
  applicationId,
  trainerName,
  onDone,
}: {
  applicationId: string;
  trainerName: string;
  onDone: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const { confirmModal, notify } = useStore();

  return (
    <div className="admin-quick-approve">
      <div>
        <strong>Ready to approve?</strong>
        <p>
          One click verifies the submitted identity/certification evidence,
          approves availability and publishes the trainer profile.
        </p>
      </div>
      <button
        type="button"
        className="btn lime admin-approve-button"
        disabled={busy}
        aria-busy={busy}
        onClick={async () => {
          if (busy) return;
          const confirmed = await confirmModal({
            title: "Approve & Publish Trainer",
            description: `Approve ${trainerName || "this trainer"} and publish their profile live on the marketplace?`,
            confirmText: "Approve Trainer",
            cancelText: "Cancel",
            variant: "lime",
            icon: "shield",
          });
          if (!confirmed) return;
          setBusy(true);
          setMessage("");
          setError("");
          try {
            const result = await api<{ message?: string }>(
              `admin/approve-trainer/${applicationId}`,
              {},
            );
            const msg = result.message || "Trainer approved and published.";
            setMessage(msg);
            notify(msg, "success");
            onDone();
          } catch (err) {
            const errMsg = (err as Error).message;
            setError(errMsg);
            notify(errMsg, "error");
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? "Approving…" : "Approve trainer"}
      </button>
      {message && <p className="admin-action-success">{message}</p>}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

function QuickPaymentReview({
  paymentId,
  onDone,
}: {
  paymentId: string;
  onDone: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const { confirmModal, notify } = useStore();

  const handleDecision = async (decision: "APPROVE" | "REJECT") => {
    if (busy) return;
    if (decision === "APPROVE") {
      const confirmed = await confirmModal({
        title: "Approve Payment Verification",
        description: "Confirm bank transfer verification and approve this payment? This will confirm the booking.",
        confirmText: "Approve Payment",
        cancelText: "Cancel",
        variant: "lime",
        icon: "check",
      });
      if (!confirmed) return;
    }
    if (decision === "REJECT" && !notes.trim()) {
      const errMsg = "Please provide a reason for rejecting the payment.";
      setError(errMsg);
      notify(errMsg, "error");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api(`admin/payments/${paymentId}`, {
        decision,
        notes: decision === "REJECT" ? notes : undefined,
      });
      notify(
        decision === "APPROVE"
          ? "Payment approved and booking confirmed."
          : "Payment rejected.",
        decision === "APPROVE" ? "success" : "info",
      );
      onDone();
    } catch (err) {
      const errMsg = (err as Error).message;
      setError(errMsg);
      notify(errMsg, "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="admin-quick-payment-actions mt-4 pt-3 border-t">
      {!showRejectForm ? (
        <div className="admin-payment-btn-group flex gap-3">
          <button
            type="button"
            className="btn lime small admin-approve-payment-btn"
            disabled={busy}
            onClick={() => handleDecision("APPROVE")}
          >
            {busy ? "Approving…" : "✓ Approve Payment"}
          </button>
          <button
            type="button"
            className="btn outline small btn-danger-text"
            disabled={busy}
            onClick={() => setShowRejectForm(true)}
          >
            ✕ Reject Payment
          </button>
        </div>
      ) : (
        <div className="admin-reject-box p-3 bg-red-50/50 rounded-md border border-red-200">
          <label className="field">
            <span className="font-semibold text-red-900">Rejection Reason / Feedback</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g., Transfer screenshot is unreadable or transaction reference ID does not match our bank account statement."
              rows={2}
              className="mt-1"
            />
          </label>
          <div className="admin-reject-actions flex gap-2 mt-2">
            <button
              type="button"
              className="btn danger small"
              disabled={busy}
              onClick={() => handleDecision("REJECT")}
            >
              {busy ? "Rejecting…" : "Confirm Rejection"}
            </button>
            <button
              type="button"
              className="btn outline small"
              onClick={() => {
                setShowRejectForm(false);
                setError("");
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      {error && <p className="form-error mt-2">{error}</p>}
    </div>
  );
}

export function AdminPanel({
  section,
  items,
  reload,
}: {
  section: string;
  items: Item[];
  reload: () => void;
}) {
  const taxonomy = ["categories", "specialties", "content"].includes(section);
  const taxonomyFields = (item: Item): Field[] => [
    { name: "name", label: "Name", value: str(item, "name"), required: true },
    {
      name: "slug",
      label: "Unique slug",
      value: str(item, "slug"),
      required: true,
    },
    { name: "body", label: "Text", type: "textarea", value: str(item, "body") },
    {
      name: "active",
      label: "Active",
      type: "checkbox",
      value: item.active !== false,
    },
    {
      name: "sortOrder",
      label: "Display order",
      type: "number",
      value: num(item, "sortOrder"),
    },
  ];

  return (
    <>
      <AdminSubNav section={section} />
      {taxonomy && (
        <section className="panel mb-6">
          <h2>
            Add{" "}
            {section === "content" ? "FAQ" : section === "categories" ? "category" : "specialty"}
          </h2>
          <ActionForm
            endpoint={`admin/${section}`}
            fields={taxonomyFields({})}
            onDone={reload}
          />
        </section>
      )}
      {items.map((item) => {
        const id = str(item, "_id");
        const publicationBlockers = [
          str(item, "applicationStatus") !== "APPROVED" && "application approval",
          str(item, "identityVerificationStatus") !== "APPROVED" && "identity verification",
          str(item, "credentialVerificationStatus") !== "APPROVED" && "credential verification",
        ].filter(Boolean) as string[];
        const canPublish = publicationBlockers.length === 0;
        let fields: Field[] = [];
        let endpoint = `admin/${section}/${id}`;
        let label = "Save changes";
        if (["users", "customers"].includes(section)) {
          endpoint = `admin/users/${id}`;
          fields = [
            {
              name: "status",
              label: "Account status",
              type: "select",
              options: ["ACTIVE", "SUSPENDED", "DISABLED"],
              value: str(item, "status"),
            },
          ];
        }
        if (section === "applications" && str(item, "status") !== "APPROVED")
          fields = [
            {
              name: "status",
              label: "Advanced decision",
              type: "select",
              options: ["UNDER_REVIEW", "ACTION_REQUIRED", "REJECTED"],
              value: str(item, "status") === "SUBMITTED" ? "UNDER_REVIEW" : str(item, "status"),
            },
            {
              name: "notes",
              label: "Reason / feedback for trainer",
              type: "textarea",
              required: true,
              hint: "Use advanced review only when you are not approving the trainer.",
            },
          ];
        if (section === "verification")
          fields = [
            {
              name: "status",
              label: "Credential decision",
              type: "select",
              options: ["APPROVED", "REJECTED"],
            },
            {
              name: "notes",
              label: "Review notes",
              type: "textarea",
              required: true,
            },
          ];
        if (section === "trainers")
          fields = [
            {
              name: "featured",
              label: "Featured trainer",
              type: "checkbox",
              value: !!item.featured,
            },
            {
              name: "profileVisibility",
              label: "Visibility",
              type: "select",
              options: canPublish ? ["PRIVATE", "PUBLIC"] : ["PRIVATE"],
              value: canPublish ? str(item, "profileVisibility") : "PRIVATE",
              hint: canPublish
                ? "This trainer has completed every publication prerequisite."
                : `Public visibility unlocks after: ${publicationBlockers.join(", ")}.`,
            },
            {
              name: "availabilityReviewStatus",
              label: "Availability review",
              type: "select",
              options: ["APPROVED", "UNDER_REVIEW"],
              value: str(item, "availabilityReviewStatus") || "APPROVED",
            },
            {
              name: "availabilityReviewNotes",
              label: "Availability review notes",
              type: "textarea",
              value: str(item, "availabilityReviewNotes"),
            },
          ];
        if (section === "trainers") label = "Save trainer";
        if (section === "reviews")
          fields = [
            {
              name: "status",
              label: "Visibility",
              type: "select",
              options: ["VISIBLE", "HIDDEN", "FLAGGED"],
              value: str(item, "status"),
            },
          ];
        if (section === "support")
          fields = [
            {
              name: "status",
              label: "Status",
              type: "select",
              options: ["OPEN", "IN_PROGRESS", "CLOSED"],
              value: str(item, "status"),
            },
          ];
        if (section === "payouts")
          fields = [
            {
              name: "status",
              label: "Payout status",
              type: "select",
              options: ["PROCESSING", "PAID", "REJECTED"],
            },
            {
              name: "reference",
              label: "Bank transfer reference or rejection reason",
              required: true,
            },
          ];
        if (section === "payments" && str(item, "status") === "SUBMITTED")
          fields = [
            {
              name: "decision",
              label: "Decision",
              type: "select",
              options: ["APPROVE", "REJECT"],
              required: true,
            },
            {
              name: "notes",
              label: "Review notes",
              type: "textarea",
              hint: "Add a reason when rejecting a payment.",
            },
          ];
        if (section === "refunds" && str(item, "status") === "REQUESTED") {
          label = "Review refund request";
          fields = [
            { name: "decision", label: "Decision", type: "select", options: ["APPROVE", "REJECT"], required: true },
            { name: "notes", label: "Review notes", type: "textarea", hint: "A reason is required when rejecting." },
          ];
        }
        if (section === "refunds" && str(item, "status") === "APPROVED") {
          label = "Record manual refund";
          fields = [
            { name: "decision", label: "Action", type: "select", options: ["MARK_REFUNDED"], required: true, value: "MARK_REFUNDED" },
            { name: "reference", label: "JazzCash / EasyPaisa refund reference", required: true },
            { name: "notes", label: "Internal notes", type: "textarea" },
          ];
        }
        if (taxonomy) fields = taxonomyFields(item);

        const currentStatus =
          str(item, "status") ||
          str(item, "applicationStatus") ||
          str(item, "verificationStatus") ||
          str(item, "bookingStatus");

        const rawId = str(item, "bookingNumber") || id;
        const mainTitleText =
          section === "verification" && str((item.trainer as Item) || {}, "displayName")
            ? `${str((item.trainer as Item) || {}, "displayName")} · ${str(item, "type") || "credential"}`
            : str(item, "name") ||
              str(item, "displayName") ||
              str(item, "title") ||
              str(item, "subject") ||
              str(item, "action") ||
              (str(item, "bookingNumber")
                ? `Booking ${truncateId(str(item, "bookingNumber"))}`
                : `${formatFieldLabel(section)} Record`);

        return (
          <article className="panel admin-record-card" key={id}>
            <div className="panel-title flex flex-wrap justify-between items-center pb-3 mb-4 border-b border-slate-200 dark:border-zinc-700/60 gap-2">
              <div className="flex flex-wrap items-center gap-2.5 min-w-0 flex-1">
                <h3 className="text-base font-bold text-slate-900 dark:text-zinc-100 tracking-tight">
                  {mainTitleText}
                </h3>
                {rawId && <IdCopyChip value={rawId} />}
              </div>
              <StatusBadge status={currentStatus} />
            </div>

            {section === "applications" && <ApplicationReviewSummary item={item} />}
            {section === "verification" && (() => {
              const trainer = (item.trainer as Item) || {};
              const account = (item.account as Item) || {};
              return (
                <div className="admin-verification-summary">
                  <div>
                    <span>Public Display Name</span>
                    <strong>{str(trainer, "displayName") || "—"}</strong>
                  </div>
                  <div>
                    <span>Email Address</span>
                    <strong>{str(account, "normalizedEmail") || "—"}</strong>
                  </div>
                  <div>
                    <span>Category</span>
                    <strong>{str(trainer, "category") || "—"}</strong>
                  </div>
                  <div>
                    <span>Application Status</span>
                    <StatusBadge status={str(trainer, "applicationStatus")} />
                  </div>
                </div>
              );
            })()}

            {section !== "applications" && <RecordDetails item={item} />}
            {section === "applications" && (
              <details className="admin-application-details">
                <summary>View full application details</summary>
                <RecordDetails item={item} />
              </details>
            )}

            {section === "verification" && (
              <div className="admin-evidence-links">
                <a
                  className="btn outline small"
                  href={`/api/media/${str(item, "uploadId")}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open submitted evidence ↗
                </a>
                {str((item.trainer as Item) || {}, "cnicUploadId") &&
                  str((item.trainer as Item) || {}, "cnicUploadId") !== str(item, "uploadId") && (
                    <a
                      className="btn outline small"
                      href={`/api/media/${str((item.trainer as Item) || {}, "cnicUploadId")}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open CNIC document ↗
                    </a>
                  )}
              </div>
            )}
            {section === "trainers" && str(item, "cnicUploadId") && (
              <a
                className="btn outline small"
                href={`/api/media/${str(item, "cnicUploadId")}`}
                target="_blank"
                rel="noreferrer"
              >
                View CNIC picture ↗
              </a>
            )}

            {section === "payments" && str(item, "proofUploadId") && (
              <div className="admin-proof-preview-container my-4 p-3 bg-gray-50 dark:bg-zinc-800/50 rounded-lg border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    📷 Transfer Screenshot / Proof
                  </span>
                  <a
                    className="text-link text-xs"
                    href={`/api/media/${str(item, "proofUploadId")}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    View Full Resolution ↗
                  </a>
                </div>
                <div className="admin-proof-thumbnail-wrapper">
                  <a
                    href={`/api/media/${str(item, "proofUploadId")}`}
                    target="_blank"
                    rel="noreferrer"
                    title="Click to expand full resolution screenshot"
                  >
                    <img
                      src={`/api/media/${str(item, "proofUploadId")}`}
                      alt="Payment transfer proof screenshot"
                      className="admin-proof-img"
                    />
                  </a>
                </div>
              </div>
            )}

            {section === "applications" && (
              <div className="admin-evidence-links">
                {str((item.trainer as Item) || {}, "cnicUploadId") && (
                  <a className="btn outline small" href={`/api/media/${str((item.trainer as Item) || {}, "cnicUploadId")}`} target="_blank" rel="noreferrer">View CNIC document ↗</a>
                )}
                {rows(item.credentials).map((credential) => (
                  <a key={str(credential, "_id")} className="btn outline small" href={`/api/media/${str(credential, "uploadId")}`} target="_blank" rel="noreferrer">
                    {str(credential, "type") === "IDENTITY" ? "Identity evidence ↗" : `${str(credential, "title") || "Certification"} ↗`}
                  </a>
                ))}
                <Link className="text-link" href="/admin/verification">Review all credential evidence →</Link>
              </div>
            )}

            {section === "applications" && str(item, "status") !== "APPROVED" && (
              <QuickApproveTrainer
                applicationId={id}
                trainerName={str((item.trainer as Item) || {}, "displayName")}
                onDone={reload}
              />
            )}

            {section === "payments" && str(item, "status") === "SUBMITTED" && (
              <QuickPaymentReview paymentId={id} onDone={reload} />
            )}

            {section === "refunds" && item.status === "APPROVED" && (
              <p className="admin-notice-box mt-3 text-sm text-amber-700 bg-amber-50 p-3 rounded border border-amber-200">
                This marketplace uses manual payments. Send the approved refund through JazzCash / EasyPaisa and record the transfer reference string below for your audit trail.
              </p>
            )}

            {["users", "customers"].includes(section) && str(item, "role") !== "ADMIN" && (
              <PasswordResetControl userId={id} />
            )}

            {fields.length > 0 && section !== "payments" && (
              <div className="mt-5">
                {section === "trainers" && (
                  <p className="muted">
                    {canPublish
                      ? "Application, identity, and certification checks are approved."
                      : `This profile must remain private until ${publicationBlockers.join(", ")} ${publicationBlockers.length === 1 ? "is" : "are"} complete.`}
                  </p>
                )}
                {section === "applications" ? (
                  <details className="admin-advanced-review">
                    <summary>Advanced review options</summary>
                    <ActionForm
                      endpoint={endpoint}
                      fields={fields}
                      label="Save review decision"
                      onDone={reload}
                      confirmation="Save this review decision?"
                    />
                  </details>
                ) : (
                  <ActionForm
                    endpoint={endpoint}
                    fields={fields}
                    label={label}
                    onDone={reload}
                    confirmation="Save this administrative change? It will be recorded in the audit log."
                  />
                )}
              </div>
            )}
          </article>
        );
      })}
    </>
  );
}

function PasswordResetControl({ userId }: { userId: string }) {
  const [busy, setBusy] = useState(false);
  const [resetUrl, setResetUrl] = useState("");
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);
  return (
    <div className="admin-reset-control mt-3 pt-3 border-t">
      <button
        type="button"
        className="btn outline small"
        disabled={busy}
        aria-busy={busy}
        onClick={async () => {
          if (busy) return;
          setBusy(true);
          setMessage("");
          try {
            const result = await api<{ message: string; resetUrl: string }>(`admin/password-resets/${userId}`, {});
            setMessage(result.message);
            setResetUrl(result.resetUrl);
          } catch (error) {
            setMessage((error as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? "Creating…" : "🔑 Create password reset link"}
      </button>
      {message && <small className="muted" style={{ display: "block", marginTop: "0.25rem" }}>{message}</small>}
      {resetUrl && (
        <div className="reset-link-box mt-2 flex gap-2 items-center">
          <input readOnly value={resetUrl} aria-label="One-time password reset link" className="flex-1 text-xs" />
          <button
            type="button"
            className="btn outline small"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(resetUrl);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              } catch {}
            }}
          >
            {copied ? "Copied! ✓" : "Copy"}
          </button>
        </div>
      )}
    </div>
  );
}

export function RecordDetails({ item }: { item: Item }) {
  const hidden = [
    "__v",
    "_id",
    "updatedAt",
    "revision",
    "passwordHash",
    "sessionVersion",
    "checkoutUrl",
    "requestHash",
    "idempotencyKey",
  ];

  const entries = Object.entries(item).filter(
    ([key, value]) =>
      !hidden.includes(key) &&
      value !== null &&
      value !== undefined &&
      value !== "",
  );

  if (!entries.length) return null;

  return (
    <div className="admin-record-details-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 my-4">
      {entries.map(([key, value]) => {
        const label = formatFieldLabel(key);
        const strVal = String(value ?? "");

        const isStatusField =
          key.toLowerCase().endsWith("status") ||
          key === "status" ||
          key === "profileVisibility";

        let content: React.ReactNode;

        if (isStatusField && typeof value === "string") {
          content = <StatusBadge status={strVal} />;
        } else if (
          isIdKey(key) ||
          isLongIdValue(value) ||
          ["_id", "id", "customerId", "trainerId", "packageId", "bookingNumber", "cnicUploadId", "proofUploadId", "uploadId"].includes(key)
        ) {
          content = <IdCopyChip value={strVal} />;
        } else if (
          ["amount", "total", "price", "platformFee", "trainerAmount"].includes(key)
        ) {
          content = (
            <span className="font-semibold text-slate-900 dark:text-zinc-100 text-sm">
              {amount(value)}
            </span>
          );
        } else if (key.endsWith("At") || key.endsWith("Date") || ["start", "end"].includes(key)) {
          content = (
            <span className="text-slate-700 dark:text-zinc-300 font-medium">
              {date(value)}
            </span>
          );
        } else if (typeof value === "boolean") {
          content = (
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                value
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                  : "bg-slate-100 text-slate-600 border border-slate-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700"
              }`}
            >
              {value ? "Yes" : "No"}
            </span>
          );
        } else if (typeof value === "object") {
          if (Array.isArray(value) && value.every((v) => typeof v !== "object")) {
            content = (
              <div className="flex flex-wrap gap-1 mt-0.5">
                {value.map((v, i) => (
                  <span key={i} className="px-2 py-0.5 bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 rounded text-[11px] font-medium border border-slate-200 dark:border-zinc-700">
                    {String(v)}
                  </span>
                ))}
              </div>
            );
          } else {
            content = (
              <details className="admin-nested-details w-full mt-1">
                <summary className="cursor-pointer text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline inline-flex items-center gap-1">
                  View {label} Details
                </summary>
                <div className="mt-2 p-3 bg-white dark:bg-zinc-900/80 rounded-lg border border-slate-200 dark:border-zinc-700/60 shadow-sm">
                  {Array.isArray(value) ? (
                    rows(value).map((r, i) => (
                      <RecordDetails key={i} item={r} />
                    ))
                  ) : (
                    <RecordDetails item={value as Item} />
                  )}
                </div>
              </details>
            );
          }
        } else if (key === "meetingUrl" || key.endsWith("Url")) {
          content = (
            <a
              href={strVal}
              target="_blank"
              rel="noreferrer"
              className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:underline inline-flex items-center gap-1"
            >
              Open Link ↗
            </a>
          );
        } else {
          content = <span className="text-slate-800 dark:text-zinc-200">{strVal}</span>;
        }

        return (
          <div
            key={key}
            className="admin-detail-card p-3 rounded-lg bg-slate-50/70 dark:bg-zinc-800/40 border border-slate-200/70 dark:border-zinc-700/50 flex flex-col gap-1 min-w-0"
          >
            <span className="admin-detail-label text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
              {label}
            </span>
            <div className="admin-detail-value text-xs text-slate-900 dark:text-zinc-100 font-medium break-words">
              {content}
            </div>
          </div>
        );
      })}
    </div>
  );
}
