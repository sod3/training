"use client";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { api } from "@/lib/client-api";
export function AuthForm({
  signup = false,
  initialRole = "customer",
  mode,
}: {
  signup?: boolean;
  initialRole?: string;
  mode?: "forgot-password" | "reset-password";
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [visible, setVisible] = useState(false);
  return (
    <div className="auth-page">
      <div className="auth-photo">
        <Image
          src="/images/coaching.webp"
          alt="Focused personal training"
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
        <p className="eyebrow">{signup && initialRole === "trainer" ? "TRAINER APPLICATION · STEP 1" : "YOUR NEXT CHAPTER"}</p>
        <h1>
          {mode === "forgot-password"
            ? "Find your way back."
            : mode === "reset-password"
              ? "A fresh start."
              : signup
                  ? initialRole === "trainer"
                    ? "Create your trainer account."
                    : "Start training differently."
                  : "Welcome back."}
        </h1>
        <p>
          {mode === "forgot-password"
            ? "No email verification is required on Spotter. Submit your sign-in email and support can issue a secure one-time reset link after account verification."
            : signup
              ? initialRole === "trainer"
                ? "Next you’ll complete your professional profile, CNIC verification, certification, services, pricing and availability before submitting for admin review."
                : "Make a little space for your goals."
              : "Your people, your sessions, your progress."}
        </p>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (busy) return;
            setBusy(true);
            setError("");
            const f = new FormData(e.currentTarget);
            const params = new URLSearchParams(window.location.search);
            try {
              const body =
                mode === "reset-password"
                  ? {
                        token: params.get("token"),
                        password: f.get("password"),
                        confirmPassword: f.get("confirmPassword"),
                    }
                  : mode === "forgot-password"
                    ? { email: f.get("email") }
                      : signup
                        ? {
                            firstName: f.get("firstName"),
                            lastName: f.get("lastName"),
                            email: f.get("email"),
                            password: f.get("password"),
                            confirmPassword: f.get("confirmPassword"),
                            role:
                              initialRole === "trainer"
                                ? "TRAINER"
                                : "CUSTOMER",
                            terms: f.get("terms") === "on",
                          }
                        : {
                            email: f.get("email"),
                            password: f.get("password"),
                          };
              const result = await api<{ redirect?: string; message?: string }>(
                `auth/${mode || (signup ? "signup" : "login")}`,
                body,
              );
              if (result.redirect) {
                const save = params.get("save");
                if (
                  save &&
                  /^[a-f\d]{24}$/.test(save) &&
                  result.redirect === "/dashboard"
                )
                  await api("favorites", { trainerId: save, saved: true });
                const next = params.get("next");
                const safe =
                  next &&
                  next.startsWith("/") &&
                  !next.startsWith("//") &&
                  !next.includes("\\")
                    ? next
                    : result.redirect;
                window.location.assign(safe);
              } else setMessage(result.message || "Done.");
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          {signup && (
            <>
              <label className="field">
                First name
                <input
                  name="firstName"
                  required
                  autoComplete="given-name"
                  maxLength={80}
                />
              </label>
              <label className="field">
                Last name
                <input
                  name="lastName"
                  required
                  autoComplete="family-name"
                  maxLength={80}
                />
              </label>
            </>
          )}
          {mode !== "reset-password" && (
            <label className="field">
              Email
              <input
                name="email"
                type="email"
                required
                autoComplete="email"
                maxLength={254}
              />
            </label>
          )}
          {mode !== "forgot-password" && (
            <>
              <label className="field">
                Password
                <input
                  name="password"
                  type={visible ? "text" : "password"}
                  required
                  minLength={signup || mode ? 12 : 1}
                  maxLength={72}
                  autoComplete={
                    signup || mode ? "new-password" : "current-password"
                  }
                />
              </label>
              <button
                className="text-link"
                type="button"
                onClick={() => setVisible(!visible)}
              >
                {visible ? "Hide password" : "Show password"}
              </button>
            </>
          )}
          {(signup || mode === "reset-password") && (
            <label className="field">
              Confirm password
              <input
                type="password"
                name="confirmPassword"
                required
                minLength={12}
                maxLength={72}
                autoComplete="new-password"
              />
            </label>
          )}
          {signup && (
            <label className="check-label">
              <input type="checkbox" name="terms" required />I agree to the{" "}
              <Link href="/terms">Terms</Link> and{" "}
              <Link href="/privacy">Privacy Policy</Link>.
            </label>
          )}
          {error && (
            <p role="alert" className="form-error">
              {error}
            </p>
          )}
          {message && <p role="status">{message}</p>}
          <button
            className="btn w-full"
            disabled={busy}
            aria-label={
              mode === "forgot-password"
                ? "Request password reset"
                : mode === "reset-password"
                  ? "Update password"
                  : signup
                      ? initialRole === "trainer" ? "Create trainer account and continue" : "Create account"
                      : "Log in"
            }
          >
            {busy
              ? "Please wait…"
              : mode === "forgot-password"
                  ? "Request password reset"
                  : mode === "reset-password"
                    ? "Update password"
                    : signup
                      ? initialRole === "trainer" ? "Create trainer account and continue" : "Create account"
                      : "Log in"}{" "}
            →
          </button>
        </form>
        {!signup && !mode && (
          <Link className="text-link mt-5" href="/forgot-password">
            Forgot password?
          </Link>
        )}
        <p className="auth-switch">
          <Link href={signup || mode ? "/login" : "/signup"}>
            {signup || mode ? "Back to log in" : "Create a customer account"}
          </Link>
        </p>
        {!mode && (
          <Link className="text-link" href="/signup?role=trainer">
            Join as a trainer →
          </Link>
        )}
      </div>
    </div>
  );
}
