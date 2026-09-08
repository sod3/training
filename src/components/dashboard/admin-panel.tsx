"use client";
import { useState } from "react";
import Link from "next/link";
import { api } from "@/lib/client-api";
import { ActionForm, type Field } from "./action-form";
import { amount, date, num, rows, str, type Item } from "./panels";
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
            label: name.replace(/([A-Z])/g, " $1"),
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
      str(trainer, "phone") &&
      str(trainer, "cnic") &&
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
          <span>Trainer</span>
          <strong>{str(trainer, "displayName") || "Unnamed trainer"}</strong>
        </div>
        <div>
          <span>Email</span>
          <strong>{str(account, "normalizedEmail") || "—"}</strong>
        </div>
        <div>
          <span>Phone</span>
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
        onClick={async () => {
          if (
            !window.confirm(
              `Approve ${trainerName || "this trainer"} and publish the profile?`,
            )
          )
            return;
          setBusy(true);
          setMessage("");
          setError("");
          try {
            const result = await api<{ message?: string }>(
              `admin/approve-trainer/${applicationId}`,
              {},
            );
            setMessage(result.message || "Trainer approved and published.");
            onDone();
          } catch (err) {
            setError((err as Error).message);
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
      {taxonomy && (
        <section className="panel">
          <h2>
            Add{" "}
            {section === "content" ? "FAQ" : section === "categories" ? "category" : "specialty"}</h2>
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
        return (
          <article className="panel" key={id}>
            <div className="panel-title">
              <h3>
                {(section === "verification" && str((item.trainer as Item) || {}, "displayName")
                  ? `${str((item.trainer as Item) || {}, "displayName")} · ${str(item, "type") || "credential"}`
                  : str(item, "name") ||
                    str(item, "displayName") ||
                    str(item, "bookingNumber") ||
                    str(item, "title") ||
                    str(item, "subject") ||
                    str(item, "action") ||
                    `${section} · ${id.slice(-8)}`)}
              </h3>
              <span className="status">
                {str(item, "status") ||
                  str(item, "applicationStatus") ||
                  str(item, "verificationStatus") ||
                  str(item, "bookingStatus")}
              </span>
            </div>
            {section === "applications" && <ApplicationReviewSummary item={item} />}
            {section === "verification" && (() => {
              const trainer = (item.trainer as Item) || {};
              const account = (item.account as Item) || {};
              return (
                <div className="admin-verification-summary">
                  <div>
                    <span>Public name</span>
                    <strong>{str(trainer, "displayName") || "—"}</strong>
                  </div>
                  <div>
                    <span>Legal name</span>
                    <strong>{str(trainer, "legalName") || "—"}</strong>
                  </div>
                  <div>
                    <span>Email</span>
                    <strong>{str(account, "normalizedEmail") || "—"}</strong>
                  </div>
                  <div>
                    <span>Phone</span>
                    <strong>{str(trainer, "phone") || str(account, "phone") || "—"}</strong>
                  </div>
                  <div>
                    <span>CNIC</span>
                    <strong>{str(trainer, "cnic") || "—"}</strong>
                  </div>
                  <div>
                    <span>Category</span>
                    <strong>{str(trainer, "category") || "—"}</strong>
                  </div>
                  <div>
                    <span>Application</span>
                    <strong>{str(trainer, "applicationStatus") || "—"}</strong>
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
                  Open submitted evidence
                </a>
                {str((item.trainer as Item) || {}, "cnicUploadId") &&
                  str((item.trainer as Item) || {}, "cnicUploadId") !== str(item, "uploadId") && (
                    <a
                      className="btn outline small"
                      href={`/api/media/${str((item.trainer as Item) || {}, "cnicUploadId")}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open CNIC document
                    </a>
                  )}
              </div>
            )}
            {section === "trainers" && str(item, "cnicUploadId") && (
              <a
                className="btn outline small"
                href={`/api/media/${str(item, "cnicUploadId")}`}
              >
                View CNIC picture
              </a>
            )}
            {section === "payments" && str(item, "proofUploadId") && (
              <a
                className="btn outline small"
                href={`/api/media/${str(item, "proofUploadId")}`}
                target="_blank"
                rel="noreferrer"
              >
                View payment screenshot
              </a>
            )}
            {section === "applications" && (
              <div className="admin-evidence-links">
                {str((item.trainer as Item) || {}, "cnicUploadId") && (
                  <a className="btn outline small" href={`/api/media/${str((item.trainer as Item) || {}, "cnicUploadId")}`} target="_blank" rel="noreferrer">View CNIC document</a>
                )}
                {rows(item.credentials).map((credential) => (
                  <a key={str(credential, "_id")} className="btn outline small" href={`/api/media/${str(credential, "uploadId")}`} target="_blank" rel="noreferrer">
                    {str(credential, "type") === "IDENTITY" ? "Identity evidence" : str(credential, "title") || "Certification"}
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
            {section === "payments" && item.status === "SUBMITTED" && (
              <p>
                Confirm the transfer against your JazzCash or EasyPaisa account
                before approving. Approval confirms the booking.
              </p>
            )}
            {section === "refunds" && item.status === "APPROVED" && (
              <p>
                This marketplace uses manual payments. Send the approved refund through the appropriate payment channel and record the transfer reference for your audit trail.
              </p>
            )}
            {["users", "customers"].includes(section) && str(item, "role") !== "ADMIN" && (
              <PasswordResetControl userId={id} />
            )}
            {fields.length > 0 && (
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
  return (
    <div className="admin-reset-control">
      <button
        className="btn outline small"
        disabled={busy}
        onClick={async () => {
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
        {busy ? "Creating…" : "Create password reset link"}
      </button>
      {message && <small>{message}</small>}
      {resetUrl && (
        <div className="reset-link-box">
          <input readOnly value={resetUrl} aria-label="One-time password reset link" />
          <button className="text-link" onClick={() => navigator.clipboard.writeText(resetUrl)}>Copy</button>
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
  return (
    <dl className="record-details">
      {Object.entries(item)
        .filter(
          ([key, value]) =>
            !hidden.includes(key) &&
            value !== null &&
            value !== undefined &&
            value !== "",
        )
        .map(([key, value]) => (
          <div key={key}>
            <dt>{key.replace(/([A-Z])/g, " $1")}</dt>
            <dd>
              {[
                "amount",
                "total",
                "price",
                "platformFee",
                "trainerAmount",
              ].includes(key) ? (
                amount(value)
              ) : key.endsWith("At") || ["start", "end"].includes(key) ? (
                date(value)
              ) : typeof value === "object" ? (
                Array.isArray(value) &&
                value.every((v) => typeof v !== "object") ? (
                  value.join(", ")
                ) : (
                  <details>
                    <summary>View details</summary>
                    {Array.isArray(value) ? (
                      rows(value).map((r, i) => (
                        <RecordDetails key={i} item={r} />
                      ))
                    ) : (
                      <RecordDetails item={value as Item} />
                    )}
                  </details>
                )
              ) : typeof value === "boolean" ? (
                value ? (
                  "Yes"
                ) : (
                  "No"
                )
              ) : (
                String(value)
              )}
            </dd>
          </div>
        ))}
    </dl>
  );
}
