"use client";
import { useRef, useState } from "react";
import { api, apiResult } from "@/lib/client-api";
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
    | "checkbox-group"
    | "date"
    | "datetime-local"
    | "time";
  options?: string[];
  value?: string | number | boolean | string[];
  required?: boolean;
  min?: number;
  max?: number;
  step?: number;
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
  disabled = false,
}: {
  endpoint: string;
  fields: Field[];
  label?: string;
  onDone?: () => void;
  transform?: (data: Record<string, unknown>) => unknown;
  confirmation?: string;
  method?: string;
  disabled?: boolean;
}) {
  const [pending, setPending] = useState(false);
  const submitting = useRef(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  return (
    <form
      className="workspace-form"
      onSubmit={async (e) => {
        e.preventDefault();
        if (
          submitting.current ||
          pending ||
          disabled ||
          (confirmation && !window.confirm(confirmation))
        )
          return;
        const form = e.currentTarget;
        const values = new FormData(form);
        const input: Record<string, unknown> = {};
        fields.forEach((field) => {
          input[field.name] =
            field.type === "checkbox-group"
              ? values.getAll(field.name)
              : field.type === "checkbox"
                ? values.get(field.name) === "on"
                : field.type === "number"
                  ? Number(values.get(field.name))
                  : String(values.get(field.name) || "");
        });
        submitting.current = true;
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
          submitting.current = false;
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
          ) : field.type === "checkbox-group" ? (
            <div
              className="checkbox-group"
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.5rem",
                marginTop: "0.5rem",
              }}
            >
              {field.options?.map((opt) => (
                <label
                  key={opt}
                  className="check-label"
                  style={{ fontWeight: "normal" }}
                >
                  <input
                    type="checkbox"
                    name={field.name}
                    value={opt}
                    defaultChecked={
                      Array.isArray(field.value)
                        ? field.value.includes(opt)
                        : String(field.value || "").includes(opt)
                    }
                  />
                  {opt}
                </label>
              ))}
            </div>
          ) : (
            <input
              name={field.name}
              type={field.type || "text"}
              defaultValue={String(field.value ?? "")}
              required={field.required}
              min={field.min}
              max={field.max}
              step={field.step}
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
      <button className="btn small" disabled={pending || disabled}>
        {pending ? "Saving…" : label}
      </button>
    </form>
  );
}
export function UploadForm({
  purpose,
  field,
  currentUrl,
  pendingUpload,
  onUploaded,
}: {
  purpose: "PUBLIC" | "PRIVATE";
  field?: "avatar" | "profileImage" | "coverImage";
  currentUrl?: string;
  pendingUpload?: UploadedFileInfo | null;
  onUploaded?: (file: UploadedFileInfo) => void | Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const uploading = useRef(false);
  const [message, setMessage] = useState("");
  const [selectedName, setSelectedName] = useState("");
  const [lastUploaded, setLastUploaded] = useState<UploadedFileInfo | null>(
    null,
  );
  const savedFile = pendingUpload || lastUploaded;
  const visibleUrl = savedFile?.url || currentUrl;
  return (
    <div className="upload-control">
      {(visibleUrl || savedFile) && (
        <div className="uploaded-file-card" aria-live="polite">
          {field && visibleUrl ? (
            // The media endpoint verifies ownership for unattached files and
            // serves attached public images with the correct content type.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={visibleUrl} alt="Your uploaded profile" />
          ) : (
            <span className="uploaded-file-icon" aria-hidden="true">✓</span>
          )}
          <div>
            <strong>
              {field
                ? "Photo saved to your profile"
                : "Document uploaded and ready to save"}
            </strong>
            <small>{savedFile?.name || (field ? "Current profile photo" : "Uploaded document")}</small>
            {visibleUrl && (
              <a className="text-link" href={visibleUrl} target="_blank" rel="noreferrer">
                {field ? "View full photo" : "View uploaded file"} →
              </a>
            )}
          </div>
        </div>
      )}
      <form
        className="workspace-form upload-form"
        onSubmit={async (e) => {
          e.preventDefault();
          if (uploading.current || busy) return;
          const form = e.currentTarget;
          const data = new FormData(form);
          const file = data.get("file");
          if (!(file instanceof File) || !file.size) {
            setMessage("Choose a file first.");
            return;
          }
          data.set("purpose", purpose);
          uploading.current = true;
          setBusy(true);
          setMessage("");
          try {
            const response = await fetch("/api/uploads", {
              method: "POST",
              body: data,
            });
            const result = await apiResult<{ id: string; url?: string }>(response);
            let url = result.url || `/api/media/${result.id}`;
            if (field) {
              const attached = await api<{ url: string }>("media", {
                uploadId: result.id,
                field,
              });
              url = attached.url;
            }
            const uploaded = { id: result.id, name: file.name, url };
            setLastUploaded(uploaded);
            setSelectedName("");
            form.reset();
            await onUploaded?.(uploaded);
            setMessage(
              field
                ? "Upload complete — this photo is saved to your profile."
                : "Upload complete — now save the details below.",
            );
          } catch (e) {
            setMessage((e as Error).message);
          } finally {
            uploading.current = false;
            setBusy(false);
          }
        }}
      >
        <label className="field">
          {field
            ? currentUrl || savedFile
              ? "Replace profile photo"
              : "Choose profile photo"
            : savedFile
              ? "Replace document"
              : "Choose verification document"}
          <input
            name="file"
            type="file"
            required
            onChange={(event) =>
              setSelectedName(event.currentTarget.files?.[0]?.name || "")
            }
            accept={
              purpose === "PRIVATE"
                ? ".pdf,.jpg,.jpeg,.png,.webp"
                : ".jpg,.jpeg,.png,.webp"
            }
          />
          <small>
            {selectedName ? `Selected: ${selectedName}. ` : ""}
            Up to 4 MB. JPG, PNG, WebP{purpose === "PRIVATE" ? " or PDF" : ""}.
          </small>
        </label>
        <button className="btn outline small" disabled={busy || !selectedName}>
          {busy
            ? "Uploading…"
            : field && (currentUrl || savedFile)
              ? "Save replacement"
              : "Upload and save"}
        </button>
        {message && (
          <p className={message.includes("complete") ? "upload-success" : "form-error"} role="status">
            {message}
          </p>
        )}
      </form>
    </div>
  );
}

export type UploadedFileInfo = {
  id: string;
  name: string;
  url?: string;
};
