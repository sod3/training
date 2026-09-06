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
  Session,
  SupportRequest,
  TrainerProfile,
  User,
} from "@/models";
import { assert } from "@/lib/server/errors";
import { notifyUser } from "@/lib/server/email";
import { type Actor, checkPassword, hashPassword } from "@/lib/server/security";
import { canReviewTrainer } from "@/lib/server/rules";
import { objectId, password, timezone } from "@/lib/server/validation";
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
    const count = await Session.countDocuments({
      orderId: order._id,
      status: "COMPLETED",
    }).session(session);
    assert(
      canReviewTrainer(actor.id, String(order.customerId), count),
      "Only the customer of a completed session can review",
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
    { $setOnInsert: { trainerUserId: trainer.userId } },
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
    const recipient =
      String(conversation.customerId) === actor.id
        ? conversation.trainerUserId
        : conversation.customerId;
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
          href: "/dashboard",
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
        preferredLocations: z.array(z.string().max(100)).max(20).default([]),
        preferredTrainingTypes: z.array(z.string().max(30)).max(4).default([]),
        preferredSchedule: z.string().max(200).default(""),
        timezone: timezone.default("Asia/Karachi"),
        emailNotifications: z.boolean().default(true),
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
            preferredLocations: input.preferredLocations,
            preferredTrainingTypes: input.preferredTrainingTypes,
            preferredSchedule: input.preferredSchedule,
            timezone: input.timezone,
            notificationPreferences: { email: input.emailNotifications },
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
        deleteAccount: z.boolean().default(false),
        revokeSessions: z.boolean().default(false),
      })
      .strict()
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
      user.sessionVersion++;
      await user.save({ session });
      await AuthSession.deleteMany({ userId: actor.id }, { session });
    });
    return { message: "Security settings updated. Sign in again to continue." };
  }
  assert(false, "Not found", 404);
}
