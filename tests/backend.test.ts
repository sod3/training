import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { createHmac, randomUUID } from "node:crypto";
import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import { DateTime } from "luxon";
import { connectDB } from "../src/lib/server/db";
import {
  allowedRole,
  calculateBookingPrice,
  canCancelBooking,
  generateSlots,
  overlaps,
  ownsBooking,
} from "../src/lib/server/rules";
import { signupSchema } from "../src/lib/server/validation";
import {
  type Actor,
  hashPassword,
  checkPassword,
  hashToken,
} from "../src/lib/server/security";
import {
  AuthToken,
  Conversation,
  Favorite,
  Message,
  Order,
  Payment,
  Review,
  Session,
  TrainerApplication,
  TrainerAvailability,
  TrainerPackage,
  TrainerProfile,
  Transaction,
  User,
  models,
} from "../src/models";
import {
  createBooking,
  cancelBooking,
  getAvailableSlots,
  ownedOrder,
  scheduleSession,
} from "../src/services/bookings";
import {
  createConversation,
  createReview,
  favorite,
  ownConversation,
  sendMessage,
} from "../src/services/community";
import { adminAction } from "../src/services/dashboard";
import { processPaymentEvent, verifyWebhook } from "../src/services/payments";
import { trainerAction } from "../src/services/trainer-management";
let db: MongoMemoryReplSet;
let customer: Actor;
let other: Actor;
let trainerActor: Actor;
let trainerId: string;
let packageId: string;
let day: string;
let start: string;
before(
  async () => {
    process.env.AUTH_SECRET =
      "integration-test-secret-that-is-not-for-production";
    process.env.APP_URL = "https://spotter.test";
    process.env.SAFEPAY_ENVIRONMENT = "sandbox";
    process.env.SAFEPAY_API_KEY = "integration-merchant";
    process.env.SAFEPAY_SECRET_KEY = "integration-secret";
    process.env.SAFEPAY_WEBHOOK_SECRET = "integration-webhook";
    db = await MongoMemoryReplSet.create({
      replSet: { count: 1, storageEngine: "wiredTiger" },
    });
    process.env.MONGODB_URI = db.getUri();
    await connectDB();
    for (const model of Object.values(models)) await model.createIndexes();
    const makeUser = async (
      name: string,
      role: Actor["role"],
    ): Promise<Actor> => {
      const u = await User.create({
        normalizedEmail: `${name}@example.test`,
        passwordHash: await hashPassword("test-only-password-2026"),
        name,
        firstName: name,
        lastName: "Test",
        role,
        emailVerified: true,
      });
      return {
        id: String(u._id),
        role,
        name,
        email: u.normalizedEmail,
        emailVerified: true,
        avatar: "",
      };
    };
    customer = await makeUser("customer", "CUSTOMER");
    other = await makeUser("other", "CUSTOMER");
    trainerActor = await makeUser("trainer", "TRAINER");
    const trainer = await TrainerProfile.create({
      userId: trainerActor.id,
      slug: "test-trainer",
      displayName: "Test Trainer",
      applicationStatus: "APPROVED",
      profileVisibility: "PUBLIC",
      identityVerificationStatus: "APPROVED",
      trainingTypes: ["online"],
      timezone: "Asia/Karachi",
    });
    trainerId = String(trainer._id);
    await TrainerApplication.create({ trainerId, status: "APPROVED" });
    const pkg = await TrainerPackage.create({
      trainerId,
      name: "Eight sessions",
      description: "Eight supervised training sessions",
      sessionCount: 8,
      sessionDuration: 60,
      price: 900000,
    });
    packageId = String(pkg._id);
    day = DateTime.now().setZone("Asia/Karachi").plus({ days: 3 }).toISODate()!;
    const weekday = DateTime.fromISO(day).weekday % 7;
    await TrainerAvailability.create({
      trainerId,
      dayOfWeek: weekday,
      startTime: "08:00",
      endTime: "20:00",
      timezone: "Asia/Karachi",
      trainingTypes: ["online"],
    });
    start = DateTime.fromISO(`${day}T10:00`, { zone: "Asia/Karachi" })
      .toUTC()
      .toISO()!;
  },
  { timeout: 180000 },
);
after(async () => {
  await mongoose.disconnect();
  if (db) await db.stop();
});

test("trainers can save multiple weekly windows in a transaction", async () => {
  const rules = [
    {
      dayOfWeek: 1,
      startTime: "09:00",
      endTime: "12:00",
      trainingTypes: ["online"],
    },
    {
      dayOfWeek: 2,
      startTime: "13:00",
      endTime: "17:00",
      trainingTypes: ["online"],
    },
  ];
  const actor = {
    ...trainerActor,
    id: new mongoose.Types.ObjectId().toString(),
  };
  const trainer = await TrainerProfile.create({
    userId: actor.id,
    slug: "availability-regression",
  });
  await trainerAction(actor, "availability", undefined, { rules }, "POST");
  const saved = await TrainerAvailability.find({ trainerId: trainer._id })
    .sort({ dayOfWeek: 1 })
    .lean();
  assert.equal(saved.length, 2);
  assert.deepEqual(
    saved.map(({ dayOfWeek, startTime, endTime, trainingTypes }) => ({
      dayOfWeek,
      startTime,
      endTime,
      trainingTypes,
    })),
    rules,
  );
});
test("signup rejects privileged roles, mismatched passwords and missing consent", () => {
  const body = {
    firstName: "A",
    lastName: "B",
    email: " USER@EXAMPLE.COM ",
    password: "twelve-characters-long",
    confirmPassword: "twelve-characters-long",
    terms: true,
  };
  assert.equal(signupSchema.parse(body).email, "user@example.com");
  for (const patch of [
    { role: "ADMIN" },
    { confirmPassword: "wrong" },
    { terms: false },
    { password: "short" },
  ])
    assert.equal(signupSchema.safeParse({ ...body, ...patch }).success, false);
});
test("password hashes and token digests do not store plaintext", async () => {
  const hash = await hashPassword("a-secure-password");
  assert.notEqual(hash, "a-secure-password");
  assert(await checkPassword("a-secure-password", hash));
  assert(!(await checkPassword("wrong", hash)));
  assert.equal(hashToken("token").length, 64);
});
test("money calculation and cancellation boundary are deterministic", () => {
  assert.deepEqual(calculateBookingPrice(900000, 1000), {
    total: 900000,
    commission: 90000,
    trainerEarning: 810000,
  });
  assert.throws(() => calculateBookingPrice(1.5, 1000));
  const now = new Date("2030-01-01T00:00:00Z");
  assert(canCancelBooking(new Date("2030-01-01T12:00:00Z"), 12, now));
  assert(!canCancelBooking(new Date("2030-01-01T11:59:59Z"), 12, now));
});
test("role and ownership guards deny cross-account actions", async () => {
  assert(!allowedRole("CUSTOMER", ["ADMIN"]));
  assert(!ownsBooking(customer, { customerId: other.id, trainerId }));
  await assert.rejects(
    adminAction(customer, "settings", undefined, {}),
    /Admin access required/,
  );
  await assert.rejects(
    trainerAction(customer, "packages", undefined, {}, "POST"),
    /Trainer access required/,
  );
  await assert.rejects(createBooking(trainerActor, {}), /Only customers/);
});
test("availability excludes blocks, past slots and overlapping windows", () => {
  const rules = [
    {
      dayOfWeek: 2,
      startTime: "08:00",
      endTime: "12:00",
      trainingTypes: ["online"],
    },
    {
      dayOfWeek: 2,
      startTime: "09:00",
      endTime: "11:00",
      trainingTypes: ["online"],
    },
  ];
  const slots = generateSlots(
    "2030-01-01",
    "Asia/Karachi",
    60,
    "online",
    rules,
    [
      {
        start: new Date("2030-01-01T04:00:00Z"),
        end: new Date("2030-01-01T05:00:00Z"),
        kind: "BLOCK",
        trainingTypes: [],
      },
    ],
    [],
    0,
    60,
    new Date("2029-12-31T00:00:00Z"),
  );
  assert(slots.length > 0);
  assert.equal(new Set(slots.map((s) => s.start)).size, slots.length);
  assert(
    !slots.some((s) =>
      overlaps(
        { start: new Date(s.start), end: new Date(s.end) },
        {
          start: new Date("2030-01-01T04:00:00Z"),
          end: new Date("2030-01-01T05:00:00Z"),
        },
      ),
    ),
  );
});
test("cross-midnight and daylight-saving slots are represented as UTC instants", () => {
  const midnight = generateSlots(
    "2030-01-02",
    "Asia/Karachi",
    60,
    "online",
    [
      {
        dayOfWeek: 2,
        startTime: "22:00",
        endTime: "02:00",
        trainingTypes: ["online"],
      },
    ],
    [],
    [],
    0,
    60,
    new Date("2029-12-31T00:00:00Z"),
  );
  assert(midnight.length > 0);
  const dst = generateSlots(
    "2030-11-03",
    "America/New_York",
    60,
    "online",
    [
      {
        dayOfWeek: 0,
        startTime: "00:00",
        endTime: "04:00",
        trainingTypes: ["online"],
      },
    ],
    [],
    [],
    0,
    60,
    new Date("2030-11-01T00:00:00Z"),
  );
  assert(dst.length > 0);
  assert.equal(new Set(dst.map((s) => s.start)).size, dst.length);
  assert(
    dst.every(
      (s) =>
        new Date(s.end).getTime() - new Date(s.start).getTime() === 3600000,
    ),
  );
});
test("concurrent partially overlapping checkouts allow exactly one reservation", async () => {
  const later = DateTime.fromISO(start).plus({ minutes: 30 }).toUTC().toISO()!;
  const results = await Promise.allSettled([
    createBooking(customer, {
      packageId,
      start,
      trainingType: "online",
      idempotencyKey: randomUUID(),
    }),
    createBooking(other, {
      packageId,
      start: later,
      trainingType: "online",
      idempotencyKey: randomUUID(),
    }),
  ]);
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  assert.equal(await Session.countDocuments({ status: "HELD" }), 1);
  const winner = await Order.findOne();
  assert(winner);
  const owner = String(winner.customerId) === customer.id ? customer : other;
  await assert.rejects(
    ownedOrder(owner.id === customer.id ? other : customer, String(winner._id)),
    /Booking not found/,
  );
  await cancelBooking(owner, String(winner._id), {
    reason: "Testing cancellation releases the slot",
  });
  assert(
    (await getAvailableSlots(trainerId, day, 60, "online")).some(
      (s) => s.start === start,
    ),
  );
});
test("booking retries preserve snapshots and do not create duplicate orders", async () => {
  const input = {
    packageId,
    start,
    trainingType: "online",
    idempotencyKey: randomUUID(),
  };
  const first = await createBooking(customer, input);
  const second = await createBooking(customer, input);
  assert.equal(String(first._id), String(second._id));
  await TrainerPackage.updateOne(
    { _id: packageId },
    { $set: { price: 1200000 } },
  );
  const stored = await Order.findById(first._id);
  assert.equal(stored?.total, 900000);
  assert.equal(stored?.packageSnapshot.price, 900000);
  assert.equal(stored?.remainingSessions, 7);
  await assert.rejects(
    createBooking(customer, {
      ...input,
      start: DateTime.fromISO(start).plus({ hours: 4 }).toUTC().toISO()!,
    }),
    /Idempotency key/,
  );
});
test("signed payment webhook is idempotent, verifies amount and confirms sessions", async () => {
  const order = await Order.findOne({ bookingStatus: "PENDING_PAYMENT" });
  assert(order);
  await Payment.updateOne(
    { orderId: order._id },
    { $set: { providerId: "track-integration" } },
  );
  const event = {
    token: "event-integration",
    version: "2.0.0",
    merchant_api_key: "integration-merchant",
    type: "payment.succeeded",
    data: {
      tracker: "track-integration",
      amount: order.total,
      currency: "PKR",
    },
  };
  const sign = (raw: string) =>
    createHmac("sha512", process.env.SAFEPAY_WEBHOOK_SECRET!)
      .update(raw)
      .digest("hex");
  assert(!verifyWebhook(JSON.stringify(event), "bad", "secret"));
  const wrong = JSON.stringify({
    ...event,
    data: { ...event.data, amount: 1 },
  });
  await assert.rejects(
    processPaymentEvent(wrong, sign(wrong)),
    /amount mismatch/,
  );
  const raw = JSON.stringify(event);
  await processPaymentEvent(raw, sign(raw));
  await processPaymentEvent(raw, sign(raw));
  assert.equal(
    await Transaction.countDocuments({ orderId: order._id, kind: "SALE" }),
    1,
  );
  assert.equal((await Order.findById(order._id))?.bookingStatus, "CONFIRMED");
  assert.equal(
    await Session.countDocuments({ orderId: order._id, status: "CONFIRMED" }),
    1,
  );
  const next = DateTime.fromISO(start).plus({ hours: 3 }).toUTC().toISO()!;
  await scheduleSession(customer, String(order._id), { start: next });
  assert.equal((await Order.findById(order._id))?.remainingSessions, 6);
  assert.equal(await Session.countDocuments({ orderId: order._id }), 2);
});
test("reviews require a completed owned session and cannot be duplicated", async () => {
  const order = await Order.findOne({ bookingStatus: "CONFIRMED" });
  assert(order);
  const input = {
    orderId: String(order._id),
    rating: 5,
    review: "Careful and thoughtful training session.",
  };
  await assert.rejects(createReview(customer, input), /completed session/);
  await Session.updateOne(
    { orderId: order._id },
    { $set: { status: "COMPLETED" } },
  );
  await assert.rejects(createReview(other, input), /completed session/);
  await createReview(customer, input);
  await assert.rejects(createReview(customer, input));
  assert.equal(await Review.countDocuments({ orderId: order._id }), 1);
});
test("favorites are unique and conversations are private", async () => {
  await favorite(customer, { trainerId, saved: true });
  await favorite(customer, { trainerId, saved: true });
  assert.equal(await Favorite.countDocuments({ customerId: customer.id }), 1);
  const c = await createConversation(customer, { trainerId });
  assert(c);
  assert.equal(String(c.trainerUserId), trainerActor.id);
  await sendMessage(customer, String(c._id), {
    text: "Hello, I would like to ask about your training plan.",
    idempotencyKey: randomUUID(),
  });
  assert.equal(
    await Message.countDocuments({
      conversationId: c._id,
      senderId: trainerActor.id,
    }),
    0,
  );
  assert.equal(
    await Message.countDocuments({
      conversationId: c._id,
      senderId: customer.id,
    }),
    1,
  );
  const legacy = await Conversation.findByIdAndUpdate(
    c._id,
    { $unset: { trainerUserId: 1 } },
    { returnDocument: "after" },
  );
  assert(legacy);
  await sendMessage(customer, String(c._id), {
    text: "One more question about session times.",
    idempotencyKey: randomUUID(),
  });
  assert.equal(
    await Message.countDocuments({
      conversationId: c._id,
      senderId: customer.id,
    }),
    2,
  );
  await ownConversation(trainerActor, String(c._id));
  await assert.rejects(
    ownConversation(other, String(c._id)),
    /Conversation not found/,
  );
});
test("expired tokens are explicitly query-ineligible before TTL cleanup", async () => {
  const token = await AuthToken.create({
    userId: customer.id,
    kind: "RESET",
    tokenHash: hashToken(randomUUID()),
    expiresAt: new Date(Date.now() - 1000),
  });
  assert.equal(
    await AuthToken.findOne({ _id: token._id, expiresAt: { $gt: new Date() } }),
    null,
  );
});
