"use client";
import { useEffect, useState } from "react";
import { api, useApi } from "@/lib/client-api";
import { ActionForm, UploadForm, type Field } from "./action-form";
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
    trainingTypes: (() => {
      const types = Array.isArray(rule.trainingTypes)
        ? rule.trainingTypes
        : csv(rule.trainingTypes);
      return types.length ? types : ["gym"];
    })(),
  }));
const csv = (value: unknown) =>
  String(value || "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
export const amount = (value: unknown) =>
  new Intl.NumberFormat("en-PK", { style: "currency", currency: "PKR" }).format(
    Number(value || 0) / 100,
  );
export const date = (value: unknown) =>
  value
    ? new Date(String(value)).toLocaleString("en-PK", {
        timeZone: "Asia/Karachi",
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
        label: "Fitness goals, separated by commas",
        value: String(preferences.fitnessGoals || ""),
      },

      {
        name: "preferredTrainingTypes",
        label: "Training types, separated by commas",
        value: String(preferences.preferredTrainingTypes || ""),
      },
      {
        name: "preferredSchedule",
        label: "Preferred schedule",
        value: str(preferences, "preferredSchedule"),
      },
      {
        name: "timezone",
        label: "Timezone",
        value: str(preferences, "timezone") || "Asia/Karachi",
      },
      {
        name: "emailNotifications",
        label: "Email notifications",
        type: "checkbox",
        value: record(preferences.notificationPreferences).email !== false,
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
                  fitnessGoals: csv(v.fitnessGoals),
                  preferredTrainingTypes: csv(v.preferredTrainingTypes),
                }
              : {}),
          })}
        />
        <UploadForm purpose="PUBLIC" field="avatar" onUploaded={reload} />
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
                type: "number",
                value: num(trainer, "yearsExperience"),
                min: 0,
                max: 80,
              },
              ...[
                "specialties",
                "trainingGoals",
                "trainingTypes",
                "serviceAreas",
                "languages",
              ].map((name) => ({
                name,
                label: `${name.replace(/([A-Z])/g, " $1")} (comma separated)`,
                value: String(trainer[name] || ""),
                hint:
                  name === "trainingTypes"
                    ? "home, gym, outdoor, online"
                    : undefined,
              })),
              { name: "city", label: "City", value: str(trainer, "city") },
              {
                name: "timezone",
                label: "Timezone",
                value: str(trainer, "timezone") || "Asia/Karachi",
              },
            ]}
            transform={(v) => ({
              ...v,
              specialties: csv(v.specialties),
              trainingGoals: csv(v.trainingGoals),
              trainingTypes: csv(v.trainingTypes),
              serviceAreas: csv(v.serviceAreas),
              languages: csv(v.languages),
            })}
          />
          <UploadForm
            purpose="PUBLIC"
            field="profileImage"
            onUploaded={reload}
          />
          <UploadForm purpose="PUBLIC" field="coverImage" onUploaded={reload} />
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
  return (
    <>
      <section className="panel">
        <h2>Your weekly schedule</h2>
        <p>
          Times are in {str(data, "timezone")}. An end earlier than the start
          continues into the following day. Existing bookings remain scheduled.
        </p>
        {rules.map((r, i) => (
          <div className="schedule-rule" key={i}>
            <label className="field">
              Day
              <select
                value={num(r, "dayOfWeek")}
                onChange={(e) => set(i, "dayOfWeek", Number(e.target.value))}
              >
                {[
                  "Sunday",
                  "Monday",
                  "Tuesday",
                  "Wednesday",
                  "Thursday",
                  "Friday",
                  "Saturday",
                ].map((d, n) => (
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
            <label className="field">
              Training types
              <input
                value={String(r.trainingTypes || "")}
                onChange={(e) => set(i, "trainingTypes", csv(e.target.value))}
              />
            </label>
            <button
              className="text-link"
              onClick={() => setRules(rules.filter((_, n) => n !== i))}
            >
              Remove
            </button>
          </div>
        ))}
        <div className="workspace-actions">
          <button
            className="btn outline small"
            disabled={rules.length >= 28}
            onClick={() =>
              setRules([
                ...rules,
                {
                  dayOfWeek: 1,
                  startTime: "09:00",
                  endTime: "17:00",
                  trainingTypes: ["gym"],
                },
              ])
            }
          >
            Add time window
          </button>
          <button
            className="btn small"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                const result = await api<{ message: string }>(
                  "trainer/availability",
                  {
                    rules: rules.map((r) => ({
                      dayOfWeek: num(r, "dayOfWeek"),
                      startTime: str(r, "startTime"),
                      endTime: str(r, "endTime"),
                      trainingTypes: r.trainingTypes,
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
            {
              name: "trainingTypes",
              label: "Training types, comma separated",
              value: "gym",
            },
          ]}
          transform={(v) => ({
            ...v,
            start: new Date(String(v.start)).toISOString(),
            end: new Date(String(v.end)).toISOString(),
            trainingTypes: csv(v.trainingTypes),
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
    <section className="panel">
      <h2>Simple verification</h2>
      <p>
        Send these four details once. An admin will review and publish your
        profile.
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
            const upload = new FormData();
            upload.set("purpose", "PRIVATE");
            upload.set("file", file as File);
            const response = await fetch("/api/uploads", {
              method: "POST",
              body: upload,
            });
            const uploaded = await response.json();
            if (!response.ok) throw new Error(uploaded.error);
            const result = await api<{ message: string }>(
              "trainer/verification",
              {
                name: values.get("name"),
                phone: values.get("phone"),
                cnic: values.get("cnic"),
                uploadId: uploaded.id,
              },
            );
            setMessage(result.message);
            reload();
          } catch (error) {
            setMessage((error as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <label className="field">
          Full name
          <input
            name="name"
            required
            defaultValue={str(trainer, "displayName")}
            maxLength={170}
          />
        </label>
        <label className="field">
          Phone number
          <input
            name="phone"
            required
            defaultValue={str(trainer, "phone")}
            maxLength={30}
          />
        </label>
        <label className="field">
          CNIC number
          <input
            name="cnic"
            required
            defaultValue={str(trainer, "cnic")}
            placeholder="12345-1234567-1"
            pattern="[0-9]{5}-[0-9]{7}-[0-9]"
          />
        </label>
        <label className="field">
          CNIC picture
          <input
            name="cnicPicture"
            type="file"
            required
            accept=".jpg,.jpeg,.png,.webp"
          />
          <small>JPG, PNG, or WebP. Maximum 4 MB.</small>
        </label>
        {message && <p role="status">{message}</p>}
        <button className="btn" disabled={busy}>
          {busy ? "Submitting…" : "Submit verification"}
        </button>
      </form>
      {str(trainer, "cnicUploadId") && (
        <a
          className="text-link"
          href={`/api/media/${str(trainer, "cnicUploadId")}`}
        >
          View submitted CNIC picture
        </a>
      )}
    </section>
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
            <button className="text-link" onClick={reloadMessages}>
              Refresh messages
            </button>
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
