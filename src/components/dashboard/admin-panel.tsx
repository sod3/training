"use client";
import Link from "next/link";
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
export function AdminPanel({
  section,
  items,
  reload,
}: {
  section: string;
  items: Item[];
  reload: () => void;
}) {
  const taxonomy = ["specialties", "locations", "content"].includes(section);
  const taxonomyFields = (item: Item): Field[] => [
    { name: "name", label: "Name", value: str(item, "name"), required: true },
    {
      name: "slug",
      label: "Unique slug",
      value: str(item, "slug"),
      required: true,
    },
    { name: "city", label: "City", value: str(item, "city") },
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
            {section === "content"
              ? "FAQ"
              : section === "locations"
                ? "location"
                : "specialty"}
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
        if (section === "applications")
          fields = [
            {
              name: "status",
              label: "Decision",
              type: "select",
              options: [
                "UNDER_REVIEW",
                "ACTION_REQUIRED",
                "APPROVED",
                "REJECTED",
              ],
            },
            {
              name: "notes",
              label: "Reason / feedback for trainer",
              type: "textarea",
              required: true,
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
              options: ["PRIVATE", "PUBLIC"],
              value: str(item, "profileVisibility"),
            },
          ];
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
        if (taxonomy) fields = taxonomyFields(item);
        if (section === "refunds") label = "Approve refund";
        return (
          <article className="panel" key={id}>
            <div className="panel-title">
              <h3>
                {str(item, "name") ||
                  str(item, "displayName") ||
                  str(item, "bookingNumber") ||
                  str(item, "title") ||
                  str(item, "subject") ||
                  str(item, "action") ||
                  `${section} · ${id.slice(-8)}`}
              </h3>
              <span className="status">
                {str(item, "status") ||
                  str(item, "applicationStatus") ||
                  str(item, "verificationStatus") ||
                  str(item, "bookingStatus")}
              </span>
            </div>
            <RecordDetails item={item} />
            {section === "verification" && (
              <a
                className="btn outline small"
                href={`/api/media/${str(item, "uploadId")}`}
              >
                Download private evidence
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
              <Link className="text-link" href="/admin/verification">
                Review credential evidence →
              </Link>
            )}
            {section === "payments" && item.status === "SUBMITTED" && (
              <p>
                Confirm the transfer against your JazzCash or EasyPaisa account
                before approving. Approval confirms the booking.
              </p>
            )}
            {section === "refunds" && item.status === "APPROVED" && (
              <p>
                Issue the approved amount in Safepay. The signed refund webhook
                will reconcile the payment and ledger.
              </p>
            )}
            {(fields.length > 0 ||
              (section === "refunds" && item.status === "REQUESTED")) && (
              <details className="mt-5">
                <summary>Manage record</summary>
                <ActionForm
                  endpoint={endpoint}
                  fields={fields}
                  label={label}
                  onDone={reload}
                  confirmation="Save this administrative change? It will be recorded in the audit log."
                />
              </details>
            )}
          </article>
        );
      })}
    </>
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
