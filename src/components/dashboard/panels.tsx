"use client";
import { useEffect, useState } from "react";
import { api, apiResult, useApi } from "@/lib/client-api";
import { ActionForm, UploadForm, type Field } from "./action-form";
import { DEFAULT_CATEGORIES, PREFERRED_TIMES } from "@/lib/catalog";
export type Item = Record<string, unknown>;
export const str = (item: Item, key: string) => String(item[key] ?? "");
export const num = (item: Item, key: string) => Number(item[key] || 0);
export const record = (value: unknown): Item =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Item)
    : {};
export const rows = (value: unknown): Item[] =>
  Array.isArray(value) ? value.map(record) : [];
const availabilityRows = (value: unknown): Item[] =>
  rows(value).map((rule) => ({
    dayOfWeek:
      Number.isInteger(Number(rule.dayOfWeek)) &&
      Number(rule.dayOfWeek) >= 0 &&
      Number(rule.dayOfWeek) <= 6
        ? Number(rule.dayOfWeek)
        : 1,
    startTime: /^([01]\d|2[0-3]):[0-5]\d$/.test(String(rule.startTime ?? ""))
      ? rule.startTime
      : "09:00",
    endTime: /^([01]\d|2[0-3]):[0-5]\d$/.test(String(rule.endTime ?? ""))
      ? rule.endTime
      : "17:00",
  }));
export const amount = (value: unknown) =>
  new Intl.NumberFormat("en-PK", { style: "currency", currency: "PKR" }).format(
    Number(value || 0) / 100,
  );
export const date = (value: unknown) =>
  value
    ? new Date(String(value)).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "—";

export function ProfilePanel({
  data,
  role,
  reload,
}: {
  data: Item;
  role: string;
  reload: () => void;
}) {
  const profile = record(data.profile);
  const preferences = record(data.preferences);
  const trainer = record(data.trainer);
  const fields: Field[] = [
    {
      name: "firstName",
      label: "First name",
      value: str(profile, "firstName"),
      required: true,
    },
    {
      name: "lastName",
      label: "Last name",
      value: str(profile, "lastName"),
      required: true,
    },
    { name: "phone", label: "Phone", value: str(profile, "phone") },
  ];
  if (role === "customer")
    fields.push(
      {
        name: "fitnessGoals",
        label: "Fitness goals",
        type: "checkbox-group",
        options: [...DEFAULT_CATEGORIES],
        value: (preferences.fitnessGoals as string[]) || [],
      },
      {
        name: "preferredSchedule",
        label: "Preferred training time",
        type: "select",
        options: [...PREFERRED_TIMES],
        value: str(preferences, "preferredSchedule") || PREFERRED_TIMES[0],
      },
      {
        name: "timezone",
        label: "Timezone",
        value: str(preferences, "timezone") || "Asia/Karachi",
      },
    );
  return (
    <>
      <section className="panel">
        <h2>Your account</h2>
        <ActionForm
          endpoint="account/profile"
          fields={fields}
          onDone={reload}
          transform={(v) => ({
            ...v,
            ...(role === "customer"
              ? {
                  fitnessGoals: v.fitnessGoals,
                }
              : {}),
          })}
        />
        <UploadForm
          purpose="PUBLIC"
          field="avatar"
          currentUrl={str(profile, "avatar")}
          onUploaded={reload}
        />
      </section>
      {role === "trainer" && (
        <section className="panel">
          <h2>Your trainer profile</h2>
          <ActionForm
            endpoint="trainer/profile"
            onDone={reload}
            fields={[
              {
                name: "displayName",
                label: "Professional display name",
                value: str(trainer, "displayName"),
                required: true,
              },
              {
                name: "headline",
                label: "Headline",
                value: str(trainer, "headline"),
                required: true,
              },
              {
                name: "biography",
                label: "Biography",
                type: "textarea",
                value: str(trainer, "biography"),
                required: true,
              },
              {
                name: "yearsExperience",
                label: "Years of experience",
                type: "select",
                options: Array.from({ length: 31 }, (_, i) => String(i)),
                value: String(num(trainer, "yearsExperience")),
              },
              {
                name: "category",
                label: "Main training category",
                type: "select",
                options: (record(data.catalog).categories as string[]) || [],
                value: str(trainer, "category"),
                required: true,
              },
              {
                name: "specialties",
                label: "Specialties",
                type: "checkbox-group",
                options: (record(data.catalog).specialties as string[]) || [],
                value: (trainer.specialties as string[]) || [],
              },
              {
                name: "timezone",
                label: "Timezone",
                value: str(trainer, "timezone") || "Asia/Karachi",
                hint: "Use a valid IANA timezone, for example Asia/Karachi or Europe/London.",
              },
            ]}
            transform={(v) => ({
              ...v,
              yearsExperience: Number(v.yearsExperience),
              specialties: v.specialties,
              trainingGoals: [String(v.category)],
            })}
          />
          <UploadForm
            purpose="PUBLIC"
            field="profileImage"
            currentUrl={str(trainer, "profileImage")}
            onUploaded={reload}
          />
          <UploadForm
            purpose="PUBLIC"
            field="coverImage"
            currentUrl={str(trainer, "coverImage")}
            onUploaded={reload}
          />
        </section>
      )}
    </>
  );
}
export function PackagesPanel({
  items,
  reload,
}: {
  items: Item[];
  reload: () => void;
}) {
  const [edit, setEdit] = useState<Item>({});
  const id = str(edit, "_id");
  return (
    <>
      <section className="panel">
        <h2>{id ? "Edit package" : "Create a package"}</h2>
        <ActionForm
          key={id}
          endpoint={`trainer/packages${id ? `/${id}` : ""}`}
          onDone={() => {
            setEdit({});
            reload();
          }}
          fields={[
            {
              name: "name",
              label: "Package name",
              value: str(edit, "name"),
              required: true,
            },
            {
              name: "description",
              label: "Description",
              type: "textarea",
              value: str(edit, "description"),
              required: true,
            },
            {
              name: "sessionCount",
              label: "Number of sessions",
              type: "number",
              value: num(edit, "sessionCount") || 1,
              min: 1,
              max: 100,
            },
            {
              name: "sessionDuration",
              label: "Minutes per session (multiples of 15)",
              type: "number",
              value: num(edit, "sessionDuration") || 60,
              min: 15,
              max: 180,
              step: 15,
            },
            {
              name: "price",
              label: "Total package price in PKR",
              type: "number",
              value: num(edit, "price") / 100 || 1500,
              min: 100,
            },
            {
              name: "sortOrder",
              label: "Display order",
              type: "number",
              value: num(edit, "sortOrder"),
            },
            {
              name: "trialPackage",
              label: "Trial package",
              type: "checkbox",
              value: !!edit.trialPackage,
            },
            {
              name: "active",
              label: "Available for purchase",
              type: "checkbox",
              value: edit.active !== false,
            },
          ]}
          transform={(v) => ({
            ...v,
            price: Math.round(Number(v.price) * 100),
          })}
        />
      </section>
      {items.map((item) => (
        <article className="panel" key={str(item, "_id")}>
          <h3>{str(item, "name")}</h3>
          <p>
            {num(item, "sessionCount")} sessions ·{" "}
            {num(item, "sessionDuration")} minutes · {amount(item.price)}
          </p>
          <span className="status">{item.active ? "Active" : "Disabled"}</span>
          <button className="btn outline small" onClick={() => setEdit(item)}>
            Edit package
          </button>
        </article>
      ))}
    </>
  );
}
function getRuleDurationMinutes(startTime: string, endTime: string) {
  if (!startTime || !endTime) return 0;
  const startMin = Number(startTime.slice(0, 2)) * 60 + Number(startTime.slice(3));
  let endMin = Number(endTime.slice(0, 2)) * 60 + Number(endTime.slice(3));
  if (endMin <= startMin) endMin += 1440;
  return endMin - startMin;
}

function formatDurationText(mins: number) {
  if (mins <= 0) return "0m";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

export function AvailabilityPanel({
  data,
  reload,
}: {
  data: Item;
  reload: () => void;
}) {
  const [rules, setRules] = useState(availabilityRows(data.rules));
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (index: number, key: string, value: unknown) =>
    setRules(rules.map((r, i) => (i === index ? { ...r, [key]: value } : r)));

  const dayLabels = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const dailyStats = dayLabels.map((dayName, dayIndex) => {
    const dayRules = rules.filter((r) => num(r, "dayOfWeek") === dayIndex);
    const totalMins = dayRules.reduce(
      (sum, r) => sum + getRuleDurationMinutes(str(r, "startTime"), str(r, "endTime")),
      0,
    );
    return {
      dayIndex,
      dayName,
      count: dayRules.length,
      totalMins,
      exceeds: totalMins > 240,
    };
  });

  const totalExceededDay = dailyStats.find((s) => s.exceeds);

  return (
    <>
      <section className="panel">
        <h2>Your weekly schedule</h2>
        <p>
          Times are in {str(data, "timezone")}. Maximum availability is <strong>4 hours (240 minutes) per day</strong>. Split ranges on the same day are supported.
        </p>

        <div className="daily-availability-summary" style={{ marginBottom: "1.25rem", marginTop: "0.75rem" }}>
          <strong style={{ fontSize: "0.9rem" }}>Daily availability limits (Max 4h / 240m per day):</strong>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.5rem" }}>
            {dailyStats.map((stat) => (
              <div
                key={stat.dayIndex}
                style={{
                  padding: "0.4rem 0.65rem",
                  borderRadius: "var(--radius, 6px)",
                  border: stat.exceeds
                    ? "1px solid var(--danger, #ef4444)"
                    : stat.totalMins > 0
                      ? "1px solid var(--primary, #10b981)"
                      : "1px solid var(--border, #e5e7eb)",
                  background: stat.exceeds
                    ? "rgba(239, 68, 68, 0.1)"
                    : stat.totalMins === 240
                      ? "rgba(16, 185, 129, 0.1)"
                      : "transparent",
                  fontSize: "0.85rem",
                }}
              >
                <strong>{stat.dayName}:</strong>{" "}
                <span>{formatDurationText(stat.totalMins)} of 4h used</span>
                {stat.exceeds && (
                  <span style={{ color: "var(--danger, #ef4444)", fontWeight: "bold", marginLeft: "0.25rem" }}>
                    (Exceeds limit!)
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {rules.map((r, i) => {
          const ruleMins = getRuleDurationMinutes(str(r, "startTime"), str(r, "endTime"));
          return (
            <div className="schedule-rule" key={i}>
              <label className="field">
                Day
                <select
                  value={num(r, "dayOfWeek")}
                  onChange={(e) => set(i, "dayOfWeek", Number(e.target.value))}
                >
                  {dayLabels.map((d, n) => (
                    <option key={d} value={n}>
                      {d}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                Start
                <input
                  type="time"
                  value={str(r, "startTime")}
                  onChange={(e) => set(i, "startTime", e.target.value)}
                />
              </label>
              <label className="field">
                End
                <input
                  type="time"
                  value={str(r, "endTime")}
                  onChange={(e) => set(i, "endTime", e.target.value)}
                />
              </label>

              <span className="muted" style={{ alignSelf: "center", fontSize: "0.85rem", minWidth: "60px" }}>
                ({formatDurationText(ruleMins)})
              </span>

              <button
                className="text-link"
                onClick={() => setRules(rules.filter((_, n) => n !== i))}
              >
                Remove
              </button>
            </div>
          );
        })}

        {totalExceededDay && (
          <p className="form-error" role="alert" style={{ marginTop: "0.75rem" }}>
            Daily availability limit is 4 hours (240 minutes) per day. {totalExceededDay.dayName} has {formatDurationText(totalExceededDay.totalMins)} configured. Please adjust time windows to stay within 4 hours.
          </p>
        )}

        <div className="workspace-actions" style={{ marginTop: "1rem" }}>
          <button
            className="btn outline small"
            disabled={rules.length >= 28}
            onClick={() => {
              // Pick first day with available minutes
              const targetDay = dailyStats.find((s) => s.totalMins < 240)?.dayIndex ?? 1;
              setRules([
                ...rules,
                {
                  dayOfWeek: targetDay,
                  startTime: "09:00",
                  endTime: "11:00",
                },
              ]);
            }}
          >
            Add time window
          </button>
          <button
            className="btn small"
            disabled={busy || Boolean(totalExceededDay)}
            onClick={async () => {
              if (totalExceededDay) return;
              setBusy(true);
              try {
                const result = await api<{ message: string }>(
                  "trainer/availability",
                  {
                    rules: rules.map((r) => ({
                      dayOfWeek: num(r, "dayOfWeek"),
                      startTime: str(r, "startTime"),
                      endTime: str(r, "endTime"),
                    })),
                  },
                );
                setMessage(result.message);
                reload();
              } catch (e) {
                setMessage((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            Save schedule
          </button>
        </div>
        {message && <p role="status">{message}</p>}
      </section>
      <section className="panel">
        <h2>Time off & extra availability</h2>
        <ActionForm
          endpoint="trainer/exceptions"
          onDone={reload}
          fields={[
            {
              name: "kind",
              label: "Type",
              type: "select",
              options: ["BLOCK", "AVAILABLE"],
            },
            {
              name: "start",
              label: "Start (your device timezone)",
              type: "datetime-local",
              required: true,
            },
            {
              name: "end",
              label: "End (your device timezone)",
              type: "datetime-local",
              required: true,
            },
            { name: "reason", label: "Reason", required: true },
          ]}
          transform={(v) => ({
            ...v,
            start: new Date(String(v.start)).toISOString(),
            end: new Date(String(v.end)).toISOString(),
          })}
        />
        {rows(data.exceptions).map((r) => (
          <div key={str(r, "_id")} className="booking-row">
            <p>
              {str(r, "kind")} · {date(r.start)} — {date(r.end)}
              <br />
              {str(r, "reason")}
            </p>
            <ActionForm
              endpoint={`trainer/exceptions/${str(r, "_id")}`}
              fields={[]}
              label="Remove"
              method="DELETE"
              onDone={reload}
            />
          </div>
        ))}
      </section>
    </>
  );
}
export function VerificationPanel({
  data,
  reload,
}: {
  data: Item;
  reload: () => void;
}) {
  const application = record(data.application);
  const trainer = record(data.trainer);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  return (
    <>
      <section className="panel">
        <h2>Identity verification</h2>
        <p>
          Upload a clear picture of your CNIC so the SPOTTER team can verify your identity. Your document is private and never shown publicly.
        </p>
        <span className="status">
          {str(application, "status") || "Not submitted"}
        </span>
        <form
          className="workspace-form"
          onSubmit={async (event) => {
            event.preventDefault();
            if (busy) return;
            setBusy(true);
            setMessage("");
            const form = event.currentTarget;
            const values = new FormData(form);
            try {
              const file = values.get("cnicPicture");
              if (!(file instanceof File) || !file.size) {
                setMessage("Please select a CNIC picture to upload.");
                setBusy(false);
                return;
              }
              const upload = new FormData();
              upload.set("purpose", "PRIVATE");
              upload.set("file", file);
              const response = await fetch("/api/uploads", {
                method: "POST",
                body: upload,
              });
              const uploaded = await apiResult<{ id: string }>(response);
              const result = await api<{ message: string }>(
                "trainer/verification",
                {
                  uploadId: uploaded.id,
                },
              );
              setMessage(result.message);
              form.reset();
              reload();
            } catch (error) {
              setMessage((error as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <label className="field">
            CNIC picture / document
            <input
              name="cnicPicture"
              type="file"
              required
              accept=".jpg,.jpeg,.png,.webp,.pdf"
            />
            <small>JPG, PNG, WebP, or PDF. Maximum 4 MB.</small>
          </label>
          {message && <p role="status">{message}</p>}
          <button className="btn" disabled={busy}>
            {busy ? "Uploading…" : "Upload CNIC & save"}
          </button>
        </form>
        {str(trainer, "cnicUploadId") && (
          <a
            className="text-link"
            href={`/api/media/${str(trainer, "cnicUploadId")}`}
            target="_blank"
            rel="noreferrer"
          >
            View submitted CNIC picture →
          </a>
        )}
      </section>
      <section className="panel">
        <h2>Certificates & Credentials</h2>
        <p>
          Add professional qualifications for admin review. Title and issuing
          organization are required.
        </p>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "1rem",
            marginBottom: "1rem",
          }}
        >
          {rows(data.credentials)
            .filter((c) => str(c, "type") === "CERTIFICATION")
            .map((cred) => (
              <div
                key={str(cred, "_id")}
                style={{
                  padding: "1rem",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius)",
                }}
              >
                <strong>{str(cred, "title") || "Untitled Certificate"}</strong>
                {str(cred, "issuingOrganization")
                  ? ` - ${str(cred, "issuingOrganization")}`
                  : ""}
                <br />
                <a
                  className="text-link"
                  href={`/api/media/${str(cred, "uploadId")}`}
                >
                  View File
                </a>
              </div>
            ))}
        </div>
        <form
          className="workspace-form"
          onSubmit={async (e) => {
            e.preventDefault();
            if (busy) return;
            setBusy(true);
            setMessage("");
            const form = e.currentTarget;
            const values = new FormData(form);
            try {
              const file = values.get("file");
              const upload = new FormData();
              upload.set("purpose", "PRIVATE");
              upload.set("file", file as File);
              const response = await fetch("/api/uploads", {
                method: "POST",
                body: upload,
              });
              const uploaded = await apiResult<{ id: string }>(response);
              const result = await api<{ message: string }>(
                "trainer/credentials",
                {
                  uploadId: uploaded.id,
                  type: "CERTIFICATION",
                  title: values.get("title"),
                  issuingOrganization: values.get("issuingOrganization"),
                  credentialNumber: values.get("credentialNumber") || undefined,
                  issueDate: values.get("issueDate") || undefined,
                  expiryDate: values.get("expiryDate") || undefined,
                },
              );
              setMessage(result.message);
              form.reset();
              reload();
            } catch (error) {
              setMessage((error as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <label className="field">
            Certificate image
            <input
              name="file"
              type="file"
              required
              accept=".jpg,.jpeg,.png,.webp,.pdf"
            />
          </label>
          <label className="field">
            Certificate / qualification title
            <input name="title" required maxLength={200} />
          </label>
          <label className="field">
            Issuing organization
            <input name="issuingOrganization" required maxLength={200} />
          </label>
          <label className="field">
            Credential / licence number
            <input name="credentialNumber" maxLength={200} />
          </label>
          <label className="field">
            Issue date
            <input name="issueDate" type="date" />
          </label>
          <label className="field">
            Expiry date (if applicable)
            <input name="expiryDate" type="date" />
          </label>
          <button className="btn small outline" disabled={busy}>
            {busy ? "Uploading…" : "Upload Certificate"}
          </button>
        </form>
      </section>
    </>
  );
}
export function MessagesPanel({
  data,
  reload,
}: {
  data: Item;
  reload: () => void;
}) {
  const [selected, setSelected] = useState("");
  const [error, setError] = useState("");
  const { data: messages, reload: reloadMessages } = useApi<{ items: Item[] }>(
    selected ? `messages/${selected}` : null,
  );
  useEffect(() => {
    const timer = window.setInterval(() => {
      reload();
      if (selected) reloadMessages();
    }, 5000);
    return () => window.clearInterval(timer);
  }, [reload, reloadMessages, selected]);
  return (
    <div className="message-layout">
      <div className="panel">
        <h2>Conversations</h2>
        {rows(data.items).map((c) => (
          <button
            key={str(c, "_id")}
            className="conversation-row"
            onClick={async () => {
              setSelected(str(c, "_id"));
              try {
                await api(`messages/${str(c, "_id")}/read`, {});
                reload();
              } catch (e) {
                setError((e as Error).message);
              }
            }}
          >
            {str(record(c.trainer), "displayName")} ·{" "}
            {str(record(c.customer), "name")}
            {num(c, "unread") > 0 && (
              <span className="status">{num(c, "unread")}</span>
            )}
          </button>
        ))}
        {!rows(data.items).length && (
          <p>No conversations yet. Start from a trainer’s profile.</p>
        )}
      </div>
      <section className="panel">
        {error && <p role="alert">{error}</p>}
        {selected ? (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
              <span className="status-badge status-badge-paid" style={{ padding: "0.2rem 0.5rem", fontSize: "0.75rem" }}>Live Chat Active</span>
              <small className="muted">Updates automatically</small>
            </div>
            <div className="message-history">
              {messages?.items.map((m) => (
                <article className="message-bubble" key={str(m, "_id")}>
                  <p>{str(m, "text")}</p>
                  <small>{date(m.createdAt)}</small>
                </article>
              ))}
            </div>
            <ActionForm
              key={selected}
              endpoint={`messages/${selected}`}
              fields={[
                {
                  name: "text",
                  label: "Your message",
                  type: "textarea",
                  required: true,
                },
              ]}
              transform={(v) => ({ ...v, idempotencyKey: crypto.randomUUID() })}
              label="Send message"
              onDone={() => {
                reloadMessages();
                reload();
              }}
            />
          </>
        ) : (
          <p>Select a conversation to read and reply.</p>
        )}
      </section>
    </div>
  );
}

export function EarningsPanel({
  data,
  reload,
}: {
  data: Item;
  reload: () => void;
}) {
  const [showRequestModal, setShowRequestModal] = useState(false);
  const availableBalancePaisa = num(data, "availableBalance");
  const thisMonthPaisa = num(data, "thisMonthEarnings");
  const lifetimePaisa = num(data, "lifetimeEarnings");
  const pendingPaisa = num(data, "pendingAmount");

  const payoutHistoryRows = rows(data.payoutHistory || data.items);
  const completedEarningsHistoryRows = rows(data.completedEarningsHistory);

  const getStatusBadge = (rawStatus: string) => {
    const s = rawStatus.toUpperCase();
    if (s === "PAID")
      return <span className="status-badge status-badge-paid">Paid</span>;
    if (s === "PROCESSING")
      return (
        <span className="status-badge status-badge-processing">Processing</span>
      );
    if (s === "REQUESTED" || s === "PENDING")
      return <span className="status-badge status-badge-pending">Pending</span>;
    if (s === "REJECTED" || s === "FAILED")
      return <span className="status-badge status-badge-failed">Failed</span>;
    return <span className="status-badge">{rawStatus}</span>;
  };

  return (
    <div className="earnings-container">
      {/* Available Balance Hero Banner */}
      <section className="panel earnings-hero-card">
        <div className="earnings-hero-header">
          <div>
            <span className="eyebrow">AVAILABLE BALANCE</span>
            <h2 className="earnings-hero-balance">
              {amount(availableBalancePaisa)}
            </h2>
            <p className="earnings-hero-subtext">
              Settled earnings from completed packages ready for withdrawal.
            </p>
          </div>
          <button
            type="button"
            className="btn lime earnings-request-btn"
            onClick={() => setShowRequestModal(true)}
          >
            REQUEST PAYOUT
          </button>
        </div>

        {/* Modal / Inline Payout Request Form */}
        {showRequestModal && (
          <div className="payout-modal-overlay">
            <div className="panel payout-modal-content">
              <div className="payout-modal-header">
                <h3>Request a Payout</h3>
                <button
                  type="button"
                  className="payout-modal-close"
                  onClick={() => setShowRequestModal(false)}
                >
                  ✕
                </button>
              </div>
              <p>
                Available balance for payout:{" "}
                <strong>{amount(availableBalancePaisa)}</strong>
              </p>
              {availableBalancePaisa < 10000 ? (
                <p className="form-notice">
                  Minimum payout threshold is {amount(10000)}. Completed earnings will be available here once accrued.
                </p>
              ) : (
                <ActionForm
                  endpoint="trainer/payouts"
                  fields={[
                    {
                      name: "amount",
                      label: "Amount in PKR",
                      type: "number",
                      value: availableBalancePaisa / 100,
                      min: 100,
                      max: availableBalancePaisa / 100,
                      required: true,
                    },
                  ]}
                  transform={(v) => ({
                    amount: Math.round(Number(v.amount) * 100),
                    idempotencyKey: crypto.randomUUID(),
                  })}
                  label="Submit Payout Request"
                  onDone={() => {
                    setShowRequestModal(false);
                    reload();
                  }}
                />
              )}
            </div>
          </div>
        )}
      </section>

      {/* Summary Metrics */}
      <div className="earnings-metrics-grid">
        <article className="panel earnings-metric-card">
          <span className="eyebrow">THIS MONTH</span>
          <strong>{amount(thisMonthPaisa)}</strong>
        </article>
        <article className="panel earnings-metric-card">
          <span className="eyebrow">LIFETIME EARNINGS</span>
          <strong>{amount(lifetimePaisa)}</strong>
        </article>
        <article className="panel earnings-metric-card">
          <span className="eyebrow">PENDING AMOUNT</span>
          <strong>{amount(pendingPaisa)}</strong>
        </article>
      </div>

      {/* Payout History */}
      <section className="panel">
        <h2>Payout History</h2>
        {payoutHistoryRows.length > 0 ? (
          <div className="earnings-table-wrapper">
            <table className="earnings-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Amount</th>
                  <th>Method</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {payoutHistoryRows.map((p) => (
                  <tr key={str(p, "_id")}>
                    <td>{date(p.createdAt)}</td>
                    <td>
                      <strong>{amount(p.amount)}</strong>
                    </td>
                    <td>{str(p, "reference") || "Bank Transfer"}</td>
                    <td>{getStatusBadge(str(p, "status"))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted">No payout history yet.</p>
        )}
      </section>

      {/* Completed Session Earning History */}
      <section className="panel">
        <h2>Completed Session Earnings</h2>
        <p className="muted" style={{ marginBottom: "1rem" }}>
          Recent earnings breakdown from completed training sessions.
        </p>
        {completedEarningsHistoryRows.length > 0 ? (
          <div className="earnings-table-wrapper">
            <table className="earnings-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Client</th>
                  <th>Package / Service</th>
                  <th>Net Earned</th>
                </tr>
              </thead>
              <tbody>
                {completedEarningsHistoryRows.map((item) => (
                  <tr key={str(item, "_id")}>
                    <td>{date(item.date)}</td>
                    <td>
                      <strong>{str(item, "clientName")}</strong>
                      {str(item, "bookingNumber") !== "—" && (
                        <div style={{ fontSize: "0.8rem", opacity: 0.8 }}>
                          {str(item, "bookingNumber")}
                        </div>
                      )}
                    </td>
                    <td>
                      {str(item, "packageName")}{" "}
                      <span style={{ fontSize: "0.85rem", opacity: 0.8 }}>
                        (Session {num(item, "sessionNumber")} of{" "}
                        {num(item, "totalSessions")})
                      </span>
                    </td>
                    <td>
                      <strong style={{ color: "var(--primary, #10b981)" }}>
                        +{amount(num(item, "earnedAmount"))}
                      </strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted">No completed session earnings recorded yet.</p>
        )}
      </section>
    </div>
  );
}

