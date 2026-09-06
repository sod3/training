import mongoose from "mongoose";
import { z } from "zod";
import {
  AuditLog,
  Order,
  Payment,
  Refund,
  Session,
  Transaction,
  Upload,
  User,
  TrainerProfile,
} from "@/models";
import { assert } from "@/lib/server/errors";
import { type Actor } from "@/lib/server/security";
import { notifyUser } from "@/lib/server/email";
import { lockTrainer, ownedOrder } from "./bookings";

const manualPaymentSchema = z
  .object({
    method: z.enum(["JAZZCASH", "EASYPAISA"]),
    payerName: z.string().trim().min(2).max(120),
    transactionId: z.string().trim().min(4).max(120),
    proofUploadId: z.string().regex(/^[a-f\d]{24}$/i),
  })
  .strict();

/**
 * Canonical Spotter payment flow: customer transfers with JazzCash/EasyPaisa,
 * attaches proof, and an administrator verifies the transfer before the booking
 * becomes confirmed. No provider redirect or webhook is used.
 */
export async function submitManualPayment(actor: Actor, id: string, data: unknown) {
  assert(actor.role === "CUSTOMER", "Only customers can pay", 403);
  const input = manualPaymentSchema.parse(data);
  return mongoose.connection.transaction(async (session) => {
    const order = await ownedOrder(actor, id, session);
    assert(
      order.bookingStatus === "PENDING_PAYMENT" &&
        order.holdExpiresAt &&
        order.holdExpiresAt > new Date(),
      "This reservation has expired. Choose a new time.",
      409,
    );
    const held = await Session.findOne({ orderId: order._id, status: "HELD" }).session(session);
    assert(held, "This reservation is no longer available", 409);
    const proof = await Upload.findOne({
      _id: input.proofUploadId,
      userId: actor.id,
      purpose: "PAYMENT_PROOF",
      status: "READY",
    }).session(session);
    assert(proof, "Upload a payment screenshot first", 422);
    const payment = await Payment.findOne({ orderId: id }).session(session);
    assert(payment, "Payment record not found", 404);
    const duplicate = await Payment.exists({
      transactionId: input.transactionId,
      _id: { $ne: payment._id },
    }).session(session);
    assert(!duplicate, "That transaction ID has already been submitted", 409);

    payment.provider = "MANUAL";
    payment.method = input.method;
    payment.payerName = input.payerName;
    payment.transactionId = input.transactionId;
    payment.proofUploadId = proof._id;
    payment.submittedAt = new Date();
    payment.status = "SUBMITTED";

    // A 10-minute checkout hold is appropriate while the customer pays, but
    // not while a human admin verifies proof. Once proof is submitted, reserve
    // the slot for up to 24 hours (never beyond the session start).
    const reviewDeadline = new Date(
      Math.min(held.start.getTime() - 60_000, Date.now() + 24 * 60 * 60 * 1000),
    );
    assert(reviewDeadline > new Date(), "This session starts too soon for manual payment review", 409);
    order.paymentStatus = "SUBMITTED";
    order.holdExpiresAt = reviewDeadline;
    held.holdExpiresAt = reviewDeadline;

    await Promise.all([
      payment.save({ session }),
      order.save({ session }),
      held.save({ session }),
    ]);
    proof.status = "ATTACHED";
    await proof.save({ session });

    const admins = await User.find({ role: "ADMIN", status: "ACTIVE" })
      .select("_id")
      .session(session)
      .lean();
    for (const admin of admins)
      await notifyUser(
        admin._id,
        "Payment proof awaiting review",
        `${order.bookingNumber}: ${input.method} transfer ${input.transactionId}.`,
        "/admin/payments",
        session,
      );
    await notifyUser(
      actor.id,
      "Payment proof submitted",
      `${order.bookingNumber} is reserved while an admin checks your ${input.method} transfer.`,
      `/booking/success?id=${order._id}`,
      session,
    );
    return {
      orderId: id,
      status: payment.status,
      reviewDeadline: reviewDeadline.toISOString(),
      message: "Payment details submitted. Your slot is reserved while an admin reviews the proof.",
    };
  });
}

export async function reviewManualPayment(actor: Actor, id: string, data: unknown) {
  assert(actor.role === "ADMIN", "Admin access required", 403);
  const input = z
    .object({
      decision: z.enum(["APPROVE", "REJECT"]),
      notes: z.string().trim().max(2000).default(""),
    })
    .strict()
    .parse(data);
  if (input.decision === "REJECT") assert(input.notes.length >= 3, "Add a reason for rejection");

  return mongoose.connection.transaction(async (session) => {
    const payment = await Payment.findById(id).session(session);
    assert(payment, "Payment not found", 404);
    assert(payment.status === "SUBMITTED", "This payment is not awaiting review", 409);
    const order = await Order.findById(payment.orderId).session(session);
    assert(order, "Booking not found", 404);
    const trainer = await lockTrainer(order.trainerId, session);
    const held = await Session.findOne({ orderId: order._id, status: "HELD" }).session(session);
    assert(held, "The held reservation is no longer available", 409);

    payment.reviewedAt = new Date();
    payment.reviewedBy = new mongoose.Types.ObjectId(actor.id);
    payment.reviewNotes = input.notes;

    if (input.decision === "REJECT") {
      payment.status = "REJECTED";
      order.paymentStatus = "REJECTED";
      await payment.save({ session });
      await order.save({ session });
      await notifyUser(
        order.customerId,
        "Payment proof needs attention",
        `${order.bookingNumber} was not approved: ${input.notes}. Submit corrected payment details before the reservation expires.`,
        `/booking/success?id=${order._id}`,
        session,
      );
      await AuditLog.create(
        [{ actorId: actor.id, actorRole: actor.role, action: "REJECT_MANUAL_PAYMENT", entityType: "Payment", entityId: id, newValues: { notes: input.notes } }],
        { session },
      );
      return { status: payment.status, message: "Payment rejected. The customer can submit corrected details while the reservation remains active." };
    }

    assert(
      order.bookingStatus === "PENDING_PAYMENT" && order.holdExpiresAt && order.holdExpiresAt > new Date(),
      "The manual-payment review window has expired",
      409,
    );
    const conflict = await Session.exists({
      trainerId: order.trainerId,
      _id: { $ne: held._id },
      start: { $lt: held.end },
      end: { $gt: held.start },
      $or: [
        { status: { $in: ["CONFIRMED", "COMPLETED", "NO_SHOW"] } },
        { status: "HELD", holdExpiresAt: { $gt: new Date() } },
      ],
    }).session(session);
    assert(!conflict, "That time is no longer available", 409);
    assert(
      !(await Transaction.exists({ key: `sale:${order._id}` }).session(session)),
      "Payment has already been approved",
      409,
    );
    assert(
      trainer.applicationStatus === "APPROVED" && trainer.profileVisibility === "PUBLIC",
      "Trainer is no longer available for new bookings",
      409,
    );

    await Transaction.create(
      [{
        orderId: order._id,
        trainerId: order.trainerId,
        kind: "SALE",
        amount: order.total,
        platformFee: order.packageSnapshot.commission!,
        trainerAmount: order.packageSnapshot.trainerEarning!,
        key: `sale:${order._id}`,
      }],
      { session },
    );
    payment.status = "PAID";
    payment.paidAt = new Date();
    order.paymentStatus = "PAID";
    order.bookingStatus = "CONFIRMED";
    order.holdExpiresAt = undefined;
    held.status = "CONFIRMED";
    held.holdExpiresAt = undefined;
    // Meeting links are intentionally not fabricated. Trainers attach a real
    // Google Meet/Zoom/other HTTPS link from their calendar before the session.
    held.videoProvider = "NONE";
    held.meetingId = "";
    held.meetingUrl = "";
    held.meetingStatus = "PENDING";
    await Promise.all([held.save({ session }), payment.save({ session }), order.save({ session })]);

    for (const userId of [order.customerId, trainer.userId])
      await notifyUser(
        userId,
        "Booking confirmed",
        `${order.bookingNumber} has been approved and confirmed. The trainer can add the private session link from their calendar.`,
        "/dashboard",
        session,
      );
    await AuditLog.create(
      [{ actorId: actor.id, actorRole: actor.role, action: "APPROVE_MANUAL_PAYMENT", entityType: "Payment", entityId: id, newValues: { notes: input.notes, method: payment.method, transactionId: payment.transactionId } }],
      { session },
    );
    return { status: payment.status, message: "Payment approved and booking confirmed." };
  });
}

export async function reviewManualRefund(actor: Actor, id: string, data: unknown) {
  assert(actor.role === "ADMIN", "Admin access required", 403);
  const input = z
    .object({
      decision: z.enum(["APPROVE", "REJECT", "MARK_REFUNDED"]),
      notes: z.string().trim().max(2000).default(""),
      reference: z.string().trim().max(200).default(""),
    })
    .strict()
    .parse(data);
  return mongoose.connection.transaction(async (session) => {
    const refund = await Refund.findById(id).session(session);
    assert(refund, "Refund not found", 404);
    const order = await Order.findById(refund.orderId).session(session);
    assert(order, "Booking not found", 404);
    const payment = await Payment.findOne({ orderId: order._id }).session(session);
    assert(payment, "Payment not found", 404);

    if (input.decision === "APPROVE") {
      assert(refund.status === "REQUESTED", "Refund has already been reviewed", 409);
      refund.status = "APPROVED";
      refund.reviewedBy = new mongoose.Types.ObjectId(actor.id);
      await refund.save({ session });
      await AuditLog.create([{ actorId: actor.id, actorRole: actor.role, action: "APPROVE_REFUND", entityType: "Refund", entityId: id, newValues: { amount: refund.amount, notes: input.notes } }], { session });
      return { message: "Refund approved. Send the money manually, then mark the refund as paid with the transfer reference." };
    }

    if (input.decision === "REJECT") {
      assert(["REQUESTED", "APPROVED"].includes(refund.status), "Refund is already finalized", 409);
      assert(input.notes.length >= 3, "Add a reason for rejection");
      refund.status = "REJECTED";
      refund.reviewedBy = new mongoose.Types.ObjectId(actor.id);
      order.bookingStatus = "CANCELLED";
      order.paymentStatus = "PAID";
      await Promise.all([refund.save({ session }), order.save({ session })]);
      await notifyUser(order.customerId, "Refund request reviewed", input.notes, "/dashboard/customer/payments", session);
      await AuditLog.create([{ actorId: actor.id, actorRole: actor.role, action: "REJECT_REFUND", entityType: "Refund", entityId: id, newValues: { notes: input.notes } }], { session });
      return { message: "Refund rejected and customer notified." };
    }

    assert(refund.status === "APPROVED", "Approve the refund before marking it paid", 409);
    assert(input.reference.length >= 4, "Enter the JazzCash/EasyPaisa/bank transfer reference");
    const existing = await Transaction.exists({ key: `refund:${refund._id}` }).session(session);
    if (!existing) {
      const fee = Math.round((order.packageSnapshot.commission! * refund.amount) / order.total);
      await Transaction.create(
        [{ orderId: order._id, trainerId: order.trainerId, kind: "REFUND", amount: -refund.amount, platformFee: -fee, trainerAmount: -(refund.amount - fee), key: `refund:${refund._id}` }],
        { session },
      );
    }
    refund.status = "REFUNDED";
    refund.providerReference = input.reference;
    refund.reviewedBy = new mongoose.Types.ObjectId(actor.id);
    payment.status = "REFUNDED";
    order.paymentStatus = "REFUNDED";
    order.bookingStatus = "REFUNDED";
    await Promise.all([refund.save({ session }), payment.save({ session }), order.save({ session })]);
    await notifyUser(order.customerId, "Refund processed", `${(refund.amount / 100).toLocaleString("en-PK")} PKR has been refunded. Reference: ${input.reference}.`, "/dashboard/customer/payments", session);
    await AuditLog.create([{ actorId: actor.id, actorRole: actor.role, action: "MARK_REFUND_PAID", entityType: "Refund", entityId: id, newValues: { reference: input.reference, amount: refund.amount } }], { session });
    return { message: "Refund marked as paid and financial ledger updated." };
  });
}
