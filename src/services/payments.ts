import { createHmac, timingSafeEqual } from "node:crypto";
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
  WebhookEvent,
} from "@/models";
import { assert } from "@/lib/server/errors";
import { appUrl, type Actor } from "@/lib/server/security";
import { notifyUser } from "@/lib/server/email";
import { lockTrainer, ownedOrder } from "./bookings";
import { createMeeting } from "./video";

function configuration() {
  assert(
    process.env.SAFEPAY_API_KEY &&
      process.env.SAFEPAY_SECRET_KEY &&
      process.env.SAFEPAY_WEBHOOK_SECRET,
    "Payments are not configured. Please contact support.",
    503,
  );
  const environment = process.env.SAFEPAY_ENVIRONMENT;
  assert(
    environment === "sandbox" || environment === "production",
    "Payment environment is not configured",
    503,
  );
  return {
    environment,
    host:
      environment === "production"
        ? "https://api.getsafepay.com"
        : "https://sandbox.api.getsafepay.com",
  };
}
async function providerRequest(path: string, body?: unknown): Promise<unknown> {
  const { host } = configuration();
  const response = await fetch(`${host}${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      "Content-Type": "application/json",
      "x-sfpy-merchant-secret": process.env.SAFEPAY_SECRET_KEY!,
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(12000),
    cache: "no-store",
  });
  assert(
    response.ok,
    "Payment provider is temporarily unavailable. Check your booking before retrying.",
    502,
  );
  return response.json();
}
const trackerSchema = z.object({
  data: z.object({
    tracker: z.object({
      token: z.string(),
      state: z.string(),
      purchase_totals: z.object({
        quote_amount: z.object({
          amount: z.number().int(),
          currency: z.string(),
        }),
      }),
    }),
  }),
});
export async function initiatePayment(actor: Actor, id: string) {
  const { environment } = configuration();
  const order = await ownedOrder(actor, id);
  assert(actor.role === "CUSTOMER", "Only customers can pay", 403);
  assert(
    order.bookingStatus === "PENDING_PAYMENT" &&
      order.holdExpiresAt &&
      order.holdExpiresAt > new Date(),
    "Checkout expired. Choose a new time.",
    409,
  );
  let payment = await Payment.findOne({ orderId: id }).select("+checkoutUrl");
  assert(payment, "Payment not found", 404);
  if (payment.checkoutUrl) return { url: payment.checkoutUrl, orderId: id };
  if (!payment.providerId) {
    // Claim once. An ambiguous provider timeout is never retried as a second charge.
    const claimed = await Payment.findOneAndUpdate(
      { _id: payment._id, initiationStartedAt: null },
      { $set: { initiationStartedAt: new Date(), status: "PENDING" } },
      { returnDocument: "after" },
    );
    assert(
      claimed,
      "Payment setup is being reconciled. Check this booking shortly.",
      409,
    );
    const response = trackerSchema.parse(
      await providerRequest("/order/payments/v3/", {
        merchant_api_key: process.env.SAFEPAY_API_KEY,
        intent: process.env.SAFEPAY_INTENT || "CYBERSOURCE",
        mode: "payment",
        entry_mode: "raw",
        currency: order.currency,
        amount: order.total,
        metadata: { order_id: id },
        include_fees: false,
      }),
    );
    const tracker = response.data.tracker;
    assert(
      tracker.purchase_totals.quote_amount.amount === order.total &&
        tracker.purchase_totals.quote_amount.currency === order.currency,
      "Payment amount mismatch",
      502,
    );
    await Payment.updateOne(
      { _id: payment._id },
      { $set: { providerId: tracker.token } },
    );
    payment = (await Payment.findById(payment._id).select("+checkoutUrl"))!;
  }
  const passport = z
    .object({ data: z.string().min(1) })
    .parse(await providerRequest("/client/passport/v1/token", {}));
  const host =
    environment === "production"
      ? "https://getsafepay.com"
      : "https://sandbox.api.getsafepay.com";
  const url = `${host}/embedded/?${new URLSearchParams({ environment, tracker: payment.providerId!, tbt: passport.data, source: "hosted", order_id: id, redirect_url: `${appUrl()}/booking/success?id=${id}`, cancel_url: `${appUrl()}/booking/success?id=${id}` })}`;
  await Payment.updateOne({ _id: payment._id }, { $set: { checkoutUrl: url } });
  return { url, orderId: id };
}

const manualPaymentSchema = z
  .object({
    method: z.enum(["JAZZCASH", "EASYPAISA"]),
    payerName: z.string().trim().min(2).max(120),
    transactionId: z.string().trim().min(4).max(120),
    proofUploadId: z.string().regex(/^[a-f\d]{24}$/i),
  })
  .strict();

/** Submit a JazzCash/EasyPaisa transfer for admin review. No provider redirect is used. */
export async function submitManualPayment(
  actor: Actor,
  id: string,
  data: unknown,
) {
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
    await payment.save({ session });
    order.paymentStatus = "SUBMITTED";
    await order.save({ session });
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
    return {
      orderId: id,
      status: payment.status,
      message:
        "Payment details submitted. An admin will review them before confirming your booking.",
    };
  });
}

export async function reviewManualPayment(
  actor: Actor,
  id: string,
  data: unknown,
) {
  assert(actor.role === "ADMIN", "Admin access required", 403);
  const input = z
    .object({
      decision: z.enum(["APPROVE", "REJECT"]),
      notes: z.string().trim().max(2000).default(""),
    })
    .strict()
    .parse(data);
  return mongoose.connection.transaction(async (session) => {
    const payment = await Payment.findById(id).session(session);
    assert(payment, "Payment not found", 404);
    assert(
      payment.status === "SUBMITTED",
      "This payment is not awaiting review",
      409,
    );
    const order = await Order.findById(payment.orderId).session(session);
    assert(order, "Booking not found", 404);
    await lockTrainer(order.trainerId, session);
    const held = await Session.findOne({
      orderId: order._id,
      status: "HELD",
    }).session(session);
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
        `${order.bookingNumber} was not approved. Update the payment details and submit again while the reservation is held.`,
        `/booking/success?id=${order._id}`,
        session,
      );
      await AuditLog.create(
        [
          {
            actorId: actor.id,
            actorRole: actor.role,
            action: "REJECT_MANUAL_PAYMENT",
            entityType: "Payment",
            entityId: id,
            newValues: { notes: input.notes },
          },
        ],
        { session },
      );
      return {
        status: payment.status,
        message: "Payment rejected. The customer can submit corrected details.",
      };
    }
    assert(
      order.bookingStatus === "PENDING_PAYMENT" &&
        order.holdExpiresAt &&
        order.holdExpiresAt > new Date(),
      "The reservation has expired",
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
      !(await Transaction.exists({ key: `sale:${order._id}` }).session(
        session,
      )),
      "Payment has already been approved",
      409,
    );
    await Transaction.create(
      [
        {
          orderId: order._id,
          trainerId: order.trainerId,
          kind: "SALE",
          amount: order.total,
          platformFee: order.packageSnapshot.commission!,
          trainerAmount: order.packageSnapshot.trainerEarning!,
          key: `sale:${order._id}`,
        },
      ],
      { session },
    );
    payment.status = "PAID";
    payment.paidAt = new Date();
    order.paymentStatus = "PAID";
    order.bookingStatus = "CONFIRMED";
    const meeting = await createMeeting("MOCK");
    held.status = "CONFIRMED";
    held.holdExpiresAt = undefined;
    held.videoProvider = meeting.videoProvider;
    held.meetingId = meeting.meetingId;
    held.meetingUrl = meeting.meetingUrl;
    held.meetingStatus = meeting.meetingStatus;
    await held.save({ session });
    await payment.save({ session });
    await order.save({ session });
    const trainer = await (
      await import("@/models")
    ).TrainerProfile.findById(order.trainerId).session(session);
    for (const user of [order.customerId, trainer!.userId])
      await notifyUser(
        user,
        "Booking confirmed",
        `${order.bookingNumber} has been approved and confirmed.`,
        "/dashboard",
        session,
      );
    await AuditLog.create(
      [
        {
          actorId: actor.id,
          actorRole: actor.role,
          action: "APPROVE_MANUAL_PAYMENT",
          entityType: "Payment",
          entityId: id,
          newValues: {
            notes: input.notes,
            method: payment.method,
            transactionId: payment.transactionId,
          },
        },
      ],
      { session },
    );
    return {
      status: payment.status,
      message: "Payment approved and booking confirmed.",
    };
  });
}
export function verifyWebhook(raw: string, signature: string, key: string) {
  if (!/^[a-f\d]{128}$/i.test(signature)) return false;
  return timingSafeEqual(
    Buffer.from(signature, "hex"),
    createHmac("sha512", key).update(raw).digest(),
  );
}
const eventSchema = z.object({
  token: z.string().min(1).max(200),
  version: z.literal("2.0.0"),
  merchant_api_key: z.string(),
  type: z.string(),
  data: z
    .object({
      tracker: z.string(),
      amount: z.number().int().optional(),
      currency: z.string().optional(),
      refund_amount: z.number().int().optional(),
      metadata: z
        .object({ order_id: z.string().optional() })
        .passthrough()
        .optional(),
    })
    .passthrough(),
});
export async function processPaymentEvent(raw: string, signature: string) {
  configuration();
  assert(
    verifyWebhook(raw, signature, process.env.SAFEPAY_WEBHOOK_SECRET!),
    "Invalid webhook signature",
    401,
  );
  const event = eventSchema.parse(JSON.parse(raw));
  assert(
    event.merchant_api_key === process.env.SAFEPAY_API_KEY,
    "Wrong merchant",
    401,
  );
  if (
    !["payment.succeeded", "payment.failed", "payment.refunded"].includes(
      event.type,
    )
  )
    return { received: true };
  return applyPaymentEvent(event);
}
// Called only after signature verification. Kept separate for transaction integration tests.
async function applyPaymentEvent(event: z.infer<typeof eventSchema>) {
  return mongoose.connection.transaction(async (session) => {
    if (await WebhookEvent.exists({ eventKey: event.token }).session(session))
      return { received: true };
    let payment = await Payment.findOne({
      providerId: event.data.tracker,
    }).session(session);
    if (
      !payment &&
      event.data.metadata?.order_id &&
      /^[a-f\d]{24}$/i.test(event.data.metadata.order_id)
    ) {
      payment = await Payment.findOne({
        orderId: event.data.metadata.order_id,
        providerId: null,
        initiationStartedAt: { $ne: null },
      }).session(session);
      if (payment) {
        payment.providerId = event.data.tracker;
        await payment.save({ session });
      }
    }
    assert(payment, "Payment has not been registered yet", 409);
    const order = await Order.findById(payment.orderId).session(session);
    assert(order, "Booking not found", 404);
    const trainer = await lockTrainer(order.trainerId, session);
    await WebhookEvent.create(
      [
        {
          eventKey: event.token,
          providerId: event.data.tracker,
          type: event.type,
          processedAt: new Date(),
        },
      ],
      { session },
    );
    if (event.type === "payment.failed") {
      if (["CREATED", "PENDING"].includes(payment.status)) {
        payment.status = "FAILED";
        order.paymentStatus = "FAILED";
        order.bookingStatus = "CANCELLED";
        await Session.updateMany(
          { orderId: order._id, status: "HELD" },
          { $set: { status: "CANCELLED" } },
          { session },
        );
        await payment.save({ session });
        await order.save({ session });
      }
      return { received: true };
    }
    if (event.type === "payment.refunded") {
      const refund = await Refund.findOne({ orderId: order._id }).session(
        session,
      );
      assert(
        refund &&
          event.data.refund_amount === refund.amount &&
          event.data.currency === order.currency,
        "Refund requires reconciliation",
        409,
      );
      if (refund.status !== "REFUNDED") {
        const fee = Math.round(
          (order.packageSnapshot.commission! * refund.amount) / order.total,
        );
        await Transaction.create(
          [
            {
              orderId: order._id,
              trainerId: order.trainerId,
              kind: "REFUND",
              amount: -refund.amount,
              platformFee: -fee,
              trainerAmount: -(refund.amount - fee),
              key: `refund:${refund._id}`,
            },
          ],
          { session },
        );
        refund.status = "REFUNDED";
        payment.status = "REFUNDED";
        order.paymentStatus = "REFUNDED";
        order.bookingStatus = "REFUNDED";
        await refund.save({ session });
        await payment.save({ session });
        await order.save({ session });
        await notifyUser(
          order.customerId,
          "Refund processed",
          `${refund.amount / 100} PKR has been refunded for ${order.bookingNumber}.`,
          "/dashboard/customer/payments",
          session,
        );
      }
      return { received: true };
    }
    assert(
      event.data.amount === order.total &&
        event.data.currency === order.currency,
      "Payment amount mismatch",
      409,
    );
    if (await Transaction.exists({ key: `sale:${order._id}` }).session(session))
      return { received: true };
    await Transaction.create(
      [
        {
          orderId: order._id,
          trainerId: order.trainerId,
          kind: "SALE",
          amount: order.total,
          platformFee: order.packageSnapshot.commission!,
          trainerAmount: order.packageSnapshot.trainerEarning!,
          key: `sale:${order._id}`,
        },
      ],
      { session },
    );
    payment.paidAt = new Date();
    const held = await Session.findOne({
      orderId: order._id,
      status: "HELD",
    }).session(session);
    const conflict = held
      ? await Session.exists({
          trainerId: order.trainerId,
          _id: { $ne: held._id },
          start: { $lt: held.end },
          end: { $gt: held.start },
          $or: [
            { status: { $in: ["CONFIRMED", "COMPLETED", "NO_SHOW"] } },
            { status: "HELD", holdExpiresAt: { $gt: new Date() } },
          ],
        }).session(session)
      : true;
    const active =
      trainer.applicationStatus === "APPROVED" &&
      trainer.profileVisibility === "PUBLIC" &&
      (await (
        await import("@/models")
      ).User.exists({ _id: trainer.userId, status: "ACTIVE" }).session(
        session,
      ));
    if (
      order.bookingStatus !== "PENDING_PAYMENT" ||
      !held ||
      !order.holdExpiresAt ||
      order.holdExpiresAt <= new Date() ||
      conflict ||
      !active
    ) {
      payment.status = "REFUND_PENDING";
      order.paymentStatus = "REFUND_PENDING";
      order.bookingStatus = "REFUND_PENDING";
      await Refund.updateOne(
        { orderId: order._id },
        {
          $setOnInsert: {
            amount: order.total,
            reason: "Payment arrived after the reservation became unavailable",
          },
        },
        { upsert: true, session },
      );
      await Session.updateMany(
        { orderId: order._id, status: "HELD" },
        { $set: { status: "CANCELLED" } },
        { session },
      );
      await notifyUser(
        order.customerId,
        "Payment received — refund pending",
        "Your reservation is no longer available. Support will process your refund.",
        "/dashboard/customer/payments",
        session,
      );
    } else {
      payment.status = "PAID";
      order.paymentStatus = "PAID";
      order.bookingStatus = "CONFIRMED";
      const meeting = await createMeeting("MOCK");
      held.status = "CONFIRMED";
      held.videoProvider = meeting.videoProvider;
      held.meetingId = meeting.meetingId;
      held.meetingUrl = meeting.meetingUrl;
      held.meetingStatus = meeting.meetingStatus;
      await held.save({ session });
      for (const id of [order.customerId, trainer.userId])
        await notifyUser(
          id,
          "Booking confirmed",
          `${order.bookingNumber} — ${order.packageSnapshot.name}. Payment has been received.`,
          "/dashboard",
          session,
        );
    }
    await payment.save({ session });
    await order.save({ session });
    return { received: true };
  });
}
export async function reconcilePayment(actor: Actor, orderId: string) {
  const order = await ownedOrder(actor, orderId);
  const payment = await Payment.findOne({ orderId });
  assert(payment?.providerId, "Payment setup has not completed", 409);
  const result = trackerSchema.parse(
    await providerRequest(
      `/reporter/api/v1/payments/${encodeURIComponent(payment.providerId)}`,
    ),
  );
  const t = result.data.tracker;
  if (t.state === "TRACKER_ENDED")
    return applyPaymentEvent({
      token: `reconcile:${t.token}`,
      version: "2.0.0",
      merchant_api_key: process.env.SAFEPAY_API_KEY!,
      type: "payment.succeeded",
      data: {
        tracker: t.token,
        amount: t.purchase_totals.quote_amount.amount,
        currency: t.purchase_totals.quote_amount.currency,
      },
    });
  return { state: t.state, bookingStatus: order.bookingStatus };
}
export async function approveRefund(actor: Actor, id: string) {
  assert(actor.role === "ADMIN", "Admin access required", 403);
  return mongoose.connection.transaction(async (session) => {
    const refund = await Refund.findById(id).session(session);
    assert(refund, "Refund not found", 404);
    assert(
      refund.status === "REQUESTED",
      "Refund has already been reviewed",
      409,
    );
    refund.status = "APPROVED";
    refund.reviewedBy = new mongoose.Types.ObjectId(actor.id);
    await refund.save({ session });
    await AuditLog.create(
      [
        {
          actorId: actor.id,
          actorRole: actor.role,
          action: "APPROVE_REFUND",
          entityType: "Refund",
          entityId: id,
          newValues: { amount: refund.amount },
        },
      ],
      { session },
    );
    return {
      message:
        "Refund approved. Issue the refund from your Safepay merchant dashboard; its signed webhook will update the ledger.",
    };
  });
}
