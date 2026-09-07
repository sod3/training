"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api, useApi } from "@/lib/client-api";
import {
  ActionForm,
  UploadForm,
  type UploadedFileInfo,
} from "./action-form";
import { AvailabilityPanel, PackagesPanel, record, rows, str, num, type Item } from "./panels";

const steps = [
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
  const [identityUpload, setIdentityUpload] = useState<UploadedFileInfo | null>(
    null,
  );
  const [certificateUpload, setCertificateUpload] =
    useState<UploadedFileInfo | null>(null);
  const application = record(data?.application);
  const trainer = record(data?.trainer);
  const account = record(data?.account);
  const catalog = record(data?.catalog);
  const packages = rows(data?.packages);
  const credentials = rows(data?.credentials);
  const rules = rows(data?.rules);
  const categories = (catalog.categories as string[]) || [];
  const specialties = (catalog.specialties as string[]) || [];
  const languages = (catalog.languages as string[]) || [];
  const identity = credentials.find((item) => str(item, "type") === "IDENTITY");
  const certificates = credentials.filter((item) => str(item, "type") === "CERTIFICATION");
  const zones = useMemo(() => timezoneOptions(str(trainer, "timezone") || "Asia/Karachi"), [trainer]);

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
    (!(Array.isArray(trainer.languages) && trainer.languages.length > 0)) && "at least one coaching language",
    !str(trainer, "profileImage") && "profile photo",
  ].filter(Boolean) as string[];
  const identityMissing = [
    !str(trainer, "legalName") && "legal name",
    !str(trainer, "phone") && "phone number",
    !str(trainer, "cnic") && "CNIC number",
    !identity && "saved CNIC document",
  ].filter(Boolean) as string[];
  const checklist = [
    {
      label: "Professional profile + photo",
      done: profileMissing.length === 0,
      missing: profileMissing,
      step: 0,
    },
    {
      label: "Identity details + CNIC",
      done: identityMissing.length === 0,
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
      label: "At least one active service",
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

  return (
    <div className="container section onboarding-shell">
      <header className="page-heading onboarding-heading">
        <p className="eyebrow">BECOME A SPOTTER TRAINER</p>
        <h1>Build your professional profile.</h1>
        <p>Complete each section, save your progress, then submit once for admin review. You can edit normal profile details later from your dashboard.</p>
        {status === "ACTION_REQUIRED" && <div className="form-error">Action required: {str(application, "adminNotes") || "Please update the requested details and resubmit."}</div>}
      </header>

      <div className="onboarding-progress" aria-label="Trainer onboarding steps">
        {steps.map((label, index) => (
          <button key={label} className={step === index ? "active" : ""} onClick={() => setStep(index)}>
            <span>{index + 1}</span>{label}
          </button>
        ))}
      </div>

      {step === 0 && (
        <section className="panel onboarding-card">
          <p className="eyebrow">STEP 1 OF 6</p>
          <h2>Professional profile</h2>
          <p>This is what customers use to understand who you coach and how you can help. Your photo and profile details are saved separately, and both remain editable.</p>
          <div className="onboarding-upload onboarding-upload-first"><h3>Profile photo <span aria-hidden="true">*</span></h3><p className="muted">Upload a clear professional headshot. Once saved, it appears here whenever you return.</p><UploadForm purpose="PUBLIC" field="profileImage" currentUrl={str(trainer, "profileImage")} onUploaded={() => reload()} /></div>
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
              { name: "languages", label: "Languages you coach in", type: "checkbox-group", options: languages, value: (trainer.languages as string[]) || [], required: true },
              { name: "timezone", label: "Your timezone", type: "select", options: zones, value: str(trainer, "timezone") || "Asia/Karachi", required: true },
            ]}
            transform={(value) => ({ ...value, yearsExperience: Number(value.yearsExperience), trainingGoals: [String(value.category)] })}
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

      {step === 1 && (
        <section className="panel onboarding-card">
          <p className="eyebrow">STEP 2 OF 6</p>
          <h2>Identity verification</h2>
          <p>Your CNIC and identity details are private. They are visible only to authorized administrators for verification and are never shown publicly.</p>
          {identity && <div className="status-card"><strong>Current identity document</strong><span className="status">{str(identity, "verificationStatus")}</span><a className="text-link" href={`/api/media/${str(identity, "uploadId")}`}>View submitted CNIC →</a></div>}
          <UploadForm purpose="PRIVATE" pendingUpload={identityUpload} onUploaded={setIdentityUpload} />
          <ActionForm
            endpoint="trainer/verification"
            onDone={() => { setIdentityUpload(null); reload(); setStep(2); }}
            fields={[
              { name: "name", label: "Legal full name", value: str(trainer, "legalName") || str(account, "name"), required: true },
              { name: "phone", label: "Phone number", value: str(trainer, "phone") || str(account, "phone"), required: true },
              { name: "cnic", label: "CNIC number", value: str(trainer, "cnic"), required: true, hint: "Format: 12345-1234567-1" },
            ]}
            transform={(value) => ({ ...value, uploadId: identityUpload?.id || str(identity || {}, "uploadId") })}
            label="Save identity & continue"
            disabled={!identityUpload && !identity}
          />
          {!identityUpload && !identity && <p className="onboarding-guidance">Upload your CNIC document before saving identity details.</p>}
        </section>
      )}

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

      {step === 3 && (
        <div className="onboarding-card-stack">
          <div className="panel"><p className="eyebrow">STEP 4 OF 6</p><h2>Services & pricing</h2><p>Create at least one online coaching package. Prices are entered in PKR and existing bookings keep their original price snapshot.</p></div>
          <PackagesPanel items={packages} reload={reload} />
          <button className="btn" onClick={() => setStep(4)} disabled={!packages.some((item) => item.active !== false)}>Continue to availability</button>
        </div>
      )}

      {step === 4 && (
        <div className="onboarding-card-stack">
          <div className="panel"><p className="eyebrow">STEP 5 OF 6</p><h2>Availability</h2><p>Set the weekly times you can deliver online sessions. Customers automatically receive available times generated from this schedule.</p></div>
          <AvailabilityPanel data={{ ...data, timezone: str(trainer, "timezone"), rules }} reload={reload} />
          <button className="btn" onClick={() => setStep(5)} disabled={!rules.length}>Review application</button>
        </div>
      )}

      {step === 5 && (
        <section className="panel onboarding-card review-submit-card">
          <p className="eyebrow">STEP 6 OF 6</p>
          <h2>Review & submit</h2>
          <p>Submitting locks the application for review. You will receive status updates in your Spotter notifications.</p>
          <p className="onboarding-summary"><strong>{completedCount} of {checklist.length} sections complete.</strong> Each incomplete row tells you exactly what remains.</p>
          <div className="application-checklist">
            {checklist.map((item) => <div key={item.label} className={item.done ? "done" : "missing"}><span>{item.done ? "✓" : "!"}</span><div><strong>{item.label}</strong>{!item.done && <small>Still needed: {item.missing.join(", ")}.</small>}</div>{!item.done && <button className="text-link" onClick={() => setStep(item.step)}>Fix this section →</button>}</div>)}
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
