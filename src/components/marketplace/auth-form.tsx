"use client";
import { useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import Image from "next/image";
import { api, ApiError } from "@/lib/client-api";
const subscribeToHydration = () => () => {};
export function AuthForm({
  signup = false,
  initialRole = "customer",
  mode,
  admin = false,
}: {
  signup?: boolean;
  initialRole?: string;
  mode?: "forgot-password" | "reset-password";
  admin?: boolean;
}) {
  const submitting = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [visible, setVisible] = useState(false);
  const hydrated = useSyncExternalStore(
    subscribeToHydration,
    () => true,
    () => false,
  );

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
    <div className="auth-page">
      <div className="auth-photo">
        <Image
          src="/media/authentication.avif"
          alt="Focused personal training"
          fill
          priority
          quality={90}
          className="premium-image"
          sizes="50vw"
        />
        <div className="image-gradient premium-auth-gradient" />
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
          {admin
            ? "SPOTTER ADMINISTRATION"
            : signup && initialRole === "trainer"
              ? "TRAINER APPLICATION · STEP 1"
              : "YOUR NEXT CHAPTER"}
        </p>
        <h1>
          {mode === "forgot-password"
            ? "Find your way back."
            : mode === "reset-password"
              ? "A fresh start."
              : admin
                ? "Administrator sign in."
                : signup
                  ? initialRole === "trainer"
                    ? "Create your trainer account."
                    : "Start training differently."
                  : "Welcome back."}
        </h1>
        <p>
          {mode === "forgot-password"
            ? "No email verification is required on Spotter. Submit your sign-in email and support can issue a secure one-time reset link after account verification."
            : admin
              ? "Authorized team members only. Administrative actions are access-controlled and audited."
              : signup
                ? initialRole === "trainer"
                  ? "Next you’ll complete your professional profile, CNIC verification, certification, services, pricing and availability before submitting for admin review."
                  : "Make a little space for your goals."
                : "Your people, your sessions, your progress."}
        </p>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (submitting.current || busy) return;
            submitting.current = true;
            setBusy(true);
            setError("");
            setFieldErrors({});
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
                            initialRole === "trainer" ? "TRAINER" : "CUSTOMER",
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
                const next = params.get("redirect") || params.get("next");
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
                  className={fieldErrors.firstName ? "field-input-error" : undefined}
                  onChange={() => clearFieldError("firstName")}
                />
                {fieldErrors.firstName && (
                  <p className="field-error-msg" role="alert">
                    {fieldErrors.firstName}
                  </p>
                )}
              </label>
              <label className="field">
                Last name
                <input
                  name="lastName"
                  required
                  autoComplete="family-name"
                  maxLength={80}
                  className={fieldErrors.lastName ? "field-input-error" : undefined}
                  onChange={() => clearFieldError("lastName")}
                />
                {fieldErrors.lastName && (
                  <p className="field-error-msg" role="alert">
                    {fieldErrors.lastName}
                  </p>
                )}
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
                className={fieldErrors.email ? "field-input-error" : undefined}
                onChange={() => clearFieldError("email")}
              />
              {fieldErrors.email && (
                <p className="field-error-msg" role="alert">
                  {fieldErrors.email}
                </p>
              )}
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
                  className={fieldErrors.password ? "field-input-error" : undefined}
                  onChange={() => clearFieldError("password")}
                  autoComplete={
                    signup || mode ? "new-password" : "current-password"
                  }
                />
                {fieldErrors.password && (
                  <p className="field-error-msg" role="alert">
                    {fieldErrors.password}
                  </p>
                )}
              </label>
              <button
                className="text-link"
                type="button"
                aria-pressed={visible}
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
                className={fieldErrors.confirmPassword ? "field-input-error" : undefined}
                onChange={() => clearFieldError("confirmPassword")}
                autoComplete="new-password"
              />
              {fieldErrors.confirmPassword && (
                <p className="field-error-msg" role="alert">
                  {fieldErrors.confirmPassword}
                </p>
              )}
            </label>
          )}
          {signup && (
            <label className="check-label">
              <input
                type="checkbox"
                name="terms"
                required
                onChange={() => clearFieldError("terms")}
              />
              <span>
                I agree to the <Link href="/terms">Terms</Link> and{" "}
                <Link href="/privacy">Privacy Policy</Link>.
              </span>
              {fieldErrors.terms && (
                <p className="field-error-msg" role="alert">
                  {fieldErrors.terms}
                </p>
              )}
            </label>
          )}
          {error && (
            <p role="alert" className="form-error">
              {error}
            </p>
          )}
          {message && <p role="status" className="form-success">{message}</p>}
          <button
            className="btn w-full"
            disabled={busy}
            aria-busy={busy}
            aria-label={
              mode === "forgot-password"
                ? "Request password reset"
                : mode === "reset-password"
                  ? "Update password"
                  : signup
                    ? initialRole === "trainer"
                      ? "Create trainer account and continue"
                      : "Create account"
                    : admin
                      ? "Sign in to administration"
                      : "Log in"
            }
          >
            {busy
              ? mode === "forgot-password"
                ? "Requesting reset…"
                : mode === "reset-password"
                  ? "Updating password…"
                  : signup
                    ? "Creating account…"
                    : "Signing in…"
              : mode === "forgot-password"
                ? "Request password reset"
                : mode === "reset-password"
                  ? "Update password"
                  : signup
                    ? initialRole === "trainer"
                      ? "Create trainer account and continue"
                      : "Create account"
                    : admin
                      ? "Sign in to administration"
                      : "Log in"}{" "}
            →
          </button>
        </form>
        {!signup && !mode && !admin && (
          <Link className="text-link mt-5" href="/forgot-password">
            Forgot password?
          </Link>
        )}
        {!admin && (
          <p className="auth-switch">
            <Link
              href={`${signup || mode ? "/login" : "/signup"}${
                hydrated ? window.location.search : ""
              }`}
            >
              {signup || mode ? "Back to log in" : "Create a customer account"}
            </Link>
          </p>
        )}
        {!mode && !admin && (
          <Link className="text-link" href="/signup?role=trainer">
            Join as a trainer →
          </Link>
        )}
      </div>
    </div>
  );
}
