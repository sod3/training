import { createHash, createHmac, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AuthSession, RateLimit, User } from "@/models";
import { connectDB } from "./db";
import { assert } from "./errors";
import { allowedRole, type Role } from "./rules";

export type Actor = {
  id: string;
  role: Role;
  name: string;
  email: string;
  emailVerified: boolean;
  avatar: string;
};
export const hashToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");
export const randomToken = () => randomBytes(32).toString("hex");
export function secret() {
  const value = process.env.AUTH_SECRET;
  assert(value && value.length >= 32, "Authentication is not configured", 503);
  return value;
}
export const hashPassword = (value: string) => bcrypt.hash(value, 12);
export const checkPassword = (value: string, hash: string) =>
  bcrypt.compare(value, hash);
export function appUrl() {
  const url =
    process.env.APP_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : undefined);
  assert(url, "Application URL is not configured", 503);
  const parsed = new URL(url);
  assert(
    process.env.NODE_ENV !== "production" || parsed.protocol === "https:",
    "Application requires HTTPS",
    503,
  );
  return parsed.origin;
}
export function checkOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const requestOrigin = new URL(request.url).origin;
  assert(
    origin === appUrl() || origin === requestOrigin,
    "Request origin is not allowed",
    403,
  );
}
export async function rateLimit(key: string, limit: number, minutes: number) {
  await connectDB();
  const bucket = Math.floor(Date.now() / (minutes * 60000));
  const privateKey = createHmac("sha256", secret())
    .update(`${key}:${bucket}`)
    .digest("hex");
  const expiresAt = new Date((bucket + 2) * minutes * 60000);
  let entry;
  try {
    entry = await RateLimit.findOneAndUpdate(
      { key: privateKey },
      { $inc: { count: 1 }, $setOnInsert: { expiresAt } },
      { upsert: true, returnDocument: "after" },
    );
  } catch (error) {
    if (!(
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === 11000
    ))
      throw error;
    entry = await RateLimit.findOneAndUpdate(
      { key: privateKey },
      { $inc: { count: 1 } },
      { returnDocument: "after" },
    );
  }
  assert(
    entry && entry.count <= limit,
    "Too many attempts. Please try again later.",
    429,
  );
}
export function requestIp(request: Request) {
  // Only trust Vercel's overwritten proxy header; local deployments share a bucket.
  return process.env.VERCEL
    ? request.headers.get("x-vercel-forwarded-for")?.split(",")[0].trim() ||
        "unknown"
    : "local";
}
const cookieName =
  process.env.NODE_ENV === "production"
    ? "__Host-spotter-session"
    : "spotter-session";
// Keep the browser session across restarts. The database expiry is refreshed
// on authenticated requests, so active users are not unexpectedly signed out.
const sessionLifetime = 365 * 86400000;
export async function createSession(user: {
  _id: string | import("mongoose").Types.ObjectId;
  sessionVersion: number;
}) {
  const token = randomToken();
  const expiresAt = new Date(Date.now() + sessionLifetime);
  await AuthSession.create({
    userId: user._id,
    tokenHash: hashToken(token),
    version: user.sessionVersion,
    expiresAt,
  });
  (await cookies()).set(cookieName, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
    maxAge: Math.floor(sessionLifetime / 1000),
  });
}
export async function currentUser(): Promise<Actor | null> {
  const token = (await cookies()).get(cookieName)?.value;
  if (!token || !/^[a-f\d]{64}$/.test(token)) return null;
  await connectDB();
  const session = await AuthSession.findOne({
    tokenHash: hashToken(token),
    expiresAt: { $gt: new Date() },
  }).lean();
  if (!session) return null;
  const user = await User.findById(session.userId).lean();
  if (
    !user ||
    user.status !== "ACTIVE" ||
    session.version !== user.sessionVersion
  )
    return null;
  // Sliding expiry keeps a returning user signed in while retaining a finite
  // lifetime for abandoned sessions.
  const refreshedExpiry = new Date(Date.now() + sessionLifetime);
  if (session.expiresAt.getTime() < Date.now() + 180 * 86400000) {
    await AuthSession.updateOne(
      { _id: session._id },
      { $set: { expiresAt: refreshedExpiry } },
    );
  }
  return {
    id: String(user._id),
    name: user.name,
    role: user.role as Role,
    email: user.normalizedEmail,
    emailVerified: user.emailVerified,
    avatar: user.avatar,
  };
}
export async function requireUser(roles?: Role[]) {
  const user = await currentUser();
  assert(user, "Sign in to continue", 401);
  assert(
    !roles || allowedRole(user.role, roles),
    "You do not have access to this action",
    403,
  );
  return user;
}
export async function requirePage(role?: Role) {
  const user = await currentUser();
  if (!user) redirect(role === "ADMIN" ? "/admin/login" : "/login");
  if (role && user.role !== role) redirect(homeFor(user.role));
  return user;
}
export const homeFor = (role: string) =>
  role === "ADMIN" ? "/admin" : role === "TRAINER" ? "/trainer" : "/dashboard";
export async function logout() {
  const jar = await cookies();
  const token = jar.get(cookieName)?.value;
  if (token) {
    await connectDB();
    await AuthSession.deleteOne({ tokenHash: hashToken(token) });
  }
  jar.delete(cookieName);
}
