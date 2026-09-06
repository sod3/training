import mongoose from "mongoose";
import { z } from "zod";
import {
  AuthSession,
  Conversation,
  CustomerProfile,
  Favorite,
  Message,
  Notification,
  Order,
  Review,
  SupportRequest,
  TrainerProfile,
  User,
} from "@/models";
import { assert } from "@/lib/server/errors";
import { notifyUser } from "@/lib/server/email";
import { type Actor, checkPassword, hashPassword } from "@/lib/server/security";
import { canReviewTrainer } from "@/lib/server/rules";
import { email, objectId, password, timezone } from "@/lib/server/validation";
import { publicTrainer } from "./bookings";

export async function favorite(actor: Actor, data: unknown) {
  assert(actor.role === "CUSTOMER", "Customer access required", 403);
  const input = z
    .object({ trainerId: objectId, saved: z.boolean() })
    .strict()
    .parse(data);
  if (input.saved) {
    await publicTrainer(input.trainerId);
    await Favorite.updateOne(
      { customerId: actor.id, trainerId: input.trainerId },
      { $setOnInsert: { customerId: actor.id, trainerId: input.trainerId } },
      { upsert: true },
    );
  } else
    await Favorite.deleteOne({
      customerId: actor.id,
      trainerId: input.trainerId,
    });
  return { saved: input.saved };
}
export async function createReview(actor: Actor, data: unknown) {
  const input = z
    .object({
      orderId: objectId,
      rating: z.number().int().min(1).max(5),
      review: z.string().trim().min(10).max(3000),
      trainingGoal: z.string().max(200).default(""),
    })
    .strict()
    .parse(data);
  assert(actor.role === "CUSTOMER", "Customer access required", 403);
  return mongoose.connection.transaction(async (session) => {
    const order = await Order.findById(input.orderId).session(session);
    assert(order, "Booking not found", 404);
    assert(
      canReviewTrainer(
        actor.id,
        String(order.customerId),
        order.bookingStatus === "COMPLETED" ? 1 : 0,
      ),
      "Only the customer of a completed booking can review",
      403,
    );
    await Review.create(
      [
        {
          ...input,
          customerId: actor.id,
          trainerId: order.trainerId,
          customerName: actor.name,
        },
      ],
      { session },
    );
    const trainer = await TrainerProfile.findById(order.trainerId).session(
      session,
    );
    if (trainer)
      await notifyUser(
        trainer.userId,
        "New review",
        "A client has shared their training experience.",
        "/trainer/reviews",
        session,
      );
    return { message: "Review published" };
  });
}
export async function ownConversation(actor: Actor, id: string) {
  objectId.parse(id);
  const conversation = await Conversation.findOne({
    _id: id,
    $or: [{ customerId: actor.id }, { trainerUserId: actor.id }],
  });
  assert(conversation, "Conversation not found", 404);
  return conversation;
}
export async function createConversation(actor: Actor, data: unknown) {
  assert(
    actor.role === "CUSTOMER",
    "Start conversations from your customer account",
    403,
  );
  const { trainerId } = z.object({ trainerId: objectId }).strict().parse(data);
  const trainer = await publicTrainer(trainerId);
  return Conversation.findOneAndUpdate(
    { customerId: actor.id, trainerId },
    { $set: { trainerUserId: trainer.userId } },
    { upsert: true, returnDocument: "after" },
  ).lean();
}
export async function sendMessage(actor: Actor, id: string, data: unknown) {
  const input = z
    .object({
      text: z.string().trim().min(1).max(4000),
      idempotencyKey: z.string().uuid(),
    })
    .strict()
    .parse(data);
  const conversation = await ownConversation(actor, id);
  return mongoose.connection.transaction(async (session) => {
    const existing = await Message.findOne({
      senderId: actor.id,
      idempotencyKey: input.idempotencyKey,
    }).session(session);
    if (existing) {
      assert(
        String(existing.conversationId) === id && existing.text === input.text,
        "Idempotency key conflict",
        409,
      );
      return { message: "Message sent" };
    }
    let recipient =
      String(conversation.customerId) === actor.id
        ? conversation.trainerUserId
        : conversation.customerId;
    if (!recipient) {
      const trainer = await TrainerProfile.findById(conversation.trainerId)
        .select("userId")
        .session(session)
        .lean();
      assert(trainer, "Trainer is unavailable", 404);
      recipient = trainer.userId;
      await Conversation.updateOne(
        { _id: conversation._id },
        { $set: { trainerUserId: recipient } },
        { session },
      );
    }
    assert(
      await User.exists({ _id: recipient, status: "ACTIVE" }).session(session),
      "Recipient is unavailable",
    );
    await Message.create(
      [{ ...input, conversationId: id, senderId: actor.id }],
      { session },
    );
    await Conversation.updateOne(
      { _id: id },
      { $set: { lastMessageAt: new Date() } },
      { session },
    );
    await Notification.create(
      [
        {
          userId: recipient,
          title: "New message",
          body: `A message from ${actor.name}`,
          href:
            actor.role === "CUSTOMER"
              ? "/trainer/messages"
              : "/dashboard/customer/messages",
        },
      ],
      { session },
    );
    return { message: "Message sent" };
  });
}
export async function contact(data: unknown, actor: Actor | null) {
  const input = z
    .object({
      name: z.string().trim().min(2).max(200),
      email: z.string().email().max(254),
      subject: z.string().trim().min(3).max(200),
      message: z.string().trim().min(10).max(5000),
      website: z.string().max(0).optional(),
    })
    .strict()
    .parse(data);
  const { website: ignored, ...fields } = input;
  void ignored;
  await SupportRequest.create({ ...fields, userId: actor?.id });
  return {
    message:
      "Your request has been received. You can follow up using the same email address.",
  };
}
export async function accountAction(
  actor: Actor,
  action: string,
  data: unknown,
) {
  if (action === "profile") {
    const input = z
      .object({
        firstName: z.string().trim().min(1).max(80),
        lastName: z.string().trim().min(1).max(80),
        phone: z.string().max(30),
        fitnessGoals: z.array(z.string().max(100)).max(20).default([]),
        preferredSchedule: z.string().max(200).default(""),
        timezone: timezone.default("Asia/Karachi"),
      })
      .strict()
      .parse(data);
    await User.updateOne(
      { _id: actor.id },
      {
        $set: {
          firstName: input.firstName,
          lastName: input.lastName,
          name: `${input.firstName} ${input.lastName}`,
          phone: input.phone,
          onboardingCompleted: true,
        },
      },
    );
    if (actor.role === "CUSTOMER")
      await CustomerProfile.updateOne(
        { userId: actor.id },
        {
          $set: {
            fitnessGoals: input.fitnessGoals,
            preferredSchedule: input.preferredSchedule,
            timezone: input.timezone,
          },
        },
        { upsert: true },
      );
    return { message: "Profile saved" };
  }
  if (action === "security") {
    const input = z
      .object({
        currentPassword: z.string().max(72),
        newPassword: password.optional(),
        confirmPassword: z.string().max(72).optional(),
        newEmail: z.union([email, z.literal("")]).optional(),
        deleteAccount: z.boolean().default(false),
        revokeSessions: z.boolean().default(false),
      })
      .strict()
      .refine((value) => !value.newPassword || value.newPassword === value.confirmPassword, {
        path: ["confirmPassword"],
        message: "Passwords do not match",
      })
      .parse(data);
    const user = await User.findById(actor.id).select("+passwordHash");
    assert(
      user && (await checkPassword(input.currentPassword, user.passwordHash)),
      "Current password is incorrect",
      403,
    );
    assert(
      !input.deleteAccount || actor.role !== "ADMIN",
      "An administrator cannot deactivate their own account",
    );
    const passwordHash = input.newPassword
      ? await hashPassword(input.newPassword)
      : undefined;
    if (input.newEmail && input.newEmail !== user.normalizedEmail)
      assert(
        !(await User.exists({ normalizedEmail: input.newEmail, _id: { $ne: user._id } })),
        "That email address is already in use",
        409,
      );
    await mongoose.connection.transaction(async (session) => {
      if (input.deleteAccount) {
        user.status = "DISABLED";
        user.deletionRequestedAt = new Date();
        await SupportRequest.create(
          [
            {
              userId: actor.id,
              name: actor.name,
              email: actor.email,
              subject: "Account deletion request",
              message:
                "Deactivation completed. Review retention obligations and anonymize personal data.",
              status: "OPEN",
            },
          ],
          { session },
        );
      }
      if (passwordHash) user.passwordHash = passwordHash;
      if (input.newEmail) {
        user.normalizedEmail = input.newEmail;
        user.emailVerified = true;
      }
      user.sessionVersion++;
      await user.save({ session });
      await AuthSession.deleteMany({ userId: actor.id }, { session });
    });
    return { message: "Security settings updated. Sign in again to continue." };
  }
  assert(false, "Not found", 404);
}
