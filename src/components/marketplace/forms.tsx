"use client";
import { useState } from "react";
import Link from "next/link";
import { useStore } from "./store";
import { Check, ArrowRight } from "lucide-react";
export function TrainerApplication() {
  const { state, update, notify } = useStore();
  const [done, setDone] = useState(false);
  return done ? (
    <div className="panel application-success">
      <Check size={35} />
      <h2>You’re on the list.</h2>
      <p>
        Your sample application is saved in this demo. Explore the trainer
        workspace while you’re here.
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
        const f = new FormData(e.currentTarget);
        update({
          applications: [
            ...state.applications,
            {
              name: String(f.get("name")),
              specialty: String(f.get("specialty")),
              status: "Pending",
            },
          ],
        });
        setDone(true);
        notify("Demo application submitted.");
      }}
    >
      <p className="eyebrow">LET’S GET TO KNOW YOU</p>
      <h2>Bring your expertise.</h2>
      <label className="field">
        Full name
        <input name="name" required autoComplete="name" />
      </label>
      <label className="field">
        Email
        <input name="email" type="email" required autoComplete="email" />
      </label>
      <label className="field">
        Your specialty
        <input
          name="specialty"
          required
          placeholder="Strength, mobility, women’s fitness…"
        />
      </label>
      <label className="field">
        Your qualifications
        <textarea
          name="qualifications"
          required
          placeholder="Tell us about your certifications and coaching experience."
        />
      </label>
      <label className="check-label">
        <input type="checkbox" required />I understand this is a demo
        application.
      </label>
      <button className="btn w-full mt-6">
        Submit application <ArrowRight size={17} />
      </button>
      <p className="fine-print">
        Saved on this device. No documents or real identity information needed.
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
