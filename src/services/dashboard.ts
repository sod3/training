import mongoose from "mongoose";
import { DateTime } from "luxon";
import { z } from "zod";
import {
  AuditLog,
  AuthSession,
  AuthToken,
  Conversation,
  CustomerProfile,
  Favorite,
  Message,
  Notification,
  Order,
  Payment,
  Payout,
  PlatformSettings,
  Refund,
  Review,
  Session,
  SupportRequest,
  Taxonomy,
  TrainerApplication,
  TrainerAvailability,
  TrainerAvailabilityException,
  TrainerCredential,
  TrainerPackage,
  TrainerProfile,
  Transaction,
  User,
} from "@/models";
import { assert } from "@/lib/server/errors";
import { databaseOperation } from "@/lib/server/diagnostics";
import { appUrl, hashToken, randomToken, type Actor } from "@/lib/server/security";
import { objectId, settingsSchema } from "@/lib/server/validation";
import { lockTrainer, settings } from "./bookings";
import { ownTrainer, reviewApplication } from "./trainer-management";
import { reviewManualPayment, reviewManualRefund } from "./payments";
import { DEFAULT_CATEGORIES, DEFAULT_LANGUAGES, DEFAULT_SPECIALTIES } from "@/lib/catalog";

const listQuery = z.object({
  page: z.coerce.number().int().min(1).max(10000).default(1),
  q: z.string().max(100).default(""),
  status: z.string().max(40).default(""),
  sort: z.enum(["newest", "oldest"]).default("newest"),
  days: z.coerce.number().int().min(1).max(366).default(30),
});
export const adminCollections = {
  users: User,
  customers: User,
  trainers: TrainerProfile,
  applications: TrainerApplication,
  verification: TrainerCredential,
  bookings: Order,
  sessions: Session,
  payments: Payment,
  refunds: Refund,
  payouts: Payout,
  reviews: Review,
  categories: Taxonomy,
  specialties: Taxonomy,
  content: Taxonomy,
  support: SupportRequest,
  "audit-logs": AuditLog,
  transactions: Transaction,
};
const searchFields: Record<string, string[]> = {
  users: ["name", "normalizedEmail"],
  customers: ["name", "normalizedEmail"],
  trainers: ["displayName", "headline", "category", "specialties"],
  bookings: ["bookingNumber"],
  support: ["name", "email", "subject"],
  categories: ["name"],
  specialties: ["name"],
  content: ["name"],
  reviews: ["customerName", "review"],
};

async function catalogOptions() {
  const items = await Taxonomy.find({ kind: { $in: ["CATEGORY", "SPECIALTY"] } })
    .sort({ sortOrder: 1, name: 1 })
    .select("kind name active")
    .lean();
  const configuredCategories = items.filter((item) => item.kind === "CATEGORY");
  const configuredSpecialties = items.filter((item) => item.kind === "SPECIALTY");
  const categories = configuredCategories.filter((item) => item.active).map((item) => item.name);
  const specialties = configuredSpecialties.filter((item) => item.active).map((item) => item.name);
  return {
    categories: configuredCategories.length ? categories : [...DEFAULT_CATEGORIES],
    specialties: configuredSpecialties.length ? specialties : [...DEFAULT_SPECIALTIES],
    languages: [...DEFAULT_LANGUAGES],
  };
}

export async function dashboardData(
  actor: Actor,
  section: string,
  params: Record<string, unknown>,
) {
  const q = listQuery.parse(params);
  const skip = (q.page - 1) * 20;
  const trainer = actor.role === "TRAINER" ? await ownTrainer(actor) : null;
  const scope =
    actor.role === "ADMIN"
      ? {}
      : trainer
        ? { trainerId: trainer._id }
        : { customerId: new mongoose.Types.ObjectId(actor.id) };
  if (
    section === "overview" ||
    section === "analytics" ||
    section === "reports" ||
    section === "earnings"
  ) {
    const since = new Date(Date.now() - q.days * 86400000);
    const customerProfile =
      actor.role === "CUSTOMER"
        ? await CustomerProfile.findOne({ userId: actor.id }).select("timezone").lean()
        : null;
    const requestedZone = trainer?.timezone || customerProfile?.timezone || "Asia/Karachi";
    const zone = DateTime.now().setZone(requestedZone).isValid ? requestedZone : "UTC";
    const today = DateTime.now().setZone(zone).startOf("day");
    const [
      bookings,
      upcoming,
      completed,
      remaining,
      series,
      finance,
      payouts,
      pendingRefunds,
    ] = await Promise.all([
      Order.countDocuments(scope),
      Session.find({
        ...scope,
        status: "CONFIRMED",
        start: { $gte: new Date() },
      })
        .sort({ start: 1 })
        .limit(5)
        .lean(),
      Session.countDocuments({ ...scope, status: "COMPLETED" }),
      Order.aggregate<{ total: number }>([
        { $match: { ...scope, bookingStatus: "CONFIRMED" } },
        { $group: { _id: null, total: { $sum: "$remainingSessions" } } },
      ]),
      Order.aggregate([
        { $match: { ...scope, createdAt: { $gte: since } } },
        {
          $group: {
            _id: {
              $dateToString: {
                format: "%Y-%m-%d",
                date: "$createdAt",
                timezone: zone,
              },
            },
            bookings: { $sum: 1 },
            value: {
              $sum: {
                $cond: [{ $eq: ["$paymentStatus", "PAID"] }, "$total", 0],
              },
            },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      actor.role === "CUSTOMER"
        ? Order.aggregate([
            { $match: { ...scope, paymentStatus: "PAID" } },
            {
              $group: {
                _id: null,
                gross: { $sum: "$total" },
                fees: { $sum: 0 },
                earnings: { $sum: 0 },
              },
            },
          ])
        : Transaction.aggregate([
            { $match: trainer ? { trainerId: trainer._id } : {} },
            {
              $group: {
                _id: null,
                gross: { $sum: "$amount" },
                fees: { $sum: "$platformFee" },
                earnings: { $sum: "$trainerAmount" },
              },
            },
          ]),
      actor.role === "CUSTOMER"
        ? []
        : Payout.aggregate([
            {
              $match: {
                ...(trainer ? { trainerId: trainer._id } : {}),
                status: { $in: ["REQUESTED", "PROCESSING", "PAID"] },
              },
            },
            { $group: { _id: "$status", total: { $sum: "$amount" } } },
          ]),
      actor.role === "ADMIN"
        ? Refund.countDocuments({
            status: { $in: ["REQUESTED", "APPROVED", "PROCESSING"] },
          })
        : 0,
    ]);
    const metrics: Record<string, number> = {
      Bookings: bookings,
      "Completed sessions": completed,
      "Unscheduled sessions": remaining[0]?.total || 0,
      "Today's sessions": await Session.countDocuments({
        ...scope,
        status: "CONFIRMED",
        start: {
          $gte: today.toJSDate(),
          $lt: today.plus({ days: 1 }).toJSDate(),
        },
      }),
    };
    if (actor.role === "ADMIN") {
      metrics.Customers = await User.countDocuments({ role: "CUSTOMER" });
      metrics.Trainers = await User.countDocuments({ role: "TRAINER" });
      metrics["Pending applications"] = await TrainerApplication.countDocuments(
        { status: { $in: ["SUBMITTED", "UNDER_REVIEW"] } },
      );
      metrics["Approved trainers"] = await TrainerProfile.countDocuments({
        applicationStatus: "APPROVED",
      });
      metrics["Refund requests"] = pendingRefunds;
    }
    if (trainer)
      metrics.Clients = (
        await Order.distinct("customerId", {
          trainerId: trainer._id,
          paymentStatus: "PAID",
        })
      ).length;
    return {
      metrics,
      upcoming,
      series,
      finance: finance[0] || { gross: 0, fees: 0, earnings: 0 },
      payouts,
      trainer: trainer?.toObject(),
    };
  }
  if (
    section === "profile" ||
    section === "settings" ||
    section === "security" ||
    section === "progress"
  ) {
    if (section === "settings" && actor.role === "ADMIN")
      return { settings: await settings() };
    return {
      profile: await User.findById(actor.id)
        .select(
          "firstName lastName name phone avatar normalizedEmail emailVerified",
        )
        .lean(),
      preferences: await CustomerProfile.findOne({ userId: actor.id }).lean(),
      trainer: trainer?.toObject(),
      ...(actor.role === "TRAINER" ? { catalog: await catalogOptions() } : {}),
    };
  }
  if (section === "notifications")
    return {
      items: await Notification.find({ userId: actor.id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(20)
        .lean(),
      total: await Notification.countDocuments({ userId: actor.id }),
      page: q.page,
    };
  if (section === "messages") {
    const filter = {
      $or: [{ customerId: actor.id }, { trainerUserId: actor.id }],
    };
    const conversations = await Conversation.find(filter)
      .sort({ lastMessageAt: -1 })
      .skip(skip)
      .limit(20)
      .lean();
    const items = await Promise.all(
      conversations.map(async (c) => ({
        ...c,
        customer: await User.findById(c.customerId).select("name").lean(),
        trainer: await TrainerProfile.findById(c.trainerId)
          .select("displayName")
          .lean(),
        unread: await Message.countDocuments({
          conversationId: c._id,
          senderId: { $ne: actor.id },
          readAt: null,
        }),
      })),
    );
    return {
      items,
      total: await Conversation.countDocuments(filter),
      page: q.page,
    };
  }
  if (actor.role === "ADMIN") {
    assert(section in adminCollections, "Section not found", 404);
    const model = adminCollections[section as keyof typeof adminCollections];
    const filter: Record<string, unknown> =
      section === "customers"
        ? { role: "CUSTOMER" }
        : section === "categories"
          ? { kind: "CATEGORY" }
          : section === "specialties"
            ? { kind: "SPECIALTY" }
          : section === "content"
            ? { kind: "FAQ" }
            : {};
    if (q.status)
      filter[
        section === "bookings"
          ? "bookingStatus"
          : section === "verification"
            ? "verificationStatus"
            : section === "trainers"
              ? "applicationStatus"
              : "status"
      ] = q.status;
    if (q.q && searchFields[section])
      filter.$or = searchFields[section].map((f) => ({
        [f]: {
          $regex: q.q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
          $options: "i",
        },
      }));
    const projection = {
      passwordHash: 0,
      sessionVersion: 0,
      checkoutUrl: 0,
      requestHash: 0,
      idempotencyKey: 0,
    };
    const [items, total] = await Promise.all([
      model.collection
        .find(filter, { projection })
        .sort({ createdAt: q.sort === "oldest" ? 1 : -1 })
        .skip(skip)
        .limit(20)
        .toArray(),
      model.collection.countDocuments(filter),
    ]);
    if (section === "verification") {
      const trainerIds = items.map((item) => item.trainerId).filter(Boolean);
      const trainers = await TrainerProfile.find({ _id: { $in: trainerIds } })
        .select("userId displayName legalName phone cnic cnicUploadId category specialties yearsExperience identityVerificationStatus credentialVerificationStatus applicationStatus profileVisibility")
        .lean();
      const trainerMap = new Map(trainers.map((row) => [String(row._id), row]));
      const userIds = trainers.map((row) => row.userId).filter(Boolean);
      const accounts = await User.find({ _id: { $in: userIds } })
        .select("name normalizedEmail phone status")
        .lean();
      const accountMap = new Map(accounts.map((row) => [String(row._id), row]));
      return {
        items: items.map((item) => {
          const trainerProfile = trainerMap.get(String(item.trainerId));
          return {
            ...item,
            trainer: trainerProfile,
            account: trainerProfile ? accountMap.get(String(trainerProfile.userId)) : undefined,
          };
        }),
        total,
        page: q.page,
      };
    }
    if (section === "applications") {
      const trainerIds = items.map((item) => item.trainerId).filter(Boolean);
      const trainers = await TrainerProfile.find({ _id: { $in: trainerIds } }).lean();
      const trainerMap = new Map(trainers.map((row) => [String(row._id), row]));
      return {
        items: await Promise.all(items.map(async (item) => {
          const trainerProfile = trainerMap.get(String(item.trainerId));
          if (!trainerProfile) return item;
          const [account, credentials, packages, availability] = await Promise.all([
            User.findById(trainerProfile.userId).select("name normalizedEmail phone status").lean(),
            TrainerCredential.find({ trainerId: trainerProfile._id }).sort({ type: 1, createdAt: -1 }).lean(),
            TrainerPackage.find({ trainerId: trainerProfile._id }).sort({ sortOrder: 1 }).lean(),
            TrainerAvailability.find({ trainerId: trainerProfile._id }).sort({ dayOfWeek: 1, startTime: 1 }).lean(),
          ]);
          return { ...item, account, trainer: trainerProfile, credentials, packages, availability };
        })),
        total,
        page: q.page,
      };
    }
    if (section === "payments") {
      const orderIds = items.map((item) => item.orderId).filter(Boolean);
      const orders = await Order.find({ _id: { $in: orderIds } })
        .select(
          "bookingNumber customerId trainerId total currency bookingStatus",
        )
        .lean();
      const orderMap = new Map(
        orders.map((order) => [String(order._id), order]),
      );
      return {
        items: await Promise.all(
          items.map(async (item) => {
            const order = orderMap.get(String(item.orderId));
            return {
              ...item,
              order,
              customer: order
                ? await User.findById(order.customerId)
                    .select("name normalizedEmail")
                    .lean()
                : null,
            };
          }),
        ),
        total,
        page: q.page,
      };
    }
    return { items, total, page: q.page };
  }
  if (section === "bookings" || section === "payments") {
    const filter = {
      ...scope,
      ...(q.status
        ? {
            bookingStatus: z
              .enum([
                "PENDING_PAYMENT",
                "CONFIRMED",
                "COMPLETED",
                "CANCELLED",
                "REFUND_PENDING",
                "REFUNDED",
                "EXPIRED",
              ])
              .parse(q.status),
          }
        : {}),
    };
    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(20)
      .lean();
    const appointments = await Session.find({
      orderId: { $in: orders.map((o) => o._id) },
    })
      .sort({ start: 1 })
      .lean();
    return {
      items: orders.map((o) => ({
        ...o,
        sessions: appointments.filter(
          (s) => String(s.orderId) === String(o._id),
        ),
      })),
      total: await Order.countDocuments(filter),
      page: q.page,
    };
  }
  if (section === "reviews") {
    const items = await Review.find(scope)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(20)
      .lean();
    let eligible: unknown[] = [];
    if (actor.role === "CUSTOMER") {
      const completedOrders = await Order.find({
        customerId: actor.id,
        bookingStatus: "COMPLETED",
      })
        .select("bookingNumber trainerId packageSnapshot updatedAt")
        .sort({ updatedAt: -1 })
        .limit(200)
        .lean();
      const completedOrderIds = completedOrders.map((order) => order._id);
      const reviewed = await Review.find({
        customerId: actor.id,
        orderId: { $in: completedOrderIds },
      })
        .select("orderId")
        .lean();
      const reviewedIds = new Set(reviewed.map((row) => String(row.orderId)));
      const availableOrders = completedOrders.filter(
        (order) => !reviewedIds.has(String(order._id)),
      );
      const trainerIds = availableOrders
        .map((order) => order.trainerId)
        .filter(Boolean);
      const trainers = await TrainerProfile.find({ _id: { $in: trainerIds } })
        .select("displayName")
        .lean();
      const trainerMap = new Map(
        trainers.map((row) => [String(row._id), row.displayName]),
      );
      eligible = availableOrders.map((order) => ({
        orderId: String(order._id),
        bookingNumber: order.bookingNumber,
        trainerName:
          trainerMap.get(String(order.trainerId)) || "Your trainer",
        packageName: order.packageSnapshot?.name || "Online coaching",
        completedAt: order.updatedAt,
      }));
    }
    return {
      items,
      total: await Review.countDocuments(scope),
      page: q.page,
      eligible,
    };
  }
  if (trainer) {
    if (section === "packages")
      return {
        items: await TrainerPackage.find({ trainerId: trainer._id })
          .sort({ sortOrder: 1 })
          .limit(30)
          .lean(),
      };
    if (section === "availability" || section === "calendar")
      return {
        rules: await databaseOperation("TrainerAvailability.find(reload)", () =>
          TrainerAvailability.find({
            trainerId: trainer._id,
          })
            .sort({ dayOfWeek: 1, startTime: 1, _id: 1 })
            .lean(),
        ),
        exceptions: await TrainerAvailabilityException.find({
          trainerId: trainer._id,
          end: { $gte: new Date() },
        })
          .sort({ start: 1 })
          .limit(100)
          .lean(),
        items: await Session.find({
          trainerId: trainer._id,
          start: { $gte: new Date(Date.now() - 30 * 86400000) },
        })
          .sort({ start: 1 })
          .limit(100)
          .lean(),
        timezone: trainer.timezone,
        availabilityReviewStatus: trainer.availabilityReviewStatus,
        availabilityReviewNotes: trainer.availabilityReviewNotes,
      };
    if (section === "verification" || section === "application")
      return {
        application: await TrainerApplication.findOne({ trainerId: trainer._id }).lean(),
        credentials: await TrainerCredential.find({ trainerId: trainer._id }).limit(40).lean(),
        trainer: trainer.toObject(),
        account: await User.findById(actor.id).select("name normalizedEmail phone avatar").lean(),
        packages: await TrainerPackage.find({ trainerId: trainer._id }).sort({ sortOrder: 1 }).limit(30).lean(),
        rules: await TrainerAvailability.find({ trainerId: trainer._id }).sort({ dayOfWeek: 1, startTime: 1 }).lean(),
        catalog: await catalogOptions(),
      };
    if (section === "clients") {
      const ids = await Order.distinct("customerId", {
        trainerId: trainer._id,
        paymentStatus: "PAID",
      });
      const customers = await User.find({ _id: { $in: ids } })
        .select("name avatar")
        .skip(skip)
        .limit(20)
        .lean();
      return {
        items: await Promise.all(
          customers.map(async (c) => ({
            ...c,
            bookings: await Order.find({
              customerId: c._id,
              trainerId: trainer._id,
              paymentStatus: "PAID",
            })
              .select("bookingNumber packageSnapshot.name remainingSessions")
              .limit(20)
              .lean(),
          })),
        ),
        total: ids.length,
        page: q.page,
      };
    }
    if (section === "payouts")
      return {
        items: await Payout.find({ trainerId: trainer._id })
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(20)
          .lean(),
      };
  } else if (["saved", "favorites", "trainers"].includes(section)) {
    const ids =
      section === "trainers"
        ? await Order.distinct("trainerId", {
            customerId: actor.id,
            paymentStatus: "PAID",
          })
        : (
            await Favorite.find({ customerId: actor.id })
              .skip(skip)
              .limit(20)
              .lean()
          ).map((f) => f.trainerId);
    return {
      items: await TrainerProfile.find({
        _id: { $in: ids },
        applicationStatus: "APPROVED",
        profileVisibility: "PUBLIC",
      })
        .select("displayName headline slug profileImage")
        .limit(20)
        .lean(),
    };
  }
  assert(false, "Section not found", 404);
}
export async function adminAction(
  actor: Actor,
  resource: string,
  id: string | undefined,
  data: unknown,
) {
  assert(actor.role === "ADMIN", "Admin access required", 403);
  if (id) objectId.parse(id);
  if (resource === "applications" && id)
    return reviewApplication(actor, id, data);
  if (resource === "payments" && id)
    return reviewManualPayment(actor, id, data);
  if (resource === "refunds" && id) return reviewManualRefund(actor, id, data);
  if (resource === "password-resets" && id) {
    const account = await User.findById(id).select("role status").lean();
    assert(account && account.role !== "ADMIN" && account.status === "ACTIVE", "Account cannot be reset here", 403);
    const token = randomToken();
    await mongoose.connection.transaction(async (session) => {
      await AuthToken.deleteMany({ userId: id, kind: "RESET" }, { session });
      await AuthToken.create([{ userId: id, kind: "RESET", tokenHash: hashToken(token), expiresAt: new Date(Date.now() + 30 * 60 * 1000) }], { session });
      await AuditLog.create([{ actorId: actor.id, actorRole: actor.role, action: "ISSUE_PASSWORD_RESET", entityType: "User", entityId: id }], { session });
    });
    return { message: "One-time password reset link created. It expires in 30 minutes.", resetUrl: `${appUrl()}/reset-password?token=${token}` };
  }
  return mongoose.connection.transaction(async (session) => {
    let before: unknown;
    let after: unknown;
    if (resource === "users" && id) {
      const input = z
        .object({ status: z.enum(["ACTIVE", "SUSPENDED", "DISABLED"]) })
        .strict()
        .parse(data);
      assert(id !== actor.id, "You cannot change your own account status");
      const user = await User.findById(id).session(session);
      assert(
        user && user.role !== "ADMIN",
        "This account cannot be changed here",
        403,
      );
      before = { status: user.status };
      user.status = input.status;
      user.sessionVersion++;
      await user.save({ session });
      await AuthSession.deleteMany({ userId: id }, { session });
      after = input;
    } else if (resource === "verification" && id) {
      const input = z
        .object({
          status: z.enum(["APPROVED", "REJECTED"]),
          notes: z.string().min(3).max(3000),
        })
        .strict()
        .parse(data);
      const credential = await TrainerCredential.findById(id).session(session);
      assert(credential, "Credential not found", 404);
      assert(
        input.status !== "APPROVED" ||
          !credential.expiryDate ||
          credential.expiryDate > new Date(),
        "Expired credentials cannot be approved",
      );
      const trainer = await lockTrainer(credential.trainerId, session);
      const wasApprovedTrainer = trainer.applicationStatus === "APPROVED";
      before = { status: credential.verificationStatus };
      credential.verificationStatus = input.status;
      credential.adminNotes = input.notes;
      credential.verifiedAt = new Date();
      credential.verifiedBy = new mongoose.Types.ObjectId(actor.id);
      await credential.save({ session });

      const [identityApproved, certificationApproved] = await Promise.all([
        TrainerCredential.exists({
          trainerId: trainer._id,
          type: "IDENTITY",
          verificationStatus: "APPROVED",
        }).session(session),
        TrainerCredential.exists({
          trainerId: trainer._id,
          type: "CERTIFICATION",
          verificationStatus: "APPROVED",
          $or: [{ expiryDate: null }, { expiryDate: { $gt: new Date() } }],
        }).session(session),
      ]);
      trainer.identityVerificationStatus = identityApproved ? "APPROVED" : "PENDING";
      trainer.credentialVerificationStatus = certificationApproved ? "APPROVED" : "PENDING";

      const rejectionRequiresAction =
        input.status === "REJECTED" &&
        (!wasApprovedTrainer || credential.type === "IDENTITY" || !certificationApproved);
      if (rejectionRequiresAction) {
        trainer.profileVisibility = "PRIVATE";
        trainer.applicationStatus = "ACTION_REQUIRED";
        await TrainerApplication.updateOne(
          { trainerId: trainer._id },
          { $set: { status: "ACTION_REQUIRED", adminNotes: input.notes } },
          { session },
        );
      }
      await trainer.save({ session });
      await Notification.create(
        [{
          userId: trainer.userId,
          title: `${credential.type === "IDENTITY" ? "Identity" : "Certification"} verification ${input.status.toLowerCase()}`,
          body: input.notes,
          href: "/trainer/verification",
        }],
        { session },
      );
      after = input;
    } else if (resource === "trainers" && id) {
      const input = z
        .object({
          featured: z.boolean(),
          profileVisibility: z.enum(["PUBLIC", "PRIVATE"]),
          availabilityReviewStatus: z.enum(["APPROVED", "UNDER_REVIEW"]),
          availabilityReviewNotes: z.string().max(3000),
        })
        .strict()
        .parse(data);
      const trainer = await lockTrainer(id, session);
      before = {
        featured: trainer.featured,
        profileVisibility: trainer.profileVisibility,
        availabilityReviewStatus: trainer.availabilityReviewStatus,
      };
      if (input.profileVisibility === "PUBLIC")
        assert(
          trainer.applicationStatus === "APPROVED" &&
            trainer.identityVerificationStatus === "APPROVED" &&
            trainer.credentialVerificationStatus === "APPROVED",
          "Approve the trainer application and verification evidence before publishing",
          409,
        );
      trainer.set(input);
      trainer.availabilityReviewedBy = new mongoose.Types.ObjectId(actor.id);
      trainer.availabilityReviewedAt = new Date();
      await trainer.save({ session });
      after = input;
    } else if (resource === "reviews" && id) {
      const input = z
        .object({ status: z.enum(["VISIBLE", "HIDDEN", "FLAGGED"]) })
        .strict()
        .parse(data);
      before = await Review.findByIdAndUpdate(id, { $set: input }, { session })
        .select("status")
        .lean();
      assert(before, "Review not found", 404);
      after = input;
    } else if (resource === "support" && id) {
      const input = z
        .object({ status: z.enum(["OPEN", "IN_PROGRESS", "CLOSED"]) })
        .strict()
        .parse(data);
      before = await SupportRequest.findByIdAndUpdate(
        id,
        { $set: input },
        { session },
      )
        .select("status")
        .lean();
      assert(before, "Request not found", 404);
      after = input;
    } else if (resource === "settings") {
      const input = settingsSchema.parse(data);
      before = await settings(session);
      await PlatformSettings.updateOne(
        { key: "platform" },
        { $set: input },
        { upsert: true, session, runValidators: true },
      );
      after = input;
    } else if (["categories", "specialties", "content"].includes(resource)) {
      const input = z
        .object({
          name: z.string().trim().min(2).max(200),
          slug: z
            .string()
            .regex(/^[a-z0-9-]+$/)
            .max(200),
          body: z.string().max(3000).default(""),
          active: z.boolean().default(true),
          sortOrder: z.number().int().min(0).max(1000).default(0),
        })
        .strict()
        .parse(data);
      const kind =
        resource === "categories"
          ? "CATEGORY"
          : resource === "specialties"
            ? "SPECIALTY"
            : "FAQ";
      if (id) {
        before = await Taxonomy.findOneAndUpdate(
          { _id: id, kind },
          { $set: input },
          { session, runValidators: true },
        ).lean();
        assert(before, "Record not found", 404);
      } else await Taxonomy.create([{ ...input, kind }], { session });
      after = input;
    } else if (resource === "payouts" && id) {
      const input = z
        .object({
          status: z.enum(["PROCESSING", "PAID", "REJECTED"]),
          reference: z.string().min(5).max(200),
        })
        .strict()
        .parse(data);
      const payout = await Payout.findById(id).session(session);
      assert(payout, "Payout not found", 404);
      assert(
        !["PAID", "REJECTED"].includes(payout.status),
        "Payout is already finalized",
        409,
      );
      await lockTrainer(payout.trainerId, session);
      before = { status: payout.status };
      payout.status = input.status;
      payout.reference = input.reference;
      if (input.status === "PAID") payout.paidAt = new Date();
      await payout.save({ session });
      after = input;
    } else assert(false, "Action not found", 404);
    await AuditLog.create(
      [
        {
          actorId: actor.id,
          actorRole: actor.role,
          action: `UPDATE_${resource.toUpperCase()}`,
          entityType: resource,
          entityId: id || "platform",
          previousValues: before,
          newValues: after,
        },
      ],
      { session },
    );
    return { message: "Changes saved" };
  });
}
export async function requestPayout(actor: Actor, data: unknown) {
  const trainer = await ownTrainer(actor);
  const input = z
    .object({
      amount: z.number().int().min(10000),
      idempotencyKey: z.string().uuid(),
    })
    .strict()
    .parse(data);
  return mongoose.connection.transaction(async (session) => {
    await lockTrainer(trainer._id, session);
    const existing = await Payout.findOne({
      idempotencyKey: input.idempotencyKey,
    }).session(session);
    if (existing) {
      assert(
        String(existing.trainerId) === String(trainer._id) &&
          existing.amount === input.amount,
        "Idempotency conflict",
        409,
      );
      return { message: "Payout already requested" };
    }
    // Funds become eligible only for completed orders, after refunds and prior payouts.
    const completed = await Order.find({
      trainerId: trainer._id,
      bookingStatus: "COMPLETED",
      paymentStatus: "PAID",
    })
      .select("_id")
      .session(session);
    const ledger = await Transaction.find({
      trainerId: trainer._id,
      orderId: { $in: completed.map((o) => o._id) },
    }).session(session);
    const payouts = await Payout.find({
      trainerId: trainer._id,
      status: { $in: ["REQUESTED", "PROCESSING", "PAID"] },
    }).session(session);
    const available =
      ledger.reduce((sum, t) => sum + t.trainerAmount, 0) -
      payouts.reduce((sum, p) => sum + p.amount, 0);
    assert(
      input.amount <= available,
      "Amount exceeds earnings available for payout",
      409,
    );
    await Payout.create([{ ...input, trainerId: trainer._id }], { session });
    return { message: "Payout requested" };
  });
}
