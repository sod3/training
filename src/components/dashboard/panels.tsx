"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api, apiResult, useApi } from "@/lib/client-api";
import { ActionForm, UploadForm, type Field } from "./action-form";
import { DEFAULT_CATEGORIES, PREFERRED_TIMES } from "@/lib/catalog";
import { ReviewComposer } from "./review-composer";
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

const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
const DAY_NAMES: Record<number, string> = {
  1: "Monday",
  2: "Tuesday",
  3: "Wednesday",
  4: "Thursday",
  5: "Friday",
  6: "Saturday",
  0: "Sunday",
};

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

  const dailyTotals = DAY_ORDER.map((dayCode) => {
    const dayRules = rules.filter((r) => num(r, "dayOfWeek") === dayCode);
    const totalMins = dayRules.reduce(
      (sum, r) => sum + getRuleDurationMinutes(str(r, "startTime"), str(r, "endTime")),
      0,
    );
    return {
      dayCode,
      dayName: DAY_NAMES[dayCode],
      rules: dayRules,
      active: dayRules.length > 0,
      totalMins,
      exceeds: totalMins > 240,
    };
  });

  const totalExceededDay = dailyTotals.find((s) => s.exceeds);

  const toggleDay = (dayCode: number, active: boolean) => {
    if (active) {
      setRules(rules.filter((r) => num(r, "dayOfWeek") !== dayCode));
    } else {
      setRules([
        ...rules,
        { dayOfWeek: dayCode, startTime: "09:00", endTime: "13:00" },
      ]);
    }
  };

  const updateRule = (ruleIndex: number, field: "startTime" | "endTime", value: string) => {
    setRules(rules.map((r, i) => (i === ruleIndex ? { ...r, [field]: value } : r)));
  };

  const addTimeShift = (dayCode: number) => {
    const dayRules = rules.filter((r) => num(r, "dayOfWeek") === dayCode);
    const lastRule = dayRules[dayRules.length - 1];
    let defaultStart = "14:00";
    let defaultEnd = "16:00";
    if (lastRule && str(lastRule, "endTime") === "13:00") {
      defaultStart = "17:00";
      defaultEnd = "19:00";
    }
    setRules([
      ...rules,
      { dayOfWeek: dayCode, startTime: defaultStart, endTime: defaultEnd },
    ]);
  };

  const removeRule = (targetRule: Item) => {
    setRules(rules.filter((r) => r !== targetRule));
  };

  return (
    <>
      <section className="panel">
        <h2>Your Weekly Schedule</h2>
        <p className="muted text-sm mb-4">
          Timezone: <strong>{str(data, "timezone") || "Asia/Karachi"}</strong>. Set your availability for each day of the week. Maximum <strong>4 hours (240 minutes) per day</strong>.
        </p>

        <div className="weekly-schedule-rows space-y-3">
          {dailyTotals.map((dayData) => {
            const { dayCode, dayName, rules: dayRules, active, exceeds } = dayData;
            return (
              <div
                key={dayCode}
                className={`p-3 border rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                  active ? "bg-slate-50/50" : "bg-slate-100/30 opacity-70"
                } ${exceeds ? "border-red-500 bg-red-50/20" : ""}`}
              >
                <div className="flex items-center gap-3 min-w-[140px]">
                  <button
                    type="button"
                    className={`px-3 py-1 text-xs font-bold rounded-full transition-colors ${
                      active
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-300 text-slate-700"
                    }`}
                    onClick={() => toggleDay(dayCode, active)}
                  >
                    {active ? "ON" : "OFF"}
                  </button>
                  <strong className="text-base">{dayName}</strong>
                </div>

                {active ? (
                  <div className="flex-1 flex flex-wrap items-center gap-3">
                    {dayRules.map((rule) => {
                      const idx = rules.indexOf(rule);
                      return (
                        <div key={idx} className="flex items-center gap-2 bg-white p-1.5 border rounded">
                          <input
                            type="time"
                            value={str(rule, "startTime")}
                            onChange={(e) => updateRule(idx, "startTime", e.target.value)}
                            className="text-sm p-1 border rounded"
                          />
                          <span className="text-slate-400">→</span>
                          <input
                            type="time"
                            value={str(rule, "endTime")}
                            onChange={(e) => updateRule(idx, "endTime", e.target.value)}
                            className="text-sm p-1 border rounded"
                          />
                          {dayRules.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeRule(rule)}
                              className="text-red-500 hover:text-red-700 font-bold px-1.5"
                              title="Remove time period"
                            >
                              ×
                            </button>
                          )}
                        </div>
                      );
                    })}

                    <button
                      type="button"
                      onClick={() => addTimeShift(dayCode)}
                      className="text-xs text-emerald-700 hover:underline font-semibold"
                    >
                      + Add another time
                    </button>
                  </div>
                ) : (
                  <span className="text-sm text-slate-400 italic">Off</span>
                )}
              </div>
            );
          })}
        </div>

        {totalExceededDay && (
          <p className="form-error mt-4" role="alert">
            You can make up to 4 hours available per day.
          </p>
        )}

        <div className="mt-5 flex items-center gap-4">
          <button
            type="button"
            className="btn"
            disabled={busy || Boolean(totalExceededDay)}
            onClick={async () => {
              if (totalExceededDay) return;
              setBusy(true);
              setMessage("");
              try {
                const res = await api<{ message: string }>("trainer/availability", {
                  rules: rules.map((r) => ({
                    dayOfWeek: num(r, "dayOfWeek"),
                    startTime: str(r, "startTime"),
                    endTime: str(r, "endTime"),
                  })),
                });
                setMessage(res.message);
                reload();
              } catch (e) {
                setMessage((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "Saving availability…" : "Save Availability"}
          </button>
          {message && <span className="text-sm font-semibold">{message}</span>}
        </div>
      </section>

      <section className="panel mt-6">
        <details>
          <summary className="font-semibold text-slate-800 cursor-pointer">
            Time Off & Unavailable Dates
          </summary>
          <div className="mt-4">
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
                  label: "Start",
                  type: "datetime-local",
                  required: true,
                },
                {
                  name: "end",
                  label: "End",
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
              <div key={str(r, "_id")} className="booking-row flex justify-between items-center p-2 border rounded mt-2">
                <p className="text-sm">
                  <strong>{str(r, "kind")}</strong>: {date(r.start)} — {date(r.end)} ({str(r, "reason")})
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
          </div>
        </details>
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

export function ConversationThread({
  conversationId,
  onMessageSent,
}: {
  conversationId: string;
  onMessageSent?: () => void;
}) {
  const [error, setError] = useState("");
  const { data: messages, reload } = useApi<{ items: Item[] }>(
    conversationId ? `messages/${conversationId}` : null,
  );

  useEffect(() => {
    if (!conversationId) return;
    const timer = window.setInterval(() => {
      reload();
    }, 4000);
    return () => window.clearInterval(timer);
  }, [conversationId, reload]);

  if (!conversationId) return null;

  return (
    <div className="conversation-thread-panel">
      <div className="flex justify-between items-center mb-3">
        <span className="status-badge status-badge-paid" style={{ fontSize: "0.75rem", padding: "0.2rem 0.5rem" }}>
          Live Chat Active
        </span>
        <small className="muted">Updates automatically</small>
      </div>
      {error && <p role="alert" className="form-error">{error}</p>}
      <div className="message-history mb-4" style={{ maxHeight: "350px", overflowY: "auto" }}>
        {messages?.items?.length ? (
          messages.items.map((m) => (
            <article className="message-bubble" key={str(m, "_id")}>
              <p>{str(m, "text")}</p>
              <small>{date(m.createdAt)}</small>
            </article>
          ))
        ) : (
          <p className="muted text-sm">No messages yet. Send your first message below.</p>
        )}
      </div>
      <ActionForm
        key={conversationId}
        endpoint={`messages/${conversationId}`}
        fields={[
          {
            name: "text",
            label: "Send a message",
            type: "textarea",
            required: true,
          },
        ]}
        transform={(v) => ({ ...v, idempotencyKey: crypto.randomUUID() })}
        label="Send message"
        onDone={() => {
          reload();
          if (onMessageSent) onMessageSent();
        }}
      />
    </div>
  );
}

export function SchedulePanel({
  data,
  reload,
}: {
  data: Item;
  reload: () => void;
}) {
  const packagesList = rows(data.packages || data.items);

  return (
    <div className="schedule-pricing-merged space-y-6">
      <section className="panel mb-6">
        <div className="mb-4">
          <p className="eyebrow">SECTION 1: SERVICES & PRICING</p>
          <h2>Packages & Pricing</h2>
          <p className="muted text-sm">
            Create, edit, or disable coaching services and package rates for your clients.
          </p>
        </div>
        <PackagesPanel items={packagesList} reload={reload} />
      </section>

      <AvailabilityPanel data={data} reload={reload} />
    </div>
  );
}

export function ClientsPanel({
  data,
  reload,
}: {
  data: Item;
  reload: () => void;
}) {
  const clients = rows(data.items);
  const [selectedId, setSelectedId] = useState<string>(clients[0] ? str(clients[0], "_id") : "");
  const [search, setSearch] = useState("");

  const filteredClients = clients.filter((c) =>
    str(c, "name").toLowerCase().includes(search.toLowerCase()) ||
    str(c, "email").toLowerCase().includes(search.toLowerCase())
  );

  const selectedClient = clients.find((c) => str(c, "_id") === selectedId) || filteredClients[0];

  return (
    <div className="clients-merged-container grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className={`clients-list-col ${selectedClient ? "hidden lg:block" : "block"}`}>
        <div className="panel mb-4">
          <label className="field">
            Search Clients
            <input
              type="text"
              placeholder="Search by name or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
        </div>
        <div className="space-y-3">
          {filteredClients.map((client) => {
            const cid = str(client, "_id");
            const isSelected = selectedClient && str(selectedClient, "_id") === cid;
            const orders = rows(client.orders || client.bookings);
            const activeOrder = orders[0];
            const activePkg = record(record(activeOrder).packageSnapshot);
            const unread = num(client, "unreadMessages");

            return (
              <button
                type="button"
                key={cid}
                className={`panel w-full text-left transition-all cursor-pointer ${
                  isSelected ? "border-emerald-500 ring-1 ring-emerald-500 bg-emerald-50/10" : ""
                }`}
                onClick={() => setSelectedId(cid)}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-700">
                      {str(client, "name").charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <strong className="block text-base">{str(client, "name")}</strong>
                      <span className="text-xs muted block">
                        {str(activePkg, "name") || "Active Client"}
                      </span>
                    </div>
                  </div>
                  {unread > 0 && (
                    <span className="status-badge status-badge-pending text-xs">
                      {unread} new
                    </span>
                  )}
                </div>
              </button>
            );
          })}
          {!filteredClients.length && (
            <div className="panel empty-state compact">
              <h3>No clients yet</h3>
              <p>New customers will appear here after they book with you.</p>
            </div>
          )}
        </div>
      </div>

      <div className={`client-detail-col lg:col-span-2 ${!selectedClient ? "hidden lg:block" : "block"}`}>
        {selectedClient ? (
          <div className="space-y-6">
            <button
              type="button"
              className="lg:hidden text-link mb-3 inline-block"
              onClick={() => setSelectedId("")}
            >
              ← Back to Client List
            </button>

            <section className="panel">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-2xl">
                  {str(selectedClient, "name").charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="eyebrow">CLIENT PROFILE</p>
                  <h2>{str(selectedClient, "name")}</h2>
                  <p className="muted text-sm">
                    {str(selectedClient, "email")} {str(selectedClient, "phone") ? `· ${str(selectedClient, "phone")}` : ""}
                  </p>
                </div>
              </div>
            </section>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <section className="panel">
                <h3>NEXT SESSION</h3>
                {selectedClient.nextSession ? (
                  <div className="mt-2">
                    <strong className="text-lg block">
                      {date(record(selectedClient.nextSession).start)}
                    </strong>
                    <p className="muted text-xs mt-1">
                      Session {num(record(selectedClient.nextSession), "sessionNumber")} · Live online
                    </p>

                    {str(record(selectedClient.nextSession), "meetingUrl") ? (
                      <a
                        className="btn small lime mt-3 inline-block"
                        href={str(record(selectedClient.nextSession), "meetingUrl")}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Open session link →
                      </a>
                    ) : (
                      <span className="status-badge status-badge-pending mt-2 inline-block text-xs">No video URL added</span>
                    )}

                    <div className="mt-4 pt-3 border-t">
                      <ActionForm
                        endpoint={`trainer/meeting/${str(record(selectedClient.nextSession), "_id")}`}
                        fields={[
                          {
                            name: "meetingUrl",
                            label: "Private video link (Google Meet / Zoom)",
                            value: str(record(selectedClient.nextSession), "meetingUrl"),
                            required: true,
                          },
                        ]}
                        label={str(record(selectedClient.nextSession), "meetingUrl") ? "Update meeting link" : "Add meeting link"}
                        onDone={reload}
                      />
                    </div>
                  </div>
                ) : (
                  <p className="muted text-sm mt-2">No upcoming session scheduled.</p>
                )}
              </section>

              <section className="panel">
                <h3>SESSION PROGRESS</h3>
                {rows(selectedClient.orders)[0] ? (
                  <div className="mt-2">
                    <strong className="text-xl block text-emerald-600">
                      {num(rows(selectedClient.orders)[0], "remainingSessions")} sessions remaining
                    </strong>
                    <p className="muted text-xs mt-1">
                      Package: {str(record(record(rows(selectedClient.orders)[0]).packageSnapshot), "name")}
                    </p>
                  </div>
                ) : (
                  <p className="muted text-sm mt-2">No active package.</p>
                )}
              </section>
            </div>

            <section className="panel">
              <h2>CLIENT MESSAGES & DIRECT CHAT</h2>
              {str(selectedClient, "conversationId") ? (
                <ConversationThread
                  conversationId={str(selectedClient, "conversationId")}
                  onMessageSent={reload}
                />
              ) : (
                <p className="muted text-sm">Conversation will activate when client messages or books.</p>
              )}
            </section>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <section className="panel">
                <h3>SESSION HISTORY</h3>
                <div className="space-y-2 mt-3">
                  {rows(selectedClient.sessions).map((s) => (
                    <div className="p-2 border rounded flex justify-between items-center text-sm" key={str(s, "_id")}>
                      <div>
                        <strong>Session {num(s, "sessionNumber")}</strong>
                        <small className="block muted">{date(s.start)}</small>
                      </div>
                      <span className="status text-xs">{str(s, "status")}</span>
                    </div>
                  ))}
                  {!rows(selectedClient.sessions).length && (
                    <p className="muted text-sm">No session records yet.</p>
                  )}
                </div>
              </section>

              <section className="panel">
                <h3>BOOKING / PACKAGE INFO</h3>
                {rows(selectedClient.orders).map((ord) => {
                  const snap = record(ord.packageSnapshot);
                  return (
                    <div className="p-3 border rounded mt-3 text-sm space-y-1" key={str(ord, "_id")}>
                      <strong>{str(snap, "name")}</strong>
                      <p className="font-bold text-emerald-700">{amount(ord.total)}</p>
                      <small className="block muted">Booking #{str(ord, "bookingNumber")}</small>
                      <small className="block muted">Purchased: {date(ord.createdAt)}</small>
                      <span className="status-badge status-badge-paid inline-block text-xs mt-1">{str(ord, "paymentStatus")}</span>
                    </div>
                  );
                })}
              </section>
            </div>
          </div>
        ) : (
          <div className="panel empty-state">
            <h3>Select a client</h3>
            <p>Choose a client from the list to view their relationship details, sessions, and live chat.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export function TrainerProfilePanel({
  data,
  reload,
}: {
  data: Item;
  reload: () => void;
}) {
  const [activeTab, setActiveTab] = useState<
    "public" | "verification" | "application" | "reviews" | "security"
  >("public");

  const application = record(data.application);
  const trainer = record(data.trainer);
  const applicationStatus =
    str(application, "status") || str(trainer, "applicationStatus") || "DRAFT";

  return (
    <div className="trainer-profile-merged space-y-6">
      <div className="flex flex-wrap gap-2 border-b pb-3">
        {[
          ["public", "Public Information"],
          ["verification", "Verification & Identity"],
          ["application", "Application Status"],
          ["reviews", "Client Reviews"],
          ["security", "Account & Security"],
        ].map(([key, label]) => (
          <button
            type="button"
            key={key}
            className={`btn small ${activeTab === key ? "" : "outline"}`}
            onClick={() => setActiveTab(key as typeof activeTab)}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === "public" && (
        <ProfilePanel data={data} role="trainer" reload={reload} />
      )}

      {activeTab === "verification" && (
        <VerificationPanel data={data} reload={reload} />
      )}

      {activeTab === "application" && (
        <section className="panel application-status-panel">
          <p className="eyebrow">TRAINER APPLICATION STATUS</p>
          <div className="panel-title">
            <h2>{applicationStatus.replaceAll("_", " ")}</h2>
            <span className="status">{applicationStatus}</span>
          </div>
          <p className="mt-2">
            {applicationStatus === "APPROVED"
              ? "Your trainer application is approved. You can accept public client bookings."
              : ["SUBMITTED", "UNDER_REVIEW"].includes(applicationStatus)
                ? "Your application is currently under admin review."
                : "Complete all onboarding details before submitting for review."}
          </p>
          {str(application, "adminNotes") && (
            <div className="payment-notice mt-4">
              <strong>Admin feedback:</strong>
              <p>{str(application, "adminNotes")}</p>
            </div>
          )}
        </section>
      )}

      {activeTab === "reviews" && (
        <section className="panel">
          <h2>Client Reviews</h2>
          <div className="space-y-4 mt-4">
            {rows(data.reviews).map((r) => (
              <article className="p-3 border rounded" key={str(r, "_id")}>
                <div className="flex justify-between items-center mb-1">
                  <strong className="text-yellow-500">{"★".repeat(num(r, "rating"))}</strong>
                  <small className="muted">{date(r.createdAt)}</small>
                </div>
                <p className="text-sm">{str(r, "review")}</p>
                <small className="muted block mt-1">Client: {str(r, "customerName") || "Verified Customer"}</small>
              </article>
            ))}
            {!rows(data.reviews).length && (
              <p className="muted text-sm">No client reviews published yet.</p>
            )}
          </div>
        </section>
      )}

      {activeTab === "security" && (
        <section className="panel">
          <h2>Account & Password Security</h2>
          <ActionForm
            endpoint="account/security"
            fields={[
              {
                name: "currentPassword",
                label: "Current password",
                type: "password",
                required: true,
              },
              {
                name: "newEmail",
                label: "New email address (optional)",
                type: "email",
                value: str(record(data.profile), "normalizedEmail"),
              },
              {
                name: "newPassword",
                label: "New password (optional)",
                type: "password",
              },
              {
                name: "confirmPassword",
                label: "Confirm new password",
                type: "password",
              },
            ]}
            transform={(v) => ({
              ...v,
              newEmail: v.newEmail || undefined,
              newPassword: v.newPassword || undefined,
              confirmPassword: v.newPassword ? v.confirmPassword : undefined,
              revokeSessions: true,
            })}
            confirmation="Security updates sign out active sessions on other devices."
            label="Update Security Settings"
            onDone={reload}
          />
        </section>
      )}
    </div>
  );
}

export function CustomerTrainingPanel({
  data,
  reload,
}: {
  data: Item;
  reload: () => void;
}) {
  const orders = rows(data.orders || data.items);
  const activeOrder = orders[0];
  const activeTrainer = record(activeOrder?.trainer);
  const sessions = rows(data.sessions);
  const upcomingSessions = sessions.filter(
    (s) => str(s, "status") === "CONFIRMED" && new Date(str(s, "start")) >= new Date(),
  );
  const nextSession = upcomingSessions[0];
  const conversations = rows(data.conversations);
  const conversationId = conversations[0] ? str(conversations[0], "_id") : "";
  const eligibleReviews = rows(data.eligible);

  if (!orders.length) {
    return (
      <div className="panel empty-state">
        <h2>No active training plan yet.</h2>
        <p>Browse our verified online personal trainers to find your match and book your first session.</p>
        <Link className="btn lime mt-4 inline-block" href="/trainers">Browse Personal Trainers →</Link>
      </div>
    );
  }

  return (
    <div className="customer-training-hub space-y-6">
      <section className="panel">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center font-bold text-xl text-emerald-800">
              {str(activeTrainer, "displayName").charAt(0) || "T"}
            </div>
            <div>
              <p className="eyebrow">YOUR TRAINER & PLAN</p>
              <h2>{str(activeTrainer, "displayName") || "Personal Coach"}</h2>
              <p className="muted text-sm">{str(record(activeOrder?.packageSnapshot), "name")} · {amount(activeOrder?.total)}</p>
            </div>
          </div>
          {str(activeTrainer, "slug") && (
            <Link className="btn outline small" href={`/trainers/${str(activeTrainer, "slug")}`}>
              View Coach Profile
            </Link>
          )}
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <section className="panel">
          <p className="eyebrow">NEXT UPCOMING SESSION</p>
          {nextSession ? (
            <div className="mt-2">
              <strong className="text-xl block">{date(nextSession.start)}</strong>
              <p className="muted text-xs mt-1">Session {num(nextSession, "sessionNumber")} · Live 1-on-1 Online</p>
              {str(nextSession, "meetingUrl") ? (
                <a
                  className="btn lime small mt-3 inline-block"
                  href={str(nextSession, "meetingUrl")}
                  target="_blank"
                  rel="noreferrer"
                >
                  Join Online Session →
                </a>
              ) : (
                <span className="status-badge status-badge-pending mt-3 inline-block text-xs">Video link pending from coach</span>
              )}
            </div>
          ) : (
            <div className="mt-2">
              <h2>No session scheduled yet.</h2>
              {num(activeOrder, "remainingSessions") > 0 ? (
                <p className="muted text-sm mt-1">You have {num(activeOrder, "remainingSessions")} session(s) left to schedule.</p>
              ) : (
                <p className="muted text-sm mt-1">All sessions for this package have been scheduled or completed.</p>
              )}
            </div>
          )}
        </section>

        <section className="panel">
          <p className="eyebrow">PACKAGE SESSIONS</p>
          <div className="mt-2">
            <strong className="text-xl block text-emerald-600">
              {num(activeOrder, "remainingSessions")} sessions remaining
            </strong>
            <p className="muted text-xs mt-1">
              Package Total: {num(record(activeOrder?.packageSnapshot), "sessionCount")} sessions
            </p>
          </div>
        </section>
      </div>

      <section className="panel">
        <h2 className="mb-4">MESSAGES WITH YOUR COACH</h2>
        {conversationId ? (
          <ConversationThread conversationId={conversationId} onMessageSent={reload} />
        ) : (
          <p className="muted text-sm">Messages will appear here when you communicate with your coach.</p>
        )}
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <section className="panel">
          <h2>SESSION HISTORY</h2>
          <div className="space-y-2 mt-3">
            {sessions.map((s) => (
              <div className="p-3 border rounded flex justify-between items-center text-sm" key={str(s, "_id")}>
                <div>
                  <strong>Session {num(s, "sessionNumber")}</strong>
                  <small className="block muted">{date(s.start)}</small>
                </div>
                <span className="status text-xs">{str(s, "status")}</span>
              </div>
            ))}
            {!sessions.length && <p className="muted text-sm">No session records yet.</p>}
          </div>
        </section>

        <section className="panel">
          <h2>LEAVE A REVIEW</h2>
          {eligibleReviews.length > 0 ? (
            <ReviewComposer eligible={eligibleReviews} onDone={reload} />
          ) : (
            <p className="muted text-sm mt-2">
              Reviews become available after you complete a coaching booking.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}

