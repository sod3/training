import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import { DateTime } from "luxon";
import { connectDB } from "../src/lib/server/db";
import { AppError, errorResponse } from "../src/lib/server/errors";
import { databaseOperation } from "../src/lib/server/diagnostics";
import { availabilitySchema } from "../src/lib/server/validation";
import { type Actor } from "../src/lib/server/security";
import {
  TrainerAvailability,
  TrainerProfile,
  TrainerPackage,
  User,
  Session,
  models,
} from "../src/models";
import { trainerAction } from "../src/services/trainer-management";
import { dashboardData } from "../src/services/dashboard";
import { getAvailableSlots, getAvailableWeek } from "../src/services/bookings";

let db: MongoMemoryReplSet;
let actor: Actor;
let trainerId: mongoose.Types.ObjectId;
const rule = {
  dayOfWeek: 1,
  startTime: "09:00",
  endTime: "12:00",
};
const two = [rule, { ...rule, dayOfWeek: 2 }];
const save = (rules: unknown[], method = "POST") =>
  trainerAction(actor, "availability", undefined, { rules }, method);
const read = () =>
  TrainerAvailability.find({ trainerId })
    .sort({ dayOfWeek: 1, startTime: 1 })
    .lean();
const fields = (rows: Awaited<ReturnType<typeof read>>) =>
  rows.map(({ dayOfWeek, startTime, endTime }) => ({
    dayOfWeek,
    startTime,
    endTime,
  }));

before(
  async () => {
    db = await MongoMemoryReplSet.create({
      replSet: { count: 1, storageEngine: "wiredTiger" },
    });
    process.env.MONGODB_URI = db.getUri();
    await connectDB();
    for (const model of Object.values(models)) await model.createIndexes();
    const user = await User.create({
      normalizedEmail: "availability@example.test",
      passwordHash: "test-only",
      role: "TRAINER",
    });
    actor = {
      id: String(user._id),
      role: "TRAINER",
      name: "Test",
      email: user.normalizedEmail,
      avatar: "",
      emailVerified: true,
    };
    const trainer = await TrainerProfile.create({
      userId: user._id,
      slug: "availability",
      timezone: "Asia/Karachi",
    });
    trainerId = trainer._id;
  },
  { timeout: 180000 },
);

after(async () => {
  await mongoose.disconnect();
  if (db) await db.stop();
});

test("add, edit, delete one, delete all and reload retain timezone and another trainer's rows", async () => {
  const otherId = new mongoose.Types.ObjectId();
  await TrainerAvailability.create({
    ...rule,
    trainerId: otherId,
    timezone: "UTC",
  });
  await save(two);
  assert.deepEqual(fields(await read()), two);
  assert(
    (await read()).every(
      (row) =>
        row.timezone === "Asia/Karachi" && row.trainerId.equals(trainerId),
    ),
  );
  const loaded = await dashboardData(actor, "availability", {});
  assert.equal((loaded as { rules: unknown[] }).rules.length, 2);
  const edited = [{ ...rule, startTime: "08:30" }, two[1]];
  await save(edited, "PATCH");
  assert.deepEqual(fields(await read()), edited);
  await save([edited[0]]);
  assert.deepEqual(fields(await read()), [edited[0]]);
  await save([]);
  assert.deepEqual(await read(), []);
  assert.equal(
    await TrainerAvailability.countDocuments({ trainerId: otherId }),
    1,
  );
  assert.equal(
    (await TrainerProfile.findById(trainerId))?.availabilityReviewStatus,
    "APPROVED",
  );
});

test("duplicate/overlapping windows including overnight week wrap conflict; adjacent windows succeed", async () => {
  for (const invalid of [
    [rule, rule],
    [rule, { ...rule, startTime: "11:00", endTime: "13:00" }],
    [
      { ...rule, dayOfWeek: 6, startTime: "23:00", endTime: "02:00" },
      { ...rule, dayOfWeek: 0, startTime: "01:00", endTime: "03:00" },
    ],
    [
      { ...rule, startTime: "23:00", endTime: "02:00" },
      { ...rule, dayOfWeek: 2, startTime: "01:00", endTime: "03:00" },
    ],
  ])
    await assert.rejects(
      save(invalid),
      (error: unknown) => error instanceof AppError && error.status === 409,
    );
  const adjacent = [rule, { ...rule, startTime: "12:00", endTime: "14:00" }];
  await save(adjacent);
  assert.deepEqual(fields(await read()), adjacent);
  const overnight = [
    { ...rule, dayOfWeek: 6, startTime: "23:00", endTime: "02:00" },
    { ...rule, dayOfWeek: 0, startTime: "02:00", endTime: "03:00" },
  ];
  await save(overnight);
  assert.equal((await read()).length, 2);
});

test("input and Mongoose schema reject invalid times, weekdays, types, zones and ObjectIds", async () => {
  await save(two);
  const original = await read();
  for (const patch of [
    { dayOfWeek: 7 },
    { dayOfWeek: 1.5 },
    { startTime: "24:00" },
    { startTime: "2030-01-01T09:00:00Z" },
    { endTime: "09:00" },
  ]) {
    assert.equal(
      availabilitySchema.safeParse({ rules: [{ ...rule, ...patch }] }).success,
      false,
    );
    await assert.rejects(save([{ ...rule, ...patch }]));
    await assert.rejects(
      new TrainerAvailability({
        ...rule,
        trainerId,
        timezone: "UTC",
        ...patch,
      }).validate(),
    );
  }
  await assert.rejects(
    new TrainerAvailability({
      ...rule,
      trainerId: "bad-id",
      timezone: "UTC",
    }).validate(),
  );
  await assert.rejects(
    new TrainerAvailability({
      ...rule,
      trainerId,
      timezone: "Not/AZone",
    }).validate(),
  );
  await assert.rejects(save(Array.from({ length: 29 }, () => rule)));
  await assert.rejects(
    save([{ ...rule, trainerId: String(new mongoose.Types.ObjectId()) }]),
  );
  assert.deepEqual(await read(), original);
  await assert.rejects(
    trainerAction(
      { ...actor, role: "CUSTOMER" },
      "availability",
      undefined,
      { rules: two },
      "POST",
    ),
    (error: unknown) => error instanceof AppError && error.status === 403,
  );
  await assert.rejects(
    trainerAction(
      { ...actor, id: "bad-id" },
      "availability",
      undefined,
      { rules: two },
      "POST",
    ),
  );
  await assert.rejects(
    trainerAction(
      { ...actor, id: String(new mongoose.Types.ObjectId()) },
      "availability",
      undefined,
      { rules: two },
      "POST",
    ),
    (error: unknown) => error instanceof AppError && error.status === 404,
  );
});

test("a real database write failure rolls back deletion, inserted rows and trainer metadata", async () => {
  await save(two);
  const original = await read();
  const profile = await TrainerProfile.findById(trainerId).lean();
  const name = "test_unique_trainer_weekday";
  await TrainerAvailability.collection.createIndex(
    { trainerId: 1, dayOfWeek: 1 },
    { unique: true, name },
  );
  try {
    // Valid adjacent windows pass application validation. The second database
    // insert deliberately violates this test-only index after the first succeeds.
    await assert.rejects(
      save([rule, { ...rule, startTime: "13:00", endTime: "14:00" }]),
      (error: unknown) =>
        !!error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === 11000,
    );
    assert.deepEqual(await read(), original);
    assert.deepEqual(await TrainerProfile.findById(trainerId).lean(), profile);
  } finally {
    await TrainerAvailability.collection.dropIndex(name);
  }
});

test("concurrent replacements serialize without mixing schedules or losing reservations", async () => {
  const reservation = await Session.create({
    orderId: new mongoose.Types.ObjectId(),
    trainerId,
    customerId: actor.id,
    sessionNumber: 1,
    start: new Date("2035-01-01T04:00:00Z"),
    end: new Date("2035-01-01T05:00:00Z"),
    status: "CONFIRMED",
  });
  const alternative = two.map((row) => ({
    ...row,
    startTime: "15:00",
    endTime: "18:00",
  }));
  await Promise.all([save(two), save(alternative)]);
  const actual = JSON.stringify(fields(await read()));
  assert([JSON.stringify(two), JSON.stringify(alternative)].includes(actual));
  await save([]);
  assert.equal((await Session.findById(reservation._id))?.status, "CONFIRMED");
});

test("invalid stored timezone fails safely without deleting the previous schedule", async () => {
  await save(two);
  const original = await read();
  await TrainerProfile.collection.updateOne(
    { _id: trainerId },
    { $set: { timezone: "Not/AZone" } },
  );
  try {
    await assert.rejects(save([]), /TrainerProfile.timezone/);
    assert.deepEqual(await read(), original);
  } finally {
    await TrainerProfile.collection.updateOne(
      { _id: trainerId },
      { $set: { timezone: "Asia/Karachi" } },
    );
  }
});

test("public availability uses schedule training types when the legacy profile list is empty", async () => {
  const user = await User.create({
    normalizedEmail: "public-availability@example.test",
    passwordHash: "test-only",
    role: "TRAINER",
  });
  const trainer = await TrainerProfile.create({
    userId: user._id,
    slug: "public-availability",
    displayName: "Public Schedule",
    timezone: "Asia/Karachi",
    applicationStatus: "APPROVED",
    profileVisibility: "PUBLIC",
  });
  const pkg = await TrainerPackage.create({
    trainerId: trainer._id,
    name: "One session",
    description: "One public availability test session",
    sessionCount: 1,
    sessionDuration: 60,
    price: 10000,
  });
  const date = DateTime.now()
    .setZone("Asia/Karachi")
    .plus({ days: 3 })
    .toISODate()!;
  const dayOfWeek = DateTime.fromISO(date).weekday % 7;
  await TrainerAvailability.create([
    {
      trainerId: trainer._id,
      dayOfWeek,
      startTime: "09:00",
      endTime: "11:00",
      timezone: "Asia/Karachi",
    },
    {
      trainerId: trainer._id,
      dayOfWeek,
      startTime: "13:00",
      endTime: "15:00",
      timezone: "Asia/Karachi",
    },
  ]);

  const all = await getAvailableSlots(
    String(trainer._id),
    date,
    pkg.sessionDuration,
  );
  assert.equal(all.length, 10);
  const week = await getAvailableWeek(
    String(trainer._id),
    date,
    pkg.sessionDuration,
  );
  assert.equal(week.length, 7);
  assert.equal(week[0].date, date);
  assert.equal(week[0].slots.length, 10);

});

test("connection cache shares cold/warm connections, recovers after disconnect and failed attempts", async () => {
  const validUri = process.env.MONGODB_URI!;
  const cachedClient = mongoose.connection.getClient();
  await Promise.all(Array.from({ length: 8 }, () => connectDB()));
  assert.equal(mongoose.connection.getClient(), cachedClient);
  await mongoose.disconnect();
  const attempts = await Promise.all(
    Array.from({ length: 8 }, () => connectDB()),
  );
  assert(attempts.every((entry) => entry === mongoose));
  assert.notEqual(mongoose.connection.getClient(), cachedClient);
  assert.equal(TrainerAvailability.db, mongoose.connection);
  assert.equal(mongoose.models.TrainerAvailability, TrainerAvailability);
  assert.equal((await read()).length, 2);
  await mongoose.disconnect();
  try {
    delete process.env.MONGODB_URI;
    await assert.rejects(connectDB(), /not configured/);
    process.env.MONGODB_URI = "https://invalid.test";
    await assert.rejects(connectDB(), /must use mongodb/);
    process.env.MONGODB_URI = "mongodb://127.0.0.1:1/unreachable";
    await assert.rejects(connectDB());
  } finally {
    process.env.MONGODB_URI = validUri;
  }
  await connectDB();
  assert.equal((await read()).length, 2);
});

test("error responses classify failures and log original Mongoose details without frontend secrets", async (t) => {
  const output = t.mock.method(console, "error", () => {});
  const oldSecret = process.env.AUTH_SECRET;
  process.env.AUTH_SECRET = "test-secret-never-expose";
  try {
    const error = new mongoose.Error(
      "Cannot call create() with multiple documents; mongodb+srv://user:password@db.example/test test-secret-never-expose",
    );
    await assert.rejects(
      databaseOperation(
        "TrainerAvailability.create(weekly rules)",
        async () => {
          throw error;
        },
      ),
    );
    const response = errorResponse(error, {
      method: "POST",
      route: "/api/trainer/availability",
    });
    assert.equal(response.status, 500);
    const body = await response.text();
    assert(
      !/Mongoose|password|test-secret|db.example|stack|create\(\)/.test(body),
    );
    const log = JSON.parse(output.mock.calls.at(-1)!.arguments[1] as string);
    assert.equal(log.operation, "TrainerAvailability.create(weekly rules)");
    assert.equal(log.error.name, "MongooseError");
    assert.match(log.error.message, /Cannot call create/);
    assert.match(log.error.stack, /availability.test.ts/);
    assert(
      !/user:password|test-secret-never-expose|db.example/.test(
        JSON.stringify(log),
      ),
    );
    assert.equal(log.requestId, response.headers.get("X-Request-Id"));
    const validation = await new TrainerAvailability({
      ...rule,
      trainerId: "invalid",
    })
      .validate()
      .then(
        () => assert.fail("Expected validation to fail"),
        (error: unknown) => error,
      );
    const invalidInput = availabilitySchema.safeParse({
      rules: [{ ...rule, dayOfWeek: 9 }],
    });
    assert(!invalidInput.success);
    for (const [failure, status] of [
      [validation, 400],
      [new mongoose.Error.CastError("ObjectId", "invalid", "trainerId"), 400],
      [invalidInput.error, 400],
      [Object.assign(new Error("duplicate"), { code: 11000 }), 409],
      [new AppError("Sign in", 401), 401],
      [new AppError("Forbidden", 403), 403],
      [new AppError("Not found", 404), 404],
      [new Error("database failed"), 500],
    ] as const)
      assert.equal(errorResponse(failure).status, status);
    const validationLog = output.mock.calls
      .map((call) => JSON.parse(call.arguments[1] as string))
      .find((entry) => entry.error.name === "ValidationError");
    assert(
      validationLog.error.validationErrors.some(
        (entry: { name: string }) => entry.name === "CastError",
      ),
    );
  } finally {
    if (oldSecret === undefined) delete process.env.AUTH_SECRET;
    else process.env.AUTH_SECRET = oldSecret;
  }
});
