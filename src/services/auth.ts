import mongoose from "mongoose";
import { z } from "zod";
import {
  AuthSession,
  AuthToken,
  CustomerProfile,
  TrainerApplication,
  TrainerProfile,
  User,
} from "@/models";
import { connectDB } from "@/lib/server/db";
import { assert } from "@/lib/server/errors";
import {
  checkPassword,
  createSession,
  hashPassword,
  hashToken,
  homeFor,
  rateLimit,
  requestIp,
  requireUser,
} from "@/lib/server/security";
import {
  email,
  loginSchema,
  password,
  signupSchema,
} from "@/lib/server/validation";

async function provisionConfiguredAdmin(
  emailAddress: string,
  passwordValue: string,
) {
  if (
    process.env.ADMIN_EMAIL?.trim().toLowerCase() !== emailAddress ||
    process.env.ADMIN_PASSWORD !== passwordValue
  )
    return null;
  const existing = await User.findOne({ normalizedEmail: emailAddress }).select(
    "+passwordHash",
  );
  if (existing) return existing;
  return User.create({
    normalizedEmail: emailAddress,
    passwordHash: await hashPassword(passwordValue),
    firstName: "Spotter",
    lastName: "Admin",
    name: "Spotter Admin",
    role: "ADMIN",
    status: "ACTIVE",
    emailVerified: true,
  });
}

export async function authAction(
  action: string,
  data: unknown,
  request: Request,
) {
  await connectDB();
  await rateLimit(
    `auth:${action}:${requestIp(request)}`,
    action === "login" ? 40 : 15,
    15,
  );
  if (action === "signup") {
    const input = signupSchema.parse(data);
    await rateLimit(`signup:${input.email}`, 3, 60);
    const passwordHash = await hashPassword(input.password);
    const user = await mongoose.connection.transaction(async (session) => {
      const [user] = await User.create(
        [
          {
            firstName: input.firstName,
            lastName: input.lastName,
            name: `${input.firstName} ${input.lastName}`,
            normalizedEmail: input.email,
            passwordHash,
            role: input.role,
            emailVerified: true,
          },
        ],
        { session },
      );
      if (input.role === "TRAINER") {
        const slug = `${input.firstName}-${input.lastName}`
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "");
        const [trainer] = await TrainerProfile.create(
          [
            {
              userId: user._id,
              displayName: user.name,
              slug: `${slug || "trainer"}-${String(user._id).slice(-8)}`,
            },
          ],
          { session },
        );
        await TrainerApplication.create([{ trainerId: trainer._id }], {
          session,
        });
      } else await CustomerProfile.create([{ userId: user._id }], { session });
      return user;
    });
    await createSession(user);
    return { redirect: homeFor(user.role) };
  }
  if (action === "login") {
    const input = loginSchema.parse(data);
    await rateLimit(`login:${input.email}`, 10, 15);
    const user =
      (await User.findOne({ normalizedEmail: input.email }).select(
        "+passwordHash",
      )) || (await provisionConfiguredAdmin(input.email, input.password));
    // An equal-cost comparison also runs for unknown accounts.
    const valid = await checkPassword(
      input.password,
      user?.passwordHash ||
        "$2b$12$LQv3c1yqBWVHxkd0LHAkCOY0QJI7auVmUHATgRQa57OT/xoXBx37O",
    );
    assert(
      user && valid && user.status === "ACTIVE",
      "Email or password is incorrect",
      401,
    );
    user.lastLoginAt = new Date();
    await user.save();
    await createSession(user);
    return { redirect: homeFor(user.role) };
  }
  if (action === "forgot-password") {
    const input = z.object({ email }).strict().parse(data);
    await rateLimit(`reset:${input.email}`, 3, 60);
    const user = await User.findOne({
      normalizedEmail: input.email,
      status: "ACTIVE",
    });
    return {
      message: user
        ? "Email delivery is disabled. Contact support to reset your password."
        : "If an account exists for this email, contact support for help.",
    };
  }
  if (action === "resend-verification") {
    const user = await requireUser();
    await rateLimit(`verify:${user.id}`, 3, 60);
    return {
      message:
        "Email verification is disabled. Your account is already active.",
    };
  }
  if (action === "reset-password" || action === "verify-email") {
    const input = z
      .object({
        token: z.string().regex(/^[a-f\d]{64}$/),
        password: password.optional(),
        confirmPassword: z.string().optional(),
      })
      .strict()
      .parse(data);
    if (action === "reset-password")
      assert(
        input.password && input.password === input.confirmPassword,
        "Passwords do not match",
      );
    const passwordHash = input.password
      ? await hashPassword(input.password)
      : undefined;
    await mongoose.connection.transaction(async (session) => {
      const token = await AuthToken.findOneAndDelete(
        {
          tokenHash: hashToken(input.token),
          kind: action === "reset-password" ? "RESET" : "VERIFY",
          expiresAt: { $gt: new Date() },
        },
        { session },
      );
      assert(token, "This link is invalid or expired");
      if (action === "reset-password") {
        await User.updateOne(
          { _id: token.userId },
          { $set: { passwordHash }, $inc: { sessionVersion: 1 } },
          { session },
        );
        await AuthSession.deleteMany({ userId: token.userId }, { session });
      } else
        await User.updateOne(
          { _id: token.userId },
          { $set: { emailVerified: true } },
          { session },
        );
    });
    return {
      message:
        action === "reset-password"
          ? "Password updated. Sign in with your new password."
          : "Your email is verified.",
    };
  }
  assert(false, "Not found", 404);
}
