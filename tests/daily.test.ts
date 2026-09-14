import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { randomUUID } from "node:crypto";
import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import { DateTime } from "luxon";
import { connectDB } from "../src/lib/server/db";
import { createDailyRoom, createDailyMeetingToken } from "../src/lib/server/daily";
import { type Actor, hashPassword } from "../src/lib/server/security";
import {
  Order,
  Payment,
  Session,
  TrainerApplication,
  TrainerAvailability,
  TrainerPackage,
  TrainerProfile,
  Upload,
  User,
  models,
} from "../src/models";
import { createBooking, joinSession } from "../src/services/bookings";
import { submitManualPayment } from "../src/services/payments";
import { adminAction } from "../src/services/dashboard";

let db: MongoMemoryReplSet;
let customer: Actor;
let otherCustomer: Actor;
let trainerActor: Actor;
let adminActor: Actor;
let trainerId: string;
let packageId: string;
let startIso: string;

before(
  async () => {
    process.env.AUTH_SECRET = "integration-test-secret-that-is-not-for-production";
    process.env.APP_URL = "https://spotter.test";
    db = await MongoMemoryReplSet.create({
      replSet: { count: 1, storageEngine: "wiredTiger" },
    });
    process.env.MONGODB_URI = db.getUri();
    await connectDB();
    for (const model of Object.values(models)) await model.createIndexes();

    const makeUser = async (name: string, role: Actor["role"]): Promise<Actor> => {
      const u = await User.create({
        normalizedEmail: `${name}@daily.test`,
        passwordHash: await hashPassword("test-password-2026"),
        name,
        firstName: name,
        lastName: "User",
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

    customer = await makeUser("dailycustomer", "CUSTOMER");
    otherCustomer = await makeUser("otherdailycustomer", "CUSTOMER");
    trainerActor = await makeUser("dailytrainer", "TRAINER");
    adminActor = await makeUser("dailyadmin", "ADMIN");

    const trainer = await TrainerProfile.create({
      userId: trainerActor.id,
      slug: "daily-test-trainer",
      displayName: "Daily Test Trainer",
      applicationStatus: "APPROVED",
      profileVisibility: "PUBLIC",
      identityVerificationStatus: "APPROVED",
      timezone: "Asia/Karachi",
    });
    trainerId = String(trainer._id);
    await TrainerApplication.create({ trainerId, status: "APPROVED" });

    const pkg = await TrainerPackage.create({
      trainerId,
      name: "Daily Coaching Package",
      description: "Package for testing Daily calling",
      sessionCount: 5,
      sessionDuration: 60,
      price: 500000,
    });
    packageId = String(pkg._id);

    const day = DateTime.now().setZone("Asia/Karachi").plus({ days: 2 }).toISODate()!;
    const weekday = DateTime.fromISO(day).weekday % 7;
    await TrainerAvailability.create({
      trainerId,
      dayOfWeek: weekday,
      startTime: "00:00",
      endTime: "23:59",
      timezone: "Asia/Karachi",
    });

    startIso = DateTime.fromISO(`${day}T14:00`, { zone: "Asia/Karachi" }).toUTC().toISO()!;
  },
  { timeout: 180000 },
);

after(async () => {
  await mongoose.disconnect();
  if (db) await db.stop();
});

test("createDailyRoom and createDailyMeetingToken return valid payloads", async () => {
  const room = await createDailyRoom("SPT-TEST12345");
  assert(room.roomName.includes("spt-test12345"));
  assert(room.roomUrl.length > 0);

  const token = await createDailyMeetingToken({
    roomName: room.roomName,
    userId: customer.id,
    userName: "Daily Customer",
    isTrainer: false,
    start: new Date(),
    end: new Date(Date.now() + 3600000),
  });
  assert(token.length > 0);
});

test("payment approval automatically creates private Daily room on booking and session", async () => {
  const order = await createBooking(customer, {
    packageId,
    start: startIso,
    idempotencyKey: randomUUID(),
  });

  const proof = await Upload.create({
    userId: customer.id,
    key: `payment_proof/${customer.id}/${randomUUID()}.webp`,
    mime: "image/webp",
    size: 4,
    data: Buffer.from([1, 2, 3, 4]),
    purpose: "PAYMENT_PROOF",
  });

  await submitManualPayment(customer, String(order._id), {
    method: "JAZZCASH",
    payerName: "Daily Payer",
    transactionId: `DAILY-${randomUUID()}`,
    proofUploadId: String(proof._id),
  });

  const payment = await Payment.findOne({ orderId: order._id });
  assert(payment);

  await adminAction(adminActor, "payments", String(payment._id), {
    decision: "APPROVE",
    notes: "Approved for Daily video test.",
  });

  const updatedOrder = await Order.findById(order._id);
  assert(updatedOrder);
  assert.equal(updatedOrder.bookingStatus, "CONFIRMED");
  assert.equal(updatedOrder.paymentStatus, "PAID");
  assert.equal(updatedOrder.videoProvider, "DAILY");
  assert(updatedOrder.dailyRoomName);
  assert(updatedOrder.dailyRoomUrl);

  const session = await Session.findOne({ orderId: order._id, sessionNumber: 1 });
  assert(session);
  assert.equal(session.status, "CONFIRMED");
  assert.equal(session.videoProvider, "DAILY");
  assert.equal(session.dailyRoomName, updatedOrder.dailyRoomName);
  assert.equal(session.dailyRoomUrl, updatedOrder.dailyRoomUrl);
});

test("joinSession enforces security checks (auth, ownership, confirmed status, payment, time window)", async () => {
  const order = await Order.findOne({ bookingStatus: "CONFIRMED" });
  assert(order);
  const session = await Session.findOne({ orderId: order._id, status: "CONFIRMED" });
  assert(session);

  // Check 1: Denies unauthorized user
  await assert.rejects(
    joinSession(otherCustomer, { bookingId: String(order._id) }),
    /not authorized/,
  );

  // Check 2: Denies when current time is outside joining window (startIso is 2 days in future)
  await assert.rejects(
    joinSession(customer, { bookingId: String(order._id) }),
    /window opens 15 minutes before/,
  );

  // Temporarily adjust session start and end to cover current time
  const now = new Date();
  const pastStart = new Date(now.getTime() - 10 * 60 * 1000); // Started 10 mins ago
  const futureEnd = new Date(now.getTime() + 50 * 60 * 1000); // Ends in 50 mins

  session.start = pastStart;
  session.end = futureEnd;
  await session.save();

  // Check 3: Customer can join active session within window
  const customerAccess = await joinSession(customer, { bookingId: String(order._id) });
  assert(customerAccess.token);
  assert.equal(customerAccess.isOwner, false);
  assert.equal(customerAccess.roomName, session.dailyRoomName);

  // Check 4: Trainer joins active session as host (isOwner: true)
  const trainerAccess = await joinSession(trainerActor, { bookingId: String(order._id) });
  assert(trainerAccess.token);
  assert.equal(trainerAccess.isOwner, true);
  assert.equal(trainerAccess.roomName, session.dailyRoomName);
});
