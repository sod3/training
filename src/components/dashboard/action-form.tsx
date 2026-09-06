"use client";
import { useState } from "react";
import { api } from "@/lib/client-api";
export type Field = {
  name: string;
  label: string;
  type?:
    | "text"
    | "number"
    | "password"
    | "email"
    | "textarea"
    | "select"
    | "checkbox"
    | "date"
    | "datetime-local"
    | "time";
  options?: string[];
  value?: string | number | boolean;
  required?: boolean;
  min?: number;
  max?: number;
  hint?: string;
};
export function ActionForm({
  endpoint,
  fields,
  label = "Save changes",
  onDone,
  transform,
  confirmation,
  method = "POST",
}: {
  endpoint: string;
  fields: Field[];
  label?: string;
  onDone?: () => void;
  transform?: (data: Record<string, unknown>) => unknown;
  confirmation?: string;
  method?: string;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  return (
    <form
      className="workspace-form"
      onSubmit={async (e) => {
        e.preventDefault();
        if (pending || (confirmation && !window.confirm(confirmation))) return;
        const form = e.currentTarget;
        const values = new FormData(form);
        const input: Record<string, unknown> = {};
        fields.forEach((field) => {
          input[field.name] =
            field.type === "checkbox"
              ? values.get(field.name) === "on"
              : field.type === "number"
                ? Number(values.get(field.name))
                : String(values.get(field.name) || "");
        });
        setPending(true);
        setError("");
        setSuccess("");
        try {
          const result = await api<{ message?: string }>(
            endpoint,
            transform ? transform(input) : input,
            method,
          );
          setSuccess(result.message || "Saved successfully.");
          onDone?.();
        } catch (e) {
          setError((e as Error).message);
        } finally {
          setPending(false);
        }
      }}
    >
      {fields.map((field) => (
        <label
          className={field.type === "checkbox" ? "check-label" : "field"}
          key={field.name}
        >
          {field.label}
          {field.type === "textarea" ? (
            <textarea
              name={field.name}
              defaultValue={String(field.value || "")}
              required={field.required}
              rows={4}
              maxLength={5000}
            />
          ) : field.type === "select" ? (
            <select
              name={field.name}
              defaultValue={String(field.value || field.options?.[0] || "")}
              required={field.required}
            >
              {field.options?.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          ) : field.type === "checkbox" ? (
            <input
              type="checkbox"
              name={field.name}
              defaultChecked={!!field.value}
            />
          ) : (
            <input
              name={field.name}
              type={field.type || "text"}
              defaultValue={String(field.value ?? "")}
              required={field.required}
              min={field.min}
              max={field.max}
              maxLength={field.type === "password" ? 72 : 5000}
            />
          )}
          {field.hint && <small>{field.hint}</small>}
        </label>
      ))}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {success && <p role="status">{success}</p>}
      <button className="btn small" disabled={pending}>
        {pending ? "Saving…" : label}
      </button>
    </form>
  );
}
export function UploadForm({
  purpose,
  field,
  onUploaded,
}: {
  purpose: "PUBLIC" | "PRIVATE";
  field?: "avatar" | "profileImage" | "coverImage";
  onUploaded?: (id: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  return (
    <form
      className="workspace-form"
      onSubmit={async (e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        data.set("purpose", purpose);
        setBusy(true);
        setMessage("");
        try {
          const response = await fetch("/api/uploads", {
            method: "POST",
            body: data,
          });
          const result = await response.json();
          if (!response.ok) throw new Error(result.error);
          if (field) await api("media", { uploadId: result.id, field });
          onUploaded?.(result.id);
          setMessage("File uploaded.");
        } catch (e) {
          setMessage((e as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <label className="field">
        {field
          ? field === "coverImage"
            ? "Cover image"
            : "Profile image"
          : "Verification document"}
        <input
          name="file"
          type="file"
          required
          accept={
            purpose === "PRIVATE"
              ? ".pdf,.jpg,.jpeg,.png,.webp"
              : ".jpg,.jpeg,.png,.webp"
          }
        />
        <small>
          Up to 4 MB. JPG, PNG, WebP{purpose === "PRIVATE" ? " or PDF" : ""}.
        </small>
      </label>
      <button className="btn outline small" disabled={busy}>
        {busy ? "Uploading…" : "Upload file"}
      </button>
      {message && <p role="status">{message}</p>}
    </form>
  );
}
