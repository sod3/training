import mongoose, { Schema, type InferSchemaType } from "mongoose";

const ref = (name: string) => ({
  type: Schema.Types.ObjectId,
  ref: name,
  required: true,
});
const text = (max = 200) => ({
  type: String,
  trim: true,
  maxlength: max,
  default: "",
});
const money = {
  type: Number,
  min: 0,
  validate: Number.isSafeInteger,
  required: true,
};
const options = { timestamps: true as const, strict: "throw" as const };
function model<S extends Schema>(name: string, schema: S) {
  return (
    (mongoose.models[name] as mongoose.Model<InferSchemaType<S>> | undefined) ??
    mongoose.model<InferSchemaType<S>>(name, schema)
  );
}
const user = new Schema(
  {
    firstName: text(80),
    lastName: text(80),
    name: text(170),
    normalizedEmail: {
      type: String,
      required: true,
      unique: true,
      maxlength: 254,
    },
    passwordHash: { type: String, required: true, select: false },
    phone: text(30),
    avatar: text(1000),
    role: {
      type: String,
      enum: ["CUSTOMER", "TRAINER", "ADMIN"],
      required: true,
    },
    status: {
      type: String,
      enum: ["ACTIVE", "SUSPENDED", "DISABLED", "PENDING"],
      default: "ACTIVE",
    },
    // Email delivery is disabled in this deployment, so accounts are active immediately.
    emailVerified: { type: Boolean, default: true },
    phoneVerified: { type: Boolean, default: false },
    onboardingCompleted: { type: Boolean, default: false },
    sessionVersion: { type: Number, default: 0 },
    lastLoginAt: Date,
    lastActiveAt: Date,
    deletionRequestedAt: Date,
  },
  options,
);
export const User = model("User", user);
export const CustomerProfile = model(
  "CustomerProfile",
  new Schema(
    {
      userId: { ...ref("User"), unique: true },
      fitnessGoals: [String],
      preferredTrainingTypes: [String],
      preferredLocations: [String],
      preferredSchedule: text(),
      fitnessLevel: text(),
      timezone: { type: String, default: "Asia/Karachi" },
      notificationPreferences: { email: { type: Boolean, default: true } },
    },
    options,
  ),
);
const trainer = new Schema(
  {
    userId: { ...ref("User"), unique: true },
    slug: { type: String, unique: true, required: true },
    displayName: text(170),
    phone: text(30),
    cnic: text(20),
    cnicUploadId: { type: Schema.Types.ObjectId, ref: "Upload" },
    headline: text(),
    biography: text(5000),
    profileImage: text(1000),
    coverImage: text(1000),
    gallery: [String],
    yearsExperience: { type: Number, min: 0, max: 80, default: 0 },
    specialties: [String],
    trainingGoals: [String],
    trainingTypes: [
      { type: String, enum: ["home", "gym", "outdoor", "online"] },
    ],
    serviceAreas: [String],
    city: text(100),
    timezone: { type: String, default: "Asia/Karachi" },
    languages: [String],
    identityVerificationStatus: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED"],
      default: "PENDING",
    },
    credentialVerificationStatus: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED"],
      default: "PENDING",
    },
    applicationStatus: {
      type: String,
      enum: [
        "DRAFT",
        "SUBMITTED",
        "UNDER_REVIEW",
        "ACTION_REQUIRED",
        "APPROVED",
        "REJECTED",
      ],
      default: "DRAFT",
    },
    profileVisibility: {
      type: String,
      enum: ["PUBLIC", "PRIVATE"],
      default: "PRIVATE",
    },
    featured: { type: Boolean, default: false },
    revision: { type: Number, default: 0 },
  },
  options,
);
trainer.index({ applicationStatus: 1, profileVisibility: 1, featured: -1 });
trainer.index({ specialties: 1 });
trainer.index({ serviceAreas: 1 });
export const TrainerProfile = model("TrainerProfile", trainer);
export const TrainerApplication = model(
  "TrainerApplication",
  new Schema(
    {
      trainerId: { ...ref("TrainerProfile"), unique: true },
      step: { type: Number, min: 0, max: 9, default: 0 },
      status: {
        type: String,
        enum: [
          "DRAFT",
          "SUBMITTED",
          "UNDER_REVIEW",
          "ACTION_REQUIRED",
          "APPROVED",
          "REJECTED",
        ],
        default: "DRAFT",
      },
      adminNotes: text(3000),
      submittedAt: Date,
      reviewedAt: Date,
      reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
    },
    options,
  ),
);
export const TrainerCredential = model(
  "TrainerCredential",
  new Schema(
    {
      trainerId: ref("TrainerProfile"),
      type: {
        type: String,
        enum: ["IDENTITY", "CERTIFICATION"],
        required: true,
      },
      title: text(),
      issuingOrganization: text(),
      credentialNumber: text(),
      issueDate: Date,
      expiryDate: Date,
      uploadId: ref("Upload"),
      verificationStatus: {
        type: String,
        enum: ["PENDING", "APPROVED", "REJECTED", "EXPIRED"],
        default: "PENDING",
      },
      adminNotes: text(3000),
      verifiedBy: { type: Schema.Types.ObjectId, ref: "User" },
      verifiedAt: Date,
    },
    options,
  ),
);
export const TrainerPackage = model(
  "TrainerPackage",
  new Schema(
    {
      trainerId: ref("TrainerProfile"),
      name: text(),
      description: text(2000),
      sessionCount: { type: Number, min: 1, max: 100, required: true },
      sessionDuration: { type: Number, min: 15, max: 180, required: true },
      price: money,
      currency: { type: String, enum: ["PKR"], default: "PKR" },
      trialPackage: { type: Boolean, default: false },
      active: { type: Boolean, default: true },
      sortOrder: { type: Number, default: 0 },
    },
    options,
  ),
);
export const TrainerAvailability = model(
  "TrainerAvailability",
  new Schema(
    {
      trainerId: ref("TrainerProfile"),
      dayOfWeek: { type: Number, min: 0, max: 6, required: true },
      startTime: { type: String, required: true },
      endTime: { type: String, required: true },
      slotDuration: { type: Number, default: 15 },
      timezone: { type: String, required: true },
      trainingTypes: [String],
      active: { type: Boolean, default: true },
    },
    options,
  ),
);
export const TrainerAvailabilityException = model(
  "TrainerAvailabilityException",
  new Schema(
    {
      trainerId: ref("TrainerProfile"),
      start: { type: Date, required: true },
      end: { type: Date, required: true },
      kind: { type: String, enum: ["BLOCK", "AVAILABLE"], required: true },
      reason: text(),
      trainingTypes: [String],
    },
    options,
  ),
);
const snapshot = new Schema(
  {
    name: String,
    trainerName: String,
    sessionCount: Number,
    sessionDuration: Number,
    price: Number,
    commissionBps: Number,
    commission: Number,
    trainerEarning: Number,
    cancellationWindowHours: Number,
  },
  { _id: false },
);
const order = new Schema(
  {
    bookingNumber: { type: String, unique: true, required: true },
    customerId: ref("User"),
    trainerId: ref("TrainerProfile"),
    packageId: ref("TrainerPackage"),
    packageSnapshot: { type: snapshot, required: true },
    trainingType: String,
    trainingAddress: text(1000),
    timezone: String,
    total: money,
    currency: { type: String, default: "PKR" },
    remainingSessions: { type: Number, min: 0, required: true },
    bookingStatus: {
      type: String,
      enum: [
        "PENDING_PAYMENT",
        "CONFIRMED",
        "COMPLETED",
        "CANCELLED",
        "REFUND_PENDING",
        "REFUNDED",
        "EXPIRED",
      ],
      default: "PENDING_PAYMENT",
    },
    paymentStatus: {
      type: String,
      enum: [
        "PENDING",
        "SUBMITTED",
        "PAID",
        "FAILED",
        "REFUND_PENDING",
        "REFUNDED",
        "REJECTED",
      ],
      default: "PENDING",
    },
    holdExpiresAt: Date,
    idempotencyKey: { type: String, required: true },
    requestHash: { type: String, required: true },
    cancellationReason: text(2000),
    cancelledAt: Date,
    cancelledBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  options,
);
order.index({ customerId: 1, idempotencyKey: 1 }, { unique: true });
order.index({ trainerId: 1, createdAt: -1 });
export const Order = model("Order", order);
const session = new Schema(
  {
    orderId: ref("Order"),
    trainerId: ref("TrainerProfile"),
    customerId: ref("User"),
    sessionNumber: { type: Number, required: true },
    start: { type: Date, required: true },
    end: { type: Date, required: true },
    status: {
      type: String,
      enum: [
        "HELD",
        "CONFIRMED",
        "COMPLETED",
        "CANCELLED",
        "NO_SHOW",
        "EXPIRED",
      ],
      default: "HELD",
    },
    holdExpiresAt: Date,
    location: text(1000),
    trainerNotes: { ...text(3000), select: false },
    customerNotes: text(3000),
    completedAt: Date,
    reminderSentAt: Date,
  },
  options,
);
session.index({ trainerId: 1, start: 1, end: 1 });
session.index({ orderId: 1, sessionNumber: 1 }, { unique: true });
session.index({ customerId: 1, start: -1 });
export const Session = model("Session", session);
export const Payment = model(
  "Payment",
  new Schema(
    {
      orderId: { ...ref("Order"), unique: true },
      provider: { type: String, default: "MANUAL" },
      method: {
        type: String,
        enum: ["JAZZCASH", "EASYPAISA"],
      },
      providerId: { type: String, unique: true, sparse: true },
      checkoutUrl: { type: String, select: false },
      payerName: { type: String, trim: true, maxlength: 120 },
      transactionId: { type: String, trim: true, maxlength: 120 },
      proofUploadId: { type: Schema.Types.ObjectId, ref: "Upload" },
      submittedAt: Date,
      reviewedAt: Date,
      reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
      reviewNotes: { type: String, maxlength: 2000 },
      amount: money,
      currency: { type: String, default: "PKR" },
      status: {
        type: String,
        enum: [
          "CREATED",
          "PENDING",
          "SUBMITTED",
          "PAID",
          "FAILED",
          "REFUND_PENDING",
          "REFUNDED",
          "REJECTED",
        ],
        default: "CREATED",
      },
      initiationStartedAt: Date,
      paidAt: Date,
    },
    options,
  ),
);
Payment.collection.createIndex(
  { transactionId: 1 },
  { unique: true, sparse: true },
);
export const WebhookEvent = model(
  "WebhookEvent",
  new Schema(
    {
      eventKey: { type: String, unique: true, required: true },
      providerId: String,
      type: String,
      processedAt: Date,
    },
    options,
  ),
);
export const Transaction = model(
  "Transaction",
  new Schema(
    {
      orderId: ref("Order"),
      trainerId: ref("TrainerProfile"),
      kind: { type: String, enum: ["SALE", "REFUND"], required: true },
      amount: { type: Number, required: true, validate: Number.isSafeInteger },
      platformFee: { type: Number, required: true },
      trainerAmount: { type: Number, required: true },
      key: { type: String, unique: true, required: true },
    },
    options,
  ),
);
export const Refund = model(
  "Refund",
  new Schema(
    {
      orderId: { ...ref("Order"), unique: true },
      amount: money,
      reason: text(2000),
      status: {
        type: String,
        enum: ["REQUESTED", "APPROVED", "PROCESSING", "REFUNDED", "REJECTED"],
        default: "REQUESTED",
      },
      providerReference: text(),
      reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
    },
    options,
  ),
);
export const Payout = model(
  "Payout",
  new Schema(
    {
      trainerId: ref("TrainerProfile"),
      amount: money,
      status: {
        type: String,
        enum: ["REQUESTED", "PROCESSING", "PAID", "REJECTED"],
        default: "REQUESTED",
      },
      reference: text(),
      idempotencyKey: { type: String, unique: true, required: true },
      paidAt: Date,
    },
    options,
  ),
);
const review = new Schema(
  {
    customerId: ref("User"),
    trainerId: ref("TrainerProfile"),
    orderId: { ...ref("Order"), unique: true },
    customerName: text(),
    rating: { type: Number, min: 1, max: 5, required: true },
    review: text(3000),
    trainingGoal: text(),
    verifiedBooking: { type: Boolean, default: true, immutable: true },
    status: {
      type: String,
      enum: ["VISIBLE", "HIDDEN", "FLAGGED"],
      default: "VISIBLE",
    },
  },
  options,
);
review.index({ trainerId: 1, status: 1 });
export const Review = model("Review", review);
const favorite = new Schema(
  { customerId: ref("User"), trainerId: ref("TrainerProfile") },
  options,
);
favorite.index({ customerId: 1, trainerId: 1 }, { unique: true });
export const Favorite = model("Favorite", favorite);
const conversation = new Schema(
  {
    customerId: ref("User"),
    trainerId: ref("TrainerProfile"),
    trainerUserId: ref("User"),
    lastMessageAt: Date,
  },
  options,
);
conversation.index({ customerId: 1, trainerId: 1 }, { unique: true });
export const Conversation = model("Conversation", conversation);
const message = new Schema(
  {
    conversationId: ref("Conversation"),
    senderId: ref("User"),
    text: text(4000),
    readAt: Date,
    idempotencyKey: { type: String, required: true },
  },
  options,
);
message.index({ senderId: 1, idempotencyKey: 1 }, { unique: true });
message.index({ conversationId: 1, createdAt: -1 });
export const Message = model("Message", message);
const notification = new Schema(
  {
    userId: ref("User"),
    title: text(),
    body: text(2000),
    href: text(500),
    readAt: Date,
  },
  options,
);
notification.index({ userId: 1, readAt: 1, createdAt: -1 });
export const Notification = model("Notification", notification);
export const SupportRequest = model(
  "SupportRequest",
  new Schema(
    {
      name: text(),
      email: text(254),
      subject: text(),
      message: text(5000),
      userId: { type: Schema.Types.ObjectId, ref: "User" },
      status: {
        type: String,
        enum: ["OPEN", "IN_PROGRESS", "CLOSED"],
        default: "OPEN",
      },
    },
    options,
  ),
);
export const Taxonomy = model(
  "Taxonomy",
  new Schema(
    {
      kind: {
        type: String,
        enum: ["SPECIALTY", "LOCATION", "FAQ"],
        required: true,
      },
      name: text(),
      slug: { type: String, unique: true, required: true },
      city: text(),
      body: text(3000),
      active: { type: Boolean, default: true },
      sortOrder: { type: Number, default: 0 },
    },
    options,
  ),
);
export const PlatformSettings = model(
  "PlatformSettings",
  new Schema(
    {
      key: { type: String, unique: true, default: "platform" },
      platformName: { type: String, default: "Spotter" },
      supportEmail: text(254),
      currency: { type: String, default: "PKR" },
      defaultTimezone: { type: String, default: "Asia/Karachi" },
      commissionBps: { type: Number, min: 0, max: 5000, default: 1000 },
      cancellationWindowHours: { type: Number, min: 0, default: 12 },
      minimumBookingNoticeHours: { type: Number, min: 0, default: 2 },
      maximumAdvanceBookingDays: {
        type: Number,
        min: 1,
        max: 365,
        default: 60,
      },
      holdMinutes: { type: Number, min: 5, max: 30, default: 10 },
      trainerApplicationEnabled: { type: Boolean, default: true },
      maintenanceMode: { type: Boolean, default: false },
    },
    options,
  ),
);
export const AuditLog = model(
  "AuditLog",
  new Schema(
    {
      actorId: ref("User"),
      actorRole: String,
      action: String,
      entityType: String,
      entityId: String,
      previousValues: Schema.Types.Mixed,
      newValues: Schema.Types.Mixed,
    },
    options,
  ),
);
const authSession = new Schema(
  {
    userId: ref("User"),
    tokenHash: { type: String, unique: true, required: true },
    version: Number,
    expiresAt: { type: Date, required: true },
  },
  options,
);
authSession.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
export const AuthSession = model("AuthSession", authSession);
const token = new Schema(
  {
    userId: ref("User"),
    kind: { type: String, enum: ["VERIFY", "RESET"], required: true },
    tokenHash: { type: String, unique: true, required: true },
    expiresAt: { type: Date, required: true },
  },
  options,
);
token.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
export const AuthToken = model("AuthToken", token);
const rate = new Schema(
  {
    key: { type: String, unique: true, required: true },
    count: { type: Number, default: 0 },
    expiresAt: { type: Date, required: true },
  },
  options,
);
rate.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
export const RateLimit = model("RateLimit", rate);
export const Upload = model(
  "Upload",
  new Schema(
    {
      userId: ref("User"),
      key: { type: String, unique: true, required: true },
      mime: String,
      size: Number,
      // Private verification images are also retained in MongoDB so the
      // verification record is self-contained.
      data: Buffer,
      purpose: {
        type: String,
        enum: ["PUBLIC", "PRIVATE", "PAYMENT_PROOF"],
        required: true,
      },
      status: { type: String, enum: ["READY", "ATTACHED"], default: "READY" },
    },
    options,
  ),
);
export const EmailJob = model(
  "EmailJob",
  new Schema(
    {
      to: { type: String, required: true },
      subject: String,
      encryptedBody: { type: String, required: true, select: false },
      attempts: { type: Number, default: 0 },
      nextAttemptAt: { type: Date, default: Date.now },
      leaseUntil: Date,
      sentAt: Date,
      failedAt: Date,
    },
    options,
  ),
);
export const models = {
  User,
  CustomerProfile,
  TrainerProfile,
  TrainerApplication,
  TrainerCredential,
  TrainerPackage,
  TrainerAvailability,
  TrainerAvailabilityException,
  Order,
  Session,
  Payment,
  WebhookEvent,
  Transaction,
  Refund,
  Payout,
  Review,
  Favorite,
  Conversation,
  Message,
  Notification,
  SupportRequest,
  Taxonomy,
  PlatformSettings,
  AuditLog,
  AuthSession,
  AuthToken,
  RateLimit,
  Upload,
  EmailJob,
};
