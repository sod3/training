"use client";
import { useState } from "react";
import Link from "next/link";
import { useStore } from "./store";
import { Check, ArrowRight } from "lucide-react";
export function TrainerApplication() {
  const { state, update, notify } = useStore();
  const [done, setDone] = useState(false);
  const [step, setStep] = useState(0);
  const [data, setData] = useState<Record<string, string>>({});
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const titles = [
    "About you",
    "Qualifications",
    "Specialties",
    "Training locations",
    "Availability",
    "Your profile",
    "Review & submit",
  ];
  const field = (
    label: string,
    name: string,
    type = "text",
    placeholder = "",
  ) => (
    <label className="field">
      {label}
      <input
        name={name}
        type={type}
        required
        value={data[name] || ""}
        placeholder={placeholder}
        onChange={(e) => setData({ ...data, [name]: e.target.value })}
      />
    </label>
  );
  return done ? (
    <div className="panel application-success" role="status">
      <Check size={35} />
      <h2>You’re on the list.</h2>
      <p>
        Your sample application is saved on this device. No application or
        documents were sent externally.
      </p>
      <Link className="btn" href="/dashboard/trainer">
        Explore trainer dashboard →
      </Link>
    </div>
  ) : (
    <form
      id="apply"
      className="panel application-form"
      onSubmit={(e) => {
        e.preventDefault();
        setError("");
        if (step < 6) {
          setStep(step + 1);
          return;
        }
        update({
          applications: [
            ...state.applications,
            {
              name: data.name,
              specialty: data.specialty,
              status: "Pending",
              email: data.email,
              qualifications: data.qualifications,
              location: data.location,
              availability: data.availability,
              bio: data.bio,
              documentName: fileName,
            },
          ],
        });
        setDone(true);
        notify("Demo application submitted.");
      }}
    >
      <p className="eyebrow">FOR THE PEOPLE WHO COACH · {step + 1} / 7</p>
      <div
        className="quiz-progress"
        role="progressbar"
        aria-label="Application progress"
        aria-valuenow={step + 1}
        aria-valuemin={0}
        aria-valuemax={7}
      >
        <div style={{ width: ((step + 1) / 7) * 100 + "%" }} />
      </div>
      <h2 key={step} tabIndex={-1}>
        {titles[step]}.
      </h2>
      {step === 0 && (
        <>
          {field("Full name", "name", "text", "Ahmed Raza")}
          {field("Email", "email", "email", "coach@example.com")}
        </>
      )}
      {step === 1 && (
        <>
          <label className="field">
            Your qualifications
            <textarea
              required
              name="qualifications"
              value={data.qualifications || ""}
              onChange={(e) =>
                setData({ ...data, qualifications: e.target.value })
              }
              placeholder="Certifications and coaching experience"
            />
          </label>
          <label className="field">
            Sample certificate (optional)
            <input
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.webp"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (
                  f &&
                  (![
                    "application/pdf",
                    "image/png",
                    "image/jpeg",
                    "image/webp",
                  ].includes(f.type) ||
                    f.size > 5 * 1024 * 1024)
                ) {
                  setError("Choose a PDF or image smaller than 5 MB.");
                  e.target.value = "";
                  setFileName("");
                  return;
                }
                setError("");
                setFileName(f?.name || "");
              }}
            />
          </label>
          {fileName && (
            <p className="fine-print">{fileName} · Ready for demo review</p>
          )}
          <p className="fine-print">
            Only the filename is saved. Documents stay on your device.
          </p>
        </>
      )}
      {step === 2 &&
        field(
          "Your specialty",
          "specialty",
          "text",
          "Strength, mobility, boxing…",
        )}
      {step === 3 &&
        field(
          "Training locations",
          "location",
          "text",
          "DHA, Clifton or online",
        )}
      {step === 4 && (
        <label className="field">
          Preferred availability
          <select
            required
            name="availability"
            value={data.availability || ""}
            onChange={(e) => setData({ ...data, availability: e.target.value })}
          >
            <option value="">Choose your usual hours</option>
            <option>Morning</option>
            <option>Afternoon</option>
            <option>Evening</option>
            <option>Flexible</option>
          </select>
        </label>
      )}
      {step === 5 && (
        <label className="field">
          Your coaching approach
          <textarea
            required
            name="bio"
            value={data.bio || ""}
            onChange={(e) => setData({ ...data, bio: e.target.value })}
            placeholder="Who do you help, and how do you train?"
          />
        </label>
      )}
      {step === 6 && (
        <>
          <dl className="order-details">
            {[
              ["Name", data.name],
              ["Email", data.email],
              ["Qualifications", data.qualifications],
              ["Specialty", data.specialty],
              ["Locations", data.location],
              ["Availability", data.availability],
              ["Approach", data.bio],
              ["Certificate", fileName || "Not attached"],
            ].map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
          <label className="check-label">
            <input type="checkbox" required />I understand this is a demo
            application.
          </label>
        </>
      )}
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      <div className="step-actions">
        {step > 0 && (
          <button
            type="button"
            className="btn outline"
            onClick={() => {
              setError("");
              setStep(step - 1);
            }}
          >
            Back
          </button>
        )}
        <button className="btn" disabled={!!error}>
          {step === 6 ? "Submit application" : "Continue"}
          <ArrowRight size={17} />
        </button>
      </div>
      <p className="fine-print">
        Sample details only. Your progress stays in this form while you explore
        each step.
      </p>
    </form>
  );
}

export function ContactForm() {
  const { notify } = useStore();
  const [sent, setSent] = useState(false);
  return sent ? (
    <div className="panel">
      <Check size={32} />
      <h2 className="mt-5">Your demo request is noted.</h2>
      <p className="muted mt-4">
        No message was sent externally. This prototype does not have a live
        support inbox.
      </p>
      <Link href="/trainers" className="btn mt-5">
        Explore trainers →
      </Link>
    </div>
  ) : (
    <form
      className="panel"
      onSubmit={(e) => {
        e.preventDefault();
        setSent(true);
        notify("Demo support request recorded for this session.");
      }}
    >
      <label className="field">
        Your name
        <input required />
      </label>
      <label className="field">
        Email
        <input required type="email" />
      </label>
      <label className="field">
        How can we help?
        <textarea required />
      </label>
      <button className="btn">Preview support request →</button>
      <p className="fine-print">
        Demo form. Your message is not sent to a support team.
      </p>
    </form>
  );
}
