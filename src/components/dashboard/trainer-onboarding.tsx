"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, useApi } from "@/lib/client-api";
import {
  ActionForm,
  UploadForm,
  type UploadedFileInfo,
} from "./action-form";
import { AvailabilityPanel, PackagesPanel, record, rows, str, num, type Item } from "./panels";

const stepTitles = [
  "Professional profile",
  "Identity verification",
  "Certification",
  "Services & pricing",
  "Availability",
  "Review & submit",
];

function timezoneOptions(current: string) {
  const fallback = ["Asia/Karachi", "UTC", "Europe/London", "America/New_York", "Asia/Dubai", "Asia/Riyadh"];
  try {
    const fn = (Intl as unknown as { supportedValuesOf?: (key: string) => string[] }).supportedValuesOf;
    const values = fn?.("timeZone") || fallback;
    return current && !values.includes(current) ? [current, ...values] : values;
  } catch {
    return fallback;
  }
}

export function TrainerOnboarding() {
  const router = useRouter();
  const { data, loading, error, reload } = useApi<Item>("trainer/application");
  const [step, setStep] = useState(0);
  const [identityUpload, setIdentityUpload] = useState<UploadedFileInfo | null>(null);
  const [savingIdentity, setSavingIdentity] = useState(false);
  const [identityError, setIdentityError] = useState("");
  const [certificateUpload, setCertificateUpload] = useState<UploadedFileInfo | null>(null);
  const [updatingTz, setUpdatingTz] = useState(false);

  const application = record(data?.application);
  const trainer = record(data?.trainer);
  const account = record(data?.account);
  const catalog = record(data?.catalog);
  const packages = rows(data?.packages);
  const credentials = rows(data?.credentials);
  const rules = rows(data?.rules);
  const categories = (catalog.categories as string[]) || [];
  const specialties = (catalog.specialties as string[]) || [];
  const identity = credentials.find((item) => str(item, "type") === "IDENTITY") || (str(trainer, "cnicUploadId") ? { uploadId: str(trainer, "cnicUploadId"), verificationStatus: str(trainer, "identityVerificationStatus") || "PENDING" } : null);
  const certificates = credentials.filter((item) => str(item, "type") === "CERTIFICATION");
  const tzName = str(trainer, "timezone") || "Asia/Karachi";
  const zones = timezoneOptions(tzName);

  if (loading && !data) return <div className="container section"><div className="panel">Loading trainer onboarding…</div></div>;
  if (error && !data) return <div className="container section"><div className="panel"><h1>We could not load onboarding.</h1><p>{error}</p><button className="btn" onClick={reload}>Try again</button></div></div>;
  if (!data) return null;

  const status = str(application, "status") || str(trainer, "applicationStatus") || "DRAFT";
  const submitted = ["SUBMITTED", "UNDER_REVIEW"].includes(status);
  const approved = status === "APPROVED";

  if (approved) {
    return (
      <div className="container section narrow-page">
        <section className="panel onboarding-complete">
          <p className="eyebrow">TRAINER APPLICATION</p>
          <h1>You’re approved.</h1>
          <p>Your public trainer profile is active. You can keep your profile, services and availability up to date from the dashboard.</p>
          <button className="btn" onClick={() => router.push("/trainer")}>Open trainer dashboard</button>
        </section>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="container section narrow-page">
        <section className="panel onboarding-complete">
          <p className="eyebrow">APPLICATION {status.replaceAll("_", " ")}</p>
          <h1>Your application is with the Spotter team.</h1>
          <p>We’ll keep updates in your in-app notifications. Your profile remains private until identity, certification and the application are approved.</p>
          <button className="btn outline" onClick={() => router.push("/trainer/application")}>View application status</button>
        </section>
      </div>
    );
  }

  const profileMissing = [
    str(trainer, "displayName").length < 2 && "professional display name",
    !str(trainer, "headline") && "professional headline",
    str(trainer, "biography").length < 100 && "an About section of at least 100 characters",
    !str(trainer, "category") && "training category",
    (!(Array.isArray(trainer.specialties) && trainer.specialties.length > 0)) && "at least one specialty",
    !str(trainer, "profileImage") && "profile photo",
  ].filter(Boolean) as string[];

  const hasCnic = Boolean(identityUpload || identity || str(trainer, "cnicUploadId"));
  const identityMissing = [
    !hasCnic && "CNIC document upload",
  ].filter(Boolean) as string[];

  const checklist = [
    {
      label: "Professional profile + photo",
      done: profileMissing.length === 0,
      missing: profileMissing,
      step: 0,
    },
    {
      label: "Identity document (CNIC)",
      done: hasCnic,
      missing: identityMissing,
      step: 1,
    },
    {
      label: "Professional certification",
      done: certificates.length > 0,
      missing: certificates.length ? [] : ["at least one saved certificate"],
      step: 2,
    },
    {
      label: "Services & pricing package",
      done: packages.some((item) => item.active !== false),
      missing: packages.some((item) => item.active !== false) ? [] : ["an active coaching package"],
      step: 3,
    },
    {
      label: "Weekly availability",
      done: rules.length > 0,
      missing: rules.length ? [] : ["at least one weekly time window"],
      step: 4,
    },
  ];
  const ready = checklist.every((item) => item.done);
  const completedCount = checklist.filter((item) => item.done).length;

  const handleSaveIdentity = async () => {
    const uploadId = identityUpload?.id || str(identity || {}, "uploadId") || str(trainer, "cnicUploadId");
    if (!uploadId) {
      setIdentityError("Please upload a picture of your CNIC document first.");
      return;
    }
    setSavingIdentity(true);
    setIdentityError("");
    try {
      await api("trainer/verification", { uploadId });
      await reload();
      setIdentityUpload(null);
      setStep(2);
    } catch (e) {
      setIdentityError((e as Error).message);
    } finally {
      setSavingIdentity(false);
    }
  };

  return (
    <div className="container section onboarding-shell">
      <header className="page-heading onboarding-heading">
        <p className="eyebrow">BECOME A SPOTTER TRAINER</p>
        <h1>Build your professional profile.</h1>
        <p>Complete each section, save your progress, then submit once for admin review. You can edit normal profile details later from your dashboard.</p>
        {status === "ACTION_REQUIRED" && <div className="form-error">Action required: {str(application, "adminNotes") || "Please update the requested details and resubmit."}</div>}
      </header>

      {/* DESKTOP STEP NAVIGATION */}
      <div className="onboarding-progress desktop-onboarding-progress" aria-label="Trainer onboarding steps">
        {stepTitles.map((title, index) => (
          <button key={title} className={step === index ? "active" : step > index ? "completed" : ""} onClick={() => setStep(index)}>
            <span className="step-num">{String(index + 1).padStart(2, "0")}</span>
            <span className="step-label">{title}</span>
          </button>
        ))}
      </div>

      {/* MOBILE STEP PROGRESS HEADER */}
      <div className="mobile-onboarding-header" aria-label="Mobile onboarding progress">
        <div className="mobile-step-info">
          <span className="mobile-step-counter">STEP {step + 1} OF 6</span>
          <h2 className="mobile-step-title">{stepTitles[step]}</h2>
        </div>
        <div className="mobile-progress-track">
          <div className="mobile-progress-fill" style={{ width: `${((step + 1) / 6) * 100}%` }} />
        </div>
      </div>

      {/* STEP 1: PROFILE */}
      {step === 0 && (
        <section className="panel onboarding-card">
          <p className="eyebrow">STEP 1 OF 6</p>
          <h2>Professional profile</h2>
          <p>This is what customers use to understand who you coach and how you can help. Your photo and profile details are saved separately, and both remain editable.</p>
          <div className="onboarding-upload onboarding-upload-first">
            <h3>Profile photo <span aria-hidden="true">*</span></h3>
            <p className="muted">Upload a clear professional headshot. Once saved, it appears here whenever you return.</p>
            <UploadForm purpose="PUBLIC" field="profileImage" currentUrl={str(trainer, "profileImage")} onUploaded={() => reload()} />
          </div>
          <ActionForm
            endpoint="trainer/profile"
            onDone={reload}
            fields={[
              { name: "displayName", label: "Professional display name", value: str(trainer, "displayName") || str(account, "name"), required: true },
              { name: "headline", label: "Professional headline", value: str(trainer, "headline"), required: true, hint: "Example: Online strength & body transformation coach" },
              { name: "biography", label: "About you", type: "textarea", value: str(trainer, "biography"), required: true, hint: "Minimum 100 characters before final submission." },
              { name: "yearsExperience", label: "Years of professional experience", type: "select", options: Array.from({ length: 31 }, (_, i) => i === 30 ? "30" : String(i)), value: String(num(trainer, "yearsExperience")) },
              { name: "category", label: "Main training category", type: "select", options: categories, value: str(trainer, "category") || categories[0], required: true },
              { name: "specialties", label: "Specialties", type: "checkbox-group", options: specialties, value: (trainer.specialties as string[]) || [], required: true },
            ]}
            transform={(value) => ({
              ...value,
              yearsExperience: Number(value.yearsExperience),
              trainingGoals: [String(value.category)],
              timezone: str(trainer, "timezone") || "Asia/Karachi",
            })}
            label="Save profile details"
          />
          <div className="onboarding-next">
            {profileMissing.length > 0 && (
              <p className="onboarding-guidance">
                To continue, add {profileMissing.join(", ")}.
              </p>
            )}
            <button className="btn" onClick={() => setStep(1)} disabled={profileMissing.length > 0}>
              Continue to identity
            </button>
          </div>
        </section>
      )}

      {/* STEP 2: IDENTITY VERIFICATION */}
      {step === 1 && (
        <section className="panel onboarding-card cnic-verification-card">
          <p className="eyebrow">STEP 2 OF 6</p>
          <h2>Identity verification</h2>
          <p className="onboarding-lead-text">
            Upload a clear picture of your CNIC so the SPOTTER team can verify your identity. Your document is private and never shown publicly.
          </p>

          <div className="cnic-upload-zone">
            <div className="cnic-upload-header">
              <h3>UPLOAD CNIC</h3>
              <small className="muted">Supported formats: JPG, PNG, WebP, PDF (Up to 4 MB)</small>
            </div>

            {hasCnic ? (
              <div className="cnic-success-badge" role="status">
                <span className="cnic-check-icon">✓</span>
                <div>
                  <strong>CNIC uploaded</strong>
                  <p className="muted">
                    {identityUpload?.name || "Your identity document is stored securely for verification."}
                  </p>
                  {(identityUpload?.url || str(identity || {}, "uploadId") || str(trainer, "cnicUploadId")) && (
                    <a
                      className="text-link"
                      href={identityUpload?.url || `/api/media/${str(identity || {}, "uploadId") || str(trainer, "cnicUploadId")}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      View uploaded document →
                    </a>
                  )}
                </div>
              </div>
            ) : null}

            <UploadForm
              purpose="PRIVATE"
              pendingUpload={identityUpload}
              onUploaded={async (uploaded) => {
                setIdentityUpload(uploaded);
                setIdentityError("");
                // Auto-save CNIC link to backend upon upload completion
                try {
                  await api("trainer/verification", { uploadId: uploaded.id });
                  await reload();
                } catch {
                  // If auto-save fails, explicit Save & Continue button handles it
                }
              }}
            />
          </div>

          {identityError && (
            <p className="form-error" role="alert">
              {identityError}
            </p>
          )}

          <div className="onboarding-next">
            {!hasCnic && (
              <p className="onboarding-guidance">
                Please upload a clear picture of your CNIC to proceed.
              </p>
            )}
            <button
              className="btn"
              disabled={!hasCnic || savingIdentity}
              onClick={handleSaveIdentity}
            >
              {savingIdentity ? "Saving…" : "SAVE & CONTINUE"}
            </button>
          </div>
        </section>
      )}

      {/* STEP 3: CREDENTIALS */}
      {step === 2 && (
        <section className="panel onboarding-card">
          <p className="eyebrow">STEP 3 OF 6</p>
          <h2>Professional certification</h2>
          <p>Add at least one professional qualification. Each certificate is reviewed independently by an admin.</p>
          <div className="credential-list">
            {certificates.map((item) => (
              <article key={str(item, "_id")} className="status-card">
                <strong>{str(item, "title")}</strong>
                <span>{str(item, "issuingOrganization")}</span>
                <span className="status">{str(item, "verificationStatus")}</span>
                <a className="text-link" href={`/api/media/${str(item, "uploadId")}`}>View document →</a>
              </article>
            ))}
          </div>
          <UploadForm purpose="PRIVATE" pendingUpload={certificateUpload} onUploaded={setCertificateUpload} />
          <ActionForm
            endpoint="trainer/credentials"
            onDone={() => { setCertificateUpload(null); reload(); setStep(3); }}
            fields={[
              { name: "title", label: "Certificate / qualification title", required: true },
              { name: "issuingOrganization", label: "Issuing organization", required: true },
              { name: "credentialNumber", label: "Credential / licence number" },
              { name: "issueDate", label: "Issue date", type: "date" },
              { name: "expiryDate", label: "Expiry date (if applicable)", type: "date" },
            ]}
            transform={(value) => ({ ...value, type: "CERTIFICATION", uploadId: certificateUpload?.id, credentialNumber: value.credentialNumber || undefined, issueDate: value.issueDate || undefined, expiryDate: value.expiryDate || undefined })}
            label="Add certification & continue"
            disabled={!certificateUpload}
          />
          {!certificateUpload && <p className="onboarding-guidance">Upload the certificate file before adding a new certification.</p>}
        </section>
      )}

      {/* STEP 4: SERVICES & PRICING */}
      {step === 3 && (
        <div className="onboarding-card-stack">
          <div className="panel">
            <p className="eyebrow">STEP 4 OF 6</p>
            <h2>Services & pricing</h2>
            <p>Define your session duration, single session price, and packages. Prices are entered in PKR and existing bookings keep their original price snapshot.</p>
          </div>
          <PackagesPanel items={packages} reload={reload} />
          <div className="onboarding-next">
            <button className="btn" onClick={() => setStep(4)} disabled={!packages.some((item) => item.active !== false)}>
              Continue to availability
            </button>
          </div>
        </div>
      )}

      {/* STEP 5: AVAILABILITY & TIMEZONE */}
      {step === 4 && (
        <div className="onboarding-card-stack">
          <div className="panel">
            <p className="eyebrow">STEP 5 OF 6</p>
            <h2>Availability & Timezone</h2>
            <p>Set your primary operating timezone and the weekly times you can deliver online sessions. Customers automatically see booking slots converted to their local time.</p>

            <div className="timezone-setting-box" style={{ marginTop: "1.5rem", marginBottom: "1rem" }}>
              <label className="field">
                Primary coaching timezone
                <select
                  value={str(trainer, "timezone") || "Asia/Karachi"}
                  disabled={updatingTz}
                  onChange={async (e) => {
                    const newTz = e.target.value;
                    setUpdatingTz(true);
                    try {
                      await api("trainer/profile", {
                        displayName: str(trainer, "displayName") || str(account, "name"),
                        headline: str(trainer, "headline") || "Trainer",
                        biography: str(trainer, "biography") || "Biography",
                        yearsExperience: num(trainer, "yearsExperience"),
                        category: str(trainer, "category") || categories[0],
                        specialties: (trainer.specialties as string[]) || [],
                        trainingGoals: [str(trainer, "category") || categories[0]],
                        timezone: newTz,
                      });
                      await reload();
                    } catch (err) {
                      window.alert((err as Error).message);
                    } finally {
                      setUpdatingTz(false);
                    }
                  }}
                >
                  {zones.map((tz) => (
                    <option key={tz} value={tz}>
                      {tz}
                    </option>
                  ))}
                </select>
                <small className="muted">Your weekly availability hours below will be interpreted using this timezone.</small>
              </label>
            </div>
          </div>
          <AvailabilityPanel data={{ ...data, timezone: str(trainer, "timezone"), rules }} reload={reload} />
          <div className="onboarding-next">
            <button className="btn" onClick={() => setStep(5)} disabled={!rules.length}>
              Review application
            </button>
          </div>
        </div>
      )}

      {/* STEP 6: REVIEW & SUBMIT */}
      {step === 5 && (
        <section className="panel onboarding-card review-submit-card">
          <p className="eyebrow">STEP 6 OF 6</p>
          <h2>Review & submit</h2>
          <p>Submitting locks the application for review. You will receive status updates in your Spotter notifications.</p>
          <p className="onboarding-summary"><strong>{completedCount} of {checklist.length} sections complete.</strong> Each incomplete row tells you exactly what remains.</p>
          <div className="application-checklist">
            {checklist.map((item) => (
              <div key={item.label} className={item.done ? "done" : "missing"}>
                <span>{item.done ? "✓" : "!"}</span>
                <div>
                  <strong>{item.label}</strong>
                  {!item.done && <small>Still needed: {item.missing.join(", ")}.</small>}
                </div>
                {!item.done && (
                  <button className="text-link" onClick={() => setStep(item.step)}>
                    Fix this section →
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            className="btn"
            disabled={!ready}
            onClick={async () => {
              try {
                await api("trainer/application", { step: 6, submit: true });
                await reload();
                router.push("/trainer/application");
              } catch (e) {
                window.alert((e as Error).message);
              }
            }}
          >
            Submit application for review
          </button>
          {!ready && <p className="onboarding-guidance">Finish the highlighted sections above before submitting. Your completed sections and uploaded files are already saved.</p>}
        </section>
      )}
    </div>
  );
}
