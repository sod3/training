import mongoose from "mongoose";
import { connectDB } from "../src/lib/server/db";
import { EmailLog, Order, TrainerPackage, TrainerProfile, User } from "../src/models";
import { hashPassword } from "../src/lib/server/security";
import { sendWelcomeEmail, sendBookingCreatedEmail, sendPaymentSubmittedEmail, sendPaymentApprovedEmail, sendBookingCancelledEmail, sendSessionRescheduledEmail, sendTrainerStatusEmail } from "../src/lib/server/email";

async function runEmailLifecycleAudit() {
  console.log("=== STARTING SPOTTER EMAIL LIFECYCLE AUDIT ===");
  
  // Set fallback env for testing script if not set
  if (!process.env.MONGODB_URI) {
    process.env.MONGODB_URI = "mongodb+srv://training-user:training@cluster0.4oipugs.mongodb.net/";
  }
  
  await connectDB();
  console.log("✓ Connected to Database");

  const testSuffix = String(Date.now()).slice(-6);
  const customerEmail = `customer_${testSuffix}@example.com`;
  const trainerEmail = `trainer_${testSuffix}@example.com`;

  // 1. Create Test Accounts in DB
  console.log("\n[1/7] Creating test Customer and Trainer accounts...");
  const customerUser = await User.create({
    firstName: "Alice",
    lastName: "Customer",
    name: "Alice Customer",
    normalizedEmail: customerEmail,
    passwordHash: await hashPassword("TestPassword123!"),
    role: "CUSTOMER",
    emailVerified: true,
  });

  const trainerUser = await User.create({
    firstName: "Bob",
    lastName: "Trainer",
    name: "Bob Trainer",
    normalizedEmail: trainerEmail,
    passwordHash: await hashPassword("TestPassword123!"),
    role: "TRAINER",
    emailVerified: true,
  });

  const trainerProfile = await TrainerProfile.create({
    userId: trainerUser._id,
    displayName: "Coach Bob",
    slug: `coach-bob-${testSuffix}`,
    applicationStatus: "APPROVED",
    profileVisibility: "PUBLIC",
    identityVerificationStatus: "APPROVED",
  });

  console.log(`✓ Customer created: ${customerUser.name} (${customerUser.normalizedEmail})`);
  console.log(`✓ Trainer created: ${trainerProfile.displayName} (${trainerUser.normalizedEmail})`);

  // 2. Welcome Email Dispatch
  console.log("\n[2/7] Testing Welcome Emails for Signup...");
  await sendWelcomeEmail({ to: customerUser.normalizedEmail, name: customerUser.name, role: "CUSTOMER" });
  await sendWelcomeEmail({ to: trainerUser.normalizedEmail, name: trainerUser.name, role: "TRAINER" });

  // 3. New Booking Created Email Dispatch
  console.log("\n[3/7] Testing New Booking Created Emails...");
  const mockBookingNumber = `SPT-TEST-${testSuffix}`;
  const mockStart = new Date(Date.now() + 86400000).toISOString();
  await sendBookingCreatedEmail({
    customerId: customerUser._id,
    trainerId: trainerProfile._id,
    bookingNumber: mockBookingNumber,
    packageName: "1-on-1 Elite Strength",
    sessionCount: 5,
    total: 1500000,
    currency: "PKR",
    sessionStart: mockStart,
    timezone: "Asia/Karachi",
    orderId: new mongoose.Types.ObjectId().toHexString(),
  });

  // 4. Payment Submitted Email Dispatch
  console.log("\n[4/7] Testing Payment Proof Submitted Email...");
  await sendPaymentSubmittedEmail({
    customerId: customerUser._id,
    bookingNumber: mockBookingNumber,
    method: "JAZZCASH",
    transactionId: `JC-${testSuffix}`,
    orderId: new mongoose.Types.ObjectId().toHexString(),
  });

  // 5. Payment Approved Email Dispatch
  console.log("\n[5/7] Testing Payment Approved Email...");
  await sendPaymentApprovedEmail({
    customerId: customerUser._id,
    trainerId: trainerProfile._id,
    bookingNumber: mockBookingNumber,
    packageName: "1-on-1 Elite Strength",
    orderId: new mongoose.Types.ObjectId().toHexString(),
    notes: "Verified JazzCash reference",
  });

  // 6. Session Reschedule & Booking Cancelled Emails
  console.log("\n[6/7] Testing Session Reschedule & Cancellation Emails...");
  await sendSessionRescheduledEmail({
    customerId: customerUser._id,
    trainerId: trainerProfile._id,
    bookingNumber: mockBookingNumber,
    newStart: new Date(Date.now() + 172800000).toISOString(),
    timezone: "Asia/Karachi",
    isNewSchedule: false,
  });

  await sendBookingCancelledEmail({
    customerId: customerUser._id,
    trainerId: trainerProfile._id,
    bookingNumber: mockBookingNumber,
    reason: "Schedule conflict test",
    refundAmount: 1500000,
    orderId: new mongoose.Types.ObjectId().toHexString(),
  });

  await sendTrainerStatusEmail({
    trainerUserId: trainerUser._id,
    displayName: trainerProfile.displayName,
    status: "APPROVED",
    adminNotes: "Credentials verified successfully.",
  });

  // 7. Audit Email Log Collection
  console.log("\n[7/7] Auditing EmailLog Database Collection...");
  const logs = await EmailLog.find({
    recipient: { $in: [customerEmail, trainerEmail] },
  }).sort({ createdAt: 1 }).lean();

  console.log(`\nFound ${logs.length} EmailLog records created for test accounts:`);
  console.table(
    logs.map((l) => ({
      Event: l.event,
      Recipient: l.recipient,
      Status: l.status,
      Subject: l.subject.slice(0, 45),
      MessageId: l.messageId || "N/A",
      Error: l.error || "None",
    }))
  );

  // Cleanup test users
  await User.deleteMany({ _id: { $in: [customerUser._id, trainerUser._id] } });
  await TrainerProfile.deleteOne({ _id: trainerProfile._id });

  console.log("\n✅ EMAIL LIFECYCLE AUDIT COMPLETE!");
  process.exit(0);
}

runEmailLifecycleAudit().catch((err) => {
  console.error("FATAL ERROR IN EMAIL AUDIT:", err);
  process.exit(1);
});
