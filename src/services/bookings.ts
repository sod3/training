import mongoose, { type ClientSession } from "mongoose";
import { DateTime } from "luxon";
import { z } from "zod";
import {
  AuditLog,
  Order,
  Payment,
  PlatformSettings,
  Refund,
  Session,
  TrainerAvailability,
  TrainerAvailabilityException,
  TrainerPackage,
  TrainerProfile,
  User,
} from "@/models";
import { connectDB } from "@/lib/server/db";
import { assert } from "@/lib/server/errors";
import { notifyUser } from "@/lib/server/email";
import { type Actor, hashToken } from "@/lib/server/security";
import { bookingSchema, objectId } from "@/lib/server/validation";
import {
  calculateBookingPrice,
  canCancelBooking,
  generateSlots,
  ownsBooking,
} from "@/lib/server/rules";
import { createMeeting } from "./video";

export async function settings(session?: ClientSession) {
  return (
    (await PlatformSettings.findOne({ key: "platform" })
      .session(session ?? null)
      .lean()) ?? new PlatformSettings().toObject()
  );
}
// Every operation that changes reservations or availability writes the same trainer
// document first. Concurrent MongoDB transactions conflict and retry from a fresh
// snapshot, including for partially overlapping slots, not only identical starts.
export async function lockTrainer(
  id: string | mongoose.Types.ObjectId,
  session: ClientSession,
) {
  const trainer = await TrainerProfile.findOneAndUpdate(
    { _id: id },
    { $inc: { revision: 1 } },
    { returnDocument: "after", session },
  );
  assert(trainer, "Trainer not found", 404);
  return trainer;
}
export async function publicTrainer(
  id: string | mongoose.Types.ObjectId,
  session?: ClientSession,
) {
  const trainer = await TrainerProfile.findOne({
    _id: id,
    applicationStatus: "APPROVED",
    profileVisibility: "PUBLIC",
  })
    .session(session ?? null)
    .lean();
  assert(trainer, "Trainer not found", 404);
  assert(
    await User.exists({
      _id: trainer.userId,
      status: "ACTIVE",
    }).session(session ?? null),
    "Trainer not found",
    404,
  );
  return trainer;
}
export async function getAvailableSlots(
  trainerId: string,
  date: string,
  duration: number,
  session?: ClientSession,
  excludeSession?: string,
) {
  const context = await loadAvailabilityContext(
    trainerId,
    date,
    1,
    session,
    excludeSession,
  );
  return availableSlotsForDate(context, date, duration);
}

export async function getAvailableWeek(
  trainerId: string,
  date: string,
  duration: number,
  days = 7,
) {
  const context = await loadAvailabilityContext(trainerId, date, days);
  return Array.from({ length: days }, (_, offset) => {
    const day = context.firstDay.plus({ days: offset });
    const dayDate = day.toISODate()!;
    return {
      date: dayDate,
      label: day.toFormat("cccc, d LLL"),
      slots: availableSlotsForDate(context, dayDate, duration),
    };
  });
}

async function loadAvailabilityContext(
  trainerId: string,
  date: string,
  days: number,
  session?: ClientSession,
  excludeSession?: string,
) {
  objectId.parse(trainerId);
  z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .parse(date);
  z.number().int().min(1).max(7).parse(days);
  const trainer = await publicTrainer(trainerId, session);
  const firstDay = DateTime.fromISO(date, { zone: trainer.timezone }).startOf(
    "day",
  );
  assert(firstDay.isValid, "Invalid date");
  const [config, rules, exceptions, busy] = await Promise.all([
    settings(session),
    TrainerAvailability.find({ trainerId, active: true })
      .session(session ?? null)
      .lean(),
    TrainerAvailabilityException.find({
      trainerId,
      start: { $lt: firstDay.plus({ days: days + 1 }).toJSDate() },
      end: { $gt: firstDay.minus({ days: 1 }).toJSDate() },
    })
      .session(session ?? null)
      .lean(),
    Session.find({
      trainerId,
      ...(excludeSession ? { _id: { $ne: excludeSession } } : {}),
      start: { $lt: firstDay.plus({ days: days + 1 }).toJSDate() },
      end: { $gt: firstDay.toJSDate() },
      $or: [
        { status: { $in: ["CONFIRMED", "COMPLETED", "NO_SHOW"] } },
        { status: "HELD", holdExpiresAt: { $gt: new Date() } },
      ],
    })
      .session(session ?? null)
      .lean(),
  ]);
  return { trainer, firstDay, config, rules, exceptions, busy };
}

type AvailabilityContext = Awaited<ReturnType<typeof loadAvailabilityContext>>;

function availableSlotsForDate(
  context: AvailabilityContext,
  date: string,
  duration: number,
) {
  const { trainer, config, rules, exceptions, busy } = context;
  const found = new Map<
    string,
    { start: string; end: string; label: string }
  >();
  for (const slot of generateSlots(
    date,
    trainer.timezone,
    duration,
    rules,
    exceptions,
    busy,
    config.minimumBookingNoticeHours,
    config.maximumAdvanceBookingDays,
  )) {
    if (!found.has(slot.start)) {
      found.set(slot.start, slot);
    }
  }
  return [...found.values()].sort((a, b) => a.start.localeCompare(b.start));
}
async function validateSlot(
  trainerId: string,
  start: string,
  duration: number,
  session: ClientSession,
  excludeSession?: string,
) {
  const trainer = await publicTrainer(trainerId, session);
  const date = DateTime.fromISO(start).setZone(trainer.timezone).toISODate()!;
  const slots = await getAvailableSlots(
    trainerId,
    date,
    duration,
    session,
    excludeSession,
  );
  const slot = slots.find(
    (s) => new Date(s.start).getTime() === new Date(start).getTime(),
  );
  assert(slot, "That time is no longer available. Choose another slot.", 409);
  return slot;
}
export async function createBooking(actor: Actor, data: unknown) {
  assert(actor.role === "CUSTOMER", "Only customers can book sessions", 403);
  const input = bookingSchema.parse(data);
  await connectDB();
  const requestHash = hashToken(JSON.stringify(input));
  return mongoose.connection.transaction(async (session) => {
    const existing = await Order.findOne({
      customerId: actor.id,
      idempotencyKey: input.idempotencyKey,
    }).session(session);
    if (existing) {
      assert(
        existing.requestHash === requestHash,
        "Idempotency key was already used for another request",
        409,
      );
      return existing.toObject();
    }
    const pkg = await TrainerPackage.findOne({
      _id: input.packageId,
      active: true,
    }).session(session);
    assert(pkg, "Package is not available", 404);
    const trainer = await lockTrainer(pkg.trainerId, session);
    const config = await settings(session);
    assert(!config.maintenanceMode, "Bookings are temporarily paused", 503);
    const slot = await validateSlot(
      String(trainer._id),
      input.start,
      pkg.sessionDuration,
      session,
    );
    const price = calculateBookingPrice(pkg.price, config.commissionBps);
    const expires = new Date(Date.now() + config.holdMinutes * 60000);
    const [order] = await Order.create(
      [
        {
          bookingNumber: `SPT-${new mongoose.Types.ObjectId().toHexString().toUpperCase()}`,
          customerId: actor.id,
          trainerId: trainer._id,
          packageId: pkg._id,
          packageSnapshot: {
            name: pkg.name,
            trainerName: trainer.displayName,
            sessionCount: pkg.sessionCount,
            sessionDuration: pkg.sessionDuration,
            price: pkg.price,
            commissionBps: config.commissionBps,
            commission: price.commission,
            trainerEarning: price.trainerEarning,
            cancellationWindowHours: config.cancellationWindowHours,
          },
          timezone: trainer.timezone,
          total: price.total,
          currency: pkg.currency,
          remainingSessions: pkg.sessionCount - 1,
          holdExpiresAt: expires,
          idempotencyKey: input.idempotencyKey,
          requestHash,
        },
      ],
      { session },
    );
    await Session.create(
      [
        {
          orderId: order._id,
          trainerId: trainer._id,
          customerId: actor.id,
          sessionNumber: 1,
          start: slot.start,
          end: slot.end,
          holdExpiresAt: expires,
        },
      ],
      { session },
    );
    await Payment.create(
      [{ orderId: order._id, amount: order.total, currency: order.currency }],
      { session },
    );
    return order.toObject();
  });
}
export async function ownedOrder(
  actor: Actor,
  id: string,
  session?: ClientSession,
) {
  objectId.parse(id);
  const order = await Order.findById(id).session(session ?? null);
  assert(order, "Booking not found", 404);
  const trainer =
    actor.role === "TRAINER"
      ? await TrainerProfile.findOne({ userId: actor.id }).session(
          session ?? null,
        )
      : null;
  assert(
    ownsBooking(actor, order, trainer ? String(trainer._id) : undefined),
    "Booking not found",
    404,
  );
  return order;
}
export async function scheduleSession(actor: Actor, id: string, data: unknown) {
  const input = z
    .object({ start: z.string().datetime(), sessionId: objectId.optional() })
    .strict()
    .parse(data);
  assert(
    actor.role === "CUSTOMER",
    "Only the customer can schedule sessions",
    403,
  );
  return mongoose.connection.transaction(async (session) => {
    const order = await ownedOrder(actor, id, session);
    await lockTrainer(order.trainerId, session);
    assert(
      order.bookingStatus === "CONFIRMED" && order.paymentStatus === "PAID",
      "Booking must be paid and active",
      409,
    );
    const previous = input.sessionId
      ? await Session.findOne({ _id: input.sessionId, orderId: id }).session(
          session,
        )
      : null;
    if (input.sessionId) {
      assert(
        previous && previous.status === "CONFIRMED",
        "Session cannot be rescheduled",
        409,
      );
      assert(
        canCancelBooking(
          previous.start,
          order.packageSnapshot.cancellationWindowHours!,
        ),
        "The rescheduling window has closed",
      );
    } else
      assert(
        order.remainingSessions > 0,
        "All sessions have been scheduled",
        409,
      );
    const slot = await validateSlot(
      String(order.trainerId),
      input.start,
      order.packageSnapshot.sessionDuration!,
      session,
      input.sessionId,
    );
    if (previous) {
      previous.start = new Date(slot.start);
      previous.end = new Date(slot.end);
      previous.reminderSentAt = undefined;
      await previous.save({ session });
    } else {
      const meeting = await createMeeting("MOCK");
      const count = await Session.countDocuments({ orderId: id }).session(
        session,
      );
      await Session.create(
        [
          {
            orderId: id,
            trainerId: order.trainerId,
            customerId: actor.id,
            sessionNumber: count + 1,
            start: slot.start,
            end: slot.end,
            status: "CONFIRMED",
            videoProvider: meeting.videoProvider,
            meetingId: meeting.meetingId,
            meetingUrl: meeting.meetingUrl,
            meetingStatus: meeting.meetingStatus,
          },
        ],
        { session },
      );
      order.remainingSessions--;
      await order.save({ session });
    }
    const trainer = await TrainerProfile.findById(order.trainerId).session(
      session,
    );
    for (const user of [actor.id, trainer!.userId])
      await notifyUser(
        user,
        previous ? "Session rescheduled" : "Session scheduled",
        `${order.bookingNumber}: ${DateTime.fromISO(slot.start)
          .setZone(order.timezone || "Asia/Karachi")
          .toFormat("ff")}`,
        "/dashboard",
        session,
      );
    return { message: "Session saved" };
  });
}
export async function cancelBooking(actor: Actor, id: string, data: unknown) {
  const input = z
    .object({ reason: z.string().trim().min(3).max(2000) })
    .strict()
    .parse(data);
  return mongoose.connection.transaction(async (session) => {
    const order = await ownedOrder(actor, id, session);
    await lockTrainer(order.trainerId, session);
    if (
      ["CANCELLED", "REFUND_PENDING", "REFUNDED"].includes(order.bookingStatus)
    )
      return { message: "Cancellation already recorded" };
    assert(
      ["PENDING_PAYMENT", "CONFIRMED"].includes(order.bookingStatus),
      "This booking cannot be cancelled",
      409,
    );
    const appointments = await Session.find({
      orderId: id,
      status: { $in: ["HELD", "CONFIRMED"] },
    }).session(session);
    const late = appointments.some(
      (s) =>
        !canCancelBooking(
          s.start,
          order.packageSnapshot.cancellationWindowHours!,
        ),
    );
    const used = await Session.countDocuments({
      orderId: id,
      status: { $in: ["COMPLETED", "NO_SHOW"] },
    }).session(session);
    const refundableSessions =
      order.packageSnapshot.sessionCount! -
      used -
      (late && actor.role === "CUSTOMER"
        ? appointments.filter(
            (s) =>
              !canCancelBooking(
                s.start,
                order.packageSnapshot.cancellationWindowHours!,
              ),
          ).length
        : 0);
    const amount = Math.floor(
      (order.total * Math.max(0, refundableSessions)) /
        order.packageSnapshot.sessionCount!,
    );
    order.bookingStatus =
      order.paymentStatus === "PAID" && amount > 0
        ? "REFUND_PENDING"
        : "CANCELLED";
    if (order.bookingStatus === "REFUND_PENDING") {
      order.paymentStatus = "REFUND_PENDING";
      await Refund.create([{ orderId: id, amount, reason: input.reason }], {
        session,
      });
    }
    order.cancelledAt = new Date();
    order.cancelledBy = new mongoose.Types.ObjectId(actor.id);
    order.cancellationReason = input.reason;
    order.remainingSessions = 0;
    await order.save({ session });
    await Session.updateMany(
      { orderId: id, status: { $in: ["HELD", "CONFIRMED"] } },
      { $set: { status: "CANCELLED" } },
      { session },
    );
    if (actor.role === "ADMIN")
      await AuditLog.create(
        [
          {
            actorId: actor.id,
            actorRole: actor.role,
            action: "CANCEL_BOOKING",
            entityType: "Order",
            entityId: id,
            newValues: { reason: input.reason, refundAmount: amount },
          },
        ],
        { session },
      );
    const trainer = await TrainerProfile.findById(order.trainerId).session(
      session,
    );
    for (const user of [order.customerId, trainer!.userId])
      await notifyUser(
        user,
        "Booking cancelled",
        `${order.bookingNumber} has been cancelled.${amount > 0 ? " An eligible refund is awaiting review." : ""}`,
        "/dashboard",
        session,
      );
    return {
      message: "Booking cancelled",
      refundAmount: order.bookingStatus === "REFUND_PENDING" ? amount : 0,
    };
  });
}
export async function completeSession(actor: Actor, id: string, data: unknown) {
  const input = z
    .object({
      status: z.enum(["COMPLETED", "NO_SHOW"]),
      notes: z.string().max(3000).default(""),
    })
    .strict()
    .parse(data);
  objectId.parse(id);
  assert(
    actor.role === "TRAINER",
    "Only the assigned trainer can complete a session",
    403,
  );
  return mongoose.connection.transaction(async (session) => {
    const appointment = await Session.findById(id).session(session);
    assert(appointment, "Session not found", 404);
    const order = await ownedOrder(actor, String(appointment.orderId), session);
    await lockTrainer(order.trainerId, session);
    if (appointment.status === input.status)
      return { message: "Session already updated" };
    assert(
      appointment.status === "CONFIRMED" && appointment.end <= new Date(),
      "Only ended, confirmed sessions can be completed",
      409,
    );
    appointment.status = input.status;
    appointment.trainerNotes = input.notes;
    appointment.completedAt = new Date();
    await appointment.save({ session });
    const active = await Session.countDocuments({
      orderId: order._id,
      status: "CONFIRMED",
    }).session(session);
    if (!active && order.remainingSessions === 0) {
      order.bookingStatus = "COMPLETED";
      await order.save({ session });
    }
    await notifyUser(
      order.customerId,
      "Session completed",
      "Thank you for training. You can now share your experience.",
      "/dashboard/customer/reviews",
      session,
    );
    return { message: "Session updated" };
  });
}
export async function expireHolds() {
  const orders = await Order.find({
    bookingStatus: "PENDING_PAYMENT",
    holdExpiresAt: { $lte: new Date() },
  })
    .select("_id trainerId")
    .limit(100)
    .lean();
  for (const candidate of orders)
    await mongoose.connection.transaction(async (session) => {
      await lockTrainer(candidate.trainerId, session);
      const order = await Order.findOneAndUpdate(
        {
          _id: candidate._id,
          bookingStatus: "PENDING_PAYMENT",
          holdExpiresAt: { $lte: new Date() },
        },
        { $set: { bookingStatus: "EXPIRED" } },
        { session },
      );
      if (order)
        await Session.updateMany(
          { orderId: order._id, status: "HELD" },
          { $set: { status: "EXPIRED" } },
          { session },
        );
    });
  return orders.length;
}
