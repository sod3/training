import mongoose from "mongoose";
import { z } from "zod";
import {
  AuthSession,
  AuthToken,
  CustomerProfile,
  Notification,
  SupportRequest,
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
    assert(
      !(await User.exists({ normalizedEmail: input.email })),
      "An account with this email already exists",
      409,
    );
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
    return { redirect: user.role === "TRAINER" ? "/trainer/onboarding" : homeFor(user.role) };
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
    if (user.role === "TRAINER") {
      const trainer = await TrainerProfile.findOne({ userId: user._id }).select("applicationStatus").lean();
      if (trainer && ["DRAFT", "ACTION_REQUIRED", "REJECTED"].includes(trainer.applicationStatus))
        return { redirect: "/trainer/onboarding" };
      if (trainer && ["SUBMITTED", "UNDER_REVIEW"].includes(trainer.applicationStatus))
        return { redirect: "/trainer/application" };
    }
    return { redirect: homeFor(user.role) };
  }
  if (action === "forgot-password") {
    const input = z.object({ email }).strict().parse(data);
    await rateLimit(`reset:${input.email}`, 3, 60);
    const user = await User.findOne({
      normalizedEmail: input.email,
      status: "ACTIVE",
      role: { $ne: "ADMIN" },
    }).select("name normalizedEmail");
    if (user) {
      const recent = await SupportRequest.exists({
        userId: user._id,
        subject: "Account recovery request",
        status: { $in: ["OPEN", "IN_PROGRESS"] },
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      });
      if (!recent) {
        await SupportRequest.create({
          userId: user._id,
          name: user.name,
          email: user.normalizedEmail,
          subject: "Account recovery request",
          message:
            "The account owner requested a password reset from the sign-in screen. Verify the user before issuing the one-time reset link from Admin > Users or Customers.",
          status: "OPEN",
        });
        const admins = await User.find({ role: "ADMIN", status: "ACTIVE" }).select("_id").lean();
        if (admins.length)
          await Notification.insertMany(
            admins.map((admin) => ({
              userId: admin._id,
              title: "Account recovery request",
              body: `${user.name} requested help resetting their password. Verify the account before issuing a one-time link.`,
              href: "/admin/support",
            })),
          );
      }
    }
    return {
      message:
        "If an active account exists for that email, a secure recovery request has been sent to Spotter support. After verification, an administrator can issue a one-time reset link.",
    };
  }
  if (action === "reset-password") {
    const input = z
      .object({
        token: z.string().regex(/^[a-f\d]{64}$/),
        password: password.optional(),
        confirmPassword: z.string().optional(),
      })
      .strict()
      .parse(data);
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
          kind: "RESET",
          expiresAt: { $gt: new Date() },
        },
        { session },
      );
      assert(token, "This link is invalid or expired");
      await User.updateOne(
        { _id: token.userId },
        { $set: { passwordHash }, $inc: { sessionVersion: 1 } },
        { session },
      );
      await AuthSession.deleteMany({ userId: token.userId }, { session });
    });
    return { message: "Password updated. Sign in with your new password." };
  }
  assert(false, "Not found", 404);
}
