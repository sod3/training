"use client";
import Link from "next/link";
import { ActionForm } from "@/components/dashboard/action-form";
import { useStore } from "./store";
export function TrainerApplication() {
  const { state } = useStore();
  return (
    <section className="panel">
      <h2>Build your coaching business.</h2>
      <p>
        Create your account, complete your profile, add packages and
        availability, and submit your credentials for review. You can save your
        progress and return whenever you’re ready.
      </p>
      <Link
        className="btn mt-6"
        href={
          state.role === "trainer"
            ? "/trainer/onboarding"
            : "/signup?role=trainer"
        }
      >
        {state.role === "trainer"
          ? "Continue application"
          : "Create trainer account"}{" "}
        →
      </Link>
    </section>
  );
}
export function ContactForm() {
  return (
    <section className="panel">
      <h2>We’re listening.</h2>
      <ActionForm
        endpoint="contact"
        label="Send request"
        fields={[
          { name: "name", label: "Your name", required: true },
          { name: "email", label: "Email", type: "email", required: true },
          { name: "subject", label: "Subject", required: true },
          {
            name: "message",
            label: "How can we help?",
            type: "textarea",
            required: true,
          },
        ]}
      />
    </section>
  );
}
