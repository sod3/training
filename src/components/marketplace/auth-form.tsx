"use client";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowRight, BadgeCheck } from "lucide-react";
import { useStore } from "./store";
export function AuthForm({
  signup = false,
  initialRole = "customer",
}: {
  signup?: boolean;
  initialRole?: string;
}) {
  const { update, notify } = useStore();
  const router = useRouter();
  const [role, setRole] = useState(
    ["customer", "trainer", "admin"].includes(initialRole)
      ? initialRole
      : "customer",
  );
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <div className="auth-page">
      <div className="auth-photo">
        <Image
          src="/images/coaching.webp"
          alt="Making time for a focused training session"
          fill
          priority
          sizes="50vw"
        />
        <div className="image-gradient" />
        <div>
          <p className="eyebrow">A LITTLE GUIDANCE. A STRONGER YOU.</p>
          <h2>
            Your goals.
            <br />
            Good company.
          </h2>
          <p>
            A coach who gets you.
            <br />A routine that fits your life.
          </p>
        </div>
      </div>
      <div className="auth-form">
        <p className="eyebrow">
          {signup ? "YOUR NEXT CHAPTER" : "BACK IN YOUR CORNER"}
        </p>
        <h1>{signup ? "Start training differently." : "Welcome back."}</h1>
        <p>
          {signup
            ? "Make a little space for your goals."
            : "Your people, your sessions, your progress."}
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setBusy(true);
            const f = new FormData(e.currentTarget);
            update({ role, name: String(f.get("name") || "Hamza") });
            localStorage.setItem("app_role", role);
            notify(
              signup
                ? "Demo account created."
                : "Welcome to your demo workspace.",
            );
            router.push(role === "admin" ? "/admin" : `/dashboard/${role}`);
          }}
        >
          {signup && (
            <label className="field">
              Name
              <input
                name="name"
                required
                autoComplete="name"
                placeholder="Your name"
              />
            </label>
          )}
          <label className="field">
            Email
            <input
              type="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
            />
          </label>
          <label className="field">
            Password
            <input
              type={visible ? "text" : "password"}
              required
              minLength={6}
              autoComplete={signup ? "new-password" : "current-password"}
              placeholder="At least 6 characters"
            />
          </label>
          <button
            className="password-toggle"
            type="button"
            aria-pressed={visible}
            onClick={() => setVisible(!visible)}
          >
            {visible ? "Hide password" : "Show password"}
          </button>
          <fieldset className="filter-group">
            <legend>Explore as</legend>
            <div className="choice-chips">
              {["customer", "trainer", "admin"].map((r) => (
                <button
                  key={r}
                  type="button"
                  aria-pressed={role === r}
                  className={role === r ? "selected" : ""}
                  onClick={() => setRole(r)}
                >
                  {r}
                </button>
              ))}
            </div>
          </fieldset>
          <button className="btn w-full" disabled={busy}>
            {busy
              ? "Opening your workspace…"
              : signup
                ? "Create demo account"
                : "Log in to demo"}
            <ArrowRight size={17} />
          </button>
        </form>
        <p className="auth-note">
          <BadgeCheck size={16} />
          Demo access only. Use sample details; no real account is created.
        </p>
        <p className="auth-switch">
          {signup ? "Already have an account?" : "New here?"}{" "}
          <Link href={signup ? "/login" : "/signup"}>
            {signup ? "Log in" : "Create an account"}
          </Link>
        </p>
        <Link href="/help" className="text-link">
          Need help accessing your account? →
        </Link>
      </div>
    </div>
  );
}
