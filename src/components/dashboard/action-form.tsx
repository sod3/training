import { useRef, useState } from "react";
import { api, ApiError, apiResult } from "@/lib/client-api";
import { useStore } from "@/components/marketplace/store";
export type Field = {
  name: string;
  label: string;
  type?:
    | "text"
    | "number"
    | "password"
    | "email"
    | "tel"
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
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState("");
  const { confirmModal } = useStore();

  const clearFieldError = (name: string) => {
    if (fieldErrors[name]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  return (
    <form
      className="workspace-form"
      onSubmit={async (e) => {
        e.preventDefault();
        const form = e.currentTarget;
        if (submitting.current || pending || disabled) return;
        if (confirmation) {
          const confirmed = await confirmModal({
            title: "Confirm Action",
            description: confirmation,
            confirmText: "Confirm Action",
            cancelText: "Cancel",
            variant: "lime",
            icon: "help",
          });
          if (!confirmed) return;
        }
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
        setFieldErrors({});
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
          if (e instanceof ApiError) {
            setError(e.message);
            if (e.fieldErrors && Object.keys(e.fieldErrors).length > 0) {
              setFieldErrors(e.fieldErrors);
            }
          } else {
            setError((e as Error).message);
          }
        } finally {
          submitting.current = false;
          setPending(false);
        }
      }}
    >
      {fields.map((field) => {
        const fieldError = fieldErrors[field.name];
        return field.type === "checkbox-group" ? (
          <fieldset className="field checkbox-fieldset" key={field.name}>
            <legend>{field.label}</legend>
            <div className="checkbox-group">
              {field.options?.map((opt) => (
                <label key={opt} className="check-label">
                  <input
                    type="checkbox"
                    name={field.name}
                    value={opt}
                    onChange={() => clearFieldError(field.name)}
                    defaultChecked={
                      Array.isArray(field.value)
                        ? field.value.includes(opt)
                        : String(field.value || "").includes(opt)
                    }
                  />
                  <span>{opt}</span>
                </label>
              ))}
            </div>
            {field.hint && <small>{field.hint}</small>}
            {fieldError && (
              <p className="field-error-msg" role="alert">
                {fieldError}
              </p>
            )}
          </fieldset>
        ) : (
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
                className={fieldError ? "field-input-error" : undefined}
                onChange={() => clearFieldError(field.name)}
              />
            ) : field.type === "select" ? (
              <select
                name={field.name}
                defaultValue={String(field.value || field.options?.[0] || "")}
                required={field.required}
                className={fieldError ? "field-input-error" : undefined}
                onChange={() => clearFieldError(field.name)}
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
                onChange={() => clearFieldError(field.name)}
              />
            ) : (
              <input
                name={field.name}
                type={field.type || "text"}
                className={fieldError ? "field-input-error" : undefined}
                onChange={() => clearFieldError(field.name)}
                autoComplete={
                  (
                    {
                      firstName: "given-name",
                      lastName: "family-name",
                      name: "name",
                      email: "email",
                      phone: "tel",
                      currentPassword: "current-password",
                      newPassword: "new-password",
                      confirmPassword: "new-password",
                    } as Record<string, string>
                  )[field.name]
                }
                inputMode={
                  field.type === "number"
                    ? "decimal"
                    : field.name === "phone"
                      ? "tel"
                      : undefined
                }
                defaultValue={String(field.value ?? "")}
                required={field.required}
                min={field.min}
                max={field.max}
                step={field.step}
                maxLength={field.type === "password" ? 72 : 5000}
              />
            )}
            {fieldError && (
              <p className="field-error-msg" role="alert">
                {fieldError}
              </p>
            )}
            {field.hint && <small>{field.hint}</small>}
          </label>
        );
      })}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {success && (
        <p role="status" className="form-success">
          {success}
        </p>
      )}
      <button
        className="btn small"
        disabled={pending || disabled}
        aria-busy={pending}
      >
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
  const [fileError, setFileError] = useState("");
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
            // eslint-disable-next-line @next/next/no-img-element
            <img src={visibleUrl} alt="Your uploaded profile" />
          ) : (
            <span className="uploaded-file-icon" aria-hidden="true">
              ✓
            </span>
          )}
          <div>
            <strong>
              {field
                ? "Photo saved to your profile"
                : "Document uploaded and ready to save"}
            </strong>
            <small>
              {savedFile?.name ||
                (field ? "Current profile photo" : "Uploaded document")}
            </small>
            {visibleUrl && (
              <a
                className="text-link"
                href={visibleUrl}
                target="_blank"
                rel="noreferrer"
              >
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
            setFileError("Please select a file to upload.");
            return;
          }
          if (file.size > 4 * 1024 * 1024) {
            setFileError("File size is too large. Maximum allowed size is 4 MB.");
            return;
          }
          const validTypes =
            purpose === "PRIVATE"
              ? ["image/jpeg", "image/png", "image/webp", "application/pdf"]
              : ["image/jpeg", "image/png", "image/webp"];
          if (file.type && !validTypes.includes(file.type)) {
            setFileError(
              purpose === "PRIVATE"
                ? "Invalid file type. Please upload a JPG, PNG, WebP or PDF."
                : "Invalid file type. Please upload a JPG, PNG, or WebP photo.",
            );
            return;
          }
          data.set("purpose", purpose);
          uploading.current = true;
          setBusy(true);
          setMessage("");
          setFileError("");
          try {
            const response = await fetch("/api/uploads", {
              method: "POST",
              body: data,
            });
            const result = await apiResult<{ id: string; url?: string }>(
              response,
            );
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
                ? "Upload complete — photo saved to your profile."
                : "Upload complete — now save your details below.",
            );
          } catch (e) {
            if (e instanceof ApiError) setFileError(e.message);
            else setFileError((e as Error).message);
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
            className={fileError ? "field-input-error" : undefined}
            onChange={(event) => {
              const selected = event.currentTarget.files?.[0];
              setSelectedName(selected?.name || "");
              setFileError("");
              if (selected && selected.size > 4 * 1024 * 1024) {
                setFileError("File is too large. Maximum allowed size is 4 MB.");
              }
            }}
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
          {fileError && (
            <p className="field-error-msg" role="alert">
              {fileError}
            </p>
          )}
        </label>
        <button className="btn outline small" disabled={busy || !selectedName || !!fileError}>
          {busy
            ? "Uploading…"
            : field && (currentUrl || savedFile)
              ? "Save replacement"
              : "Upload and save"}
        </button>
        {message && (
          <p
            className={
              message.includes("complete") ? "upload-success" : "form-error"
            }
            role="status"
          >
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
