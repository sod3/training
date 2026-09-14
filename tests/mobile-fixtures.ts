// Only used by tests/server.ts with MOBILE_AUDIT=1, against its fresh in-memory DB.
import { readFile } from "node:fs/promises";
import { models as m } from "../src/models";
import { hashPassword } from "../src/lib/server/security";

export async function seedMobileAudit() {
  const passwordHash = await hashPassword("mobile-audit-password");
  const customer = await m.User.create({
    firstName: "Amina",
    lastName: "Khan",
    name: "Amina Khan",
    normalizedEmail: "mobile-customer@spotter.test",
    passwordHash,
    role: "CUSTOMER",
  });
  await m.CustomerProfile.create({
    userId: customer._id,
    fitnessGoals: ["Strength Training"],
    timezone: "Asia/Karachi",
  });
  await m.PlatformSettings.create({
    key: "platform",
    supportEmail: "support@spotter.test",
  });
  for (const [index, name] of [
    "Ahmed Mahmood",
    "Bilal Hassan",
    "Omar Abdullah",
  ].entries()) {
    const user = await m.User.create({
      firstName: name.split(" ")[0],
      lastName: name.split(" ")[1],
      name,
      normalizedEmail: `mobile-trainer${index}@spotter.test`,
      passwordHash,
      role: "TRAINER",
      onboardingCompleted: true,
    });
    const trainer = await m.TrainerProfile.create({
      userId: user._id,
      slug: `mobile-coach-${index}`,
      displayName: name,
      headline: "Strength, confidence, and a routine that fits your life.",
      biography:
        "I help you build lasting strength with thoughtful, one-to-one coaching. Each session combines clear guidance, technique feedback, and a progressive plan tailored to your experience, available equipment, and goals. We’ll find a sustainable routine that makes you feel stronger every week.",
      category: index === 1 ? "Weight Loss" : "Strength Training",
      specialties: ["Strength Training", "Mobility"],
      profileImage: `/images/${["ahmed", "bilal", "omar"][index]}.webp`,
      yearsExperience: 8,
      applicationStatus: "APPROVED",
      profileVisibility: "PUBLIC",
      identityVerificationStatus: "APPROVED",
      featured: true,
      timezone: "Asia/Karachi",
    });
    await m.TrainerApplication.create({
      trainerId: trainer._id,
      status: "APPROVED",
    });
    const upload = await m.Upload.create({
      userId: user._id,
      key: `audit-cert-${index}`,
      mime: "image/webp",
      data: await readFile("public/images/ahmed.webp"),
      purpose: "PRIVATE",
      status: "ATTACHED",
    });
    await m.TrainerCredential.create({
      trainerId: trainer._id,
      type: "CERTIFICATION",
      title: "Certified Personal Trainer",
      uploadId: upload._id,
      verificationStatus: "APPROVED",
    });
    const pkg = await m.TrainerPackage.create({
      trainerId: trainer._id,
      name: "Personal strength coaching",
      description:
        "A focused session with a clear plan and personal technique feedback.",
      sessionCount: 1,
      sessionDuration: 60,
      price: 250000 + index * 50000,
    });
    await m.TrainerPackage.create({
      trainerId: trainer._id,
      name: "Build your routine · 8 sessions",
      description:
        "Progressive coaching and support to help you build a consistent training habit.",
      sessionCount: 8,
      sessionDuration: 45,
      price: 1600000,
    });
    for (let day = 0; day < 7; day++)
      await m.TrainerAvailability.create({
        trainerId: trainer._id,
        dayOfWeek: day,
        startTime: "14:00",
        endTime: "18:00",
        timezone: "Asia/Karachi",
      });
    if (index !== 0) continue;
    await m.Favorite.create({
      customerId: customer._id,
      trainerId: trainer._id,
    });
    const snapshot = {
      name: pkg.name,
      trainerName: name,
      sessionCount: 1,
      sessionDuration: 60,
      price: pkg.price,
      commissionBps: 1000,
      commission: 25000,
      trainerEarning: 225000,
      cancellationWindowHours: 12,
    };
    for (const [i, status] of (
      [
        "CONFIRMED",
        "COMPLETED",
        "PENDING_PAYMENT",
        "CANCELLED",
        "REFUND_PENDING",
        "REFUNDED",
        "EXPIRED",
        "PENDING_PAYMENT",
      ] as const
    ).entries()) {
      const order = await m.Order.create({
        bookingNumber: `SPT-MOBILE-2026-0000${i}`,
        customerId: customer._id,
        trainerId: trainer._id,
        packageId: pkg._id,
        packageSnapshot: snapshot,
        timezone: "Asia/Karachi",
        total: pkg.price,
        remainingSessions: status === "COMPLETED" ? 0 : 1,
        bookingStatus: status,
        paymentStatus:
          i === 7
            ? "REJECTED"
            : status === "PENDING_PAYMENT"
              ? "SUBMITTED"
              : status === "REFUND_PENDING" || status === "REFUNDED"
                ? status
                : "PAID",
        idempotencyKey: `mobile-order-${i}`,
        requestHash: "audit",
        holdExpiresAt:
          status === "PENDING_PAYMENT"
            ? new Date(Date.now() + 86400000)
            : undefined,
      });
      const start = new Date(Date.now() + (i === 1 ? -3 : 3 + i) * 86400000);
      await m.Session.create({
        orderId: order._id,
        customerId: customer._id,
        trainerId: trainer._id,
        sessionNumber: 1,
        start,
        end: new Date(start.getTime() + 3600000),
        status:
          status === "PENDING_PAYMENT"
            ? "HELD"
            : status === "CONFIRMED" || status === "COMPLETED"
              ? status
              : "CANCELLED",
        meetingUrl: "https://meet.google.com/abc-defg-hij",
        meetingStatus: "CREATED",
      });
      const proof = await m.Upload.create({
        userId: customer._id,
        key: `audit-proof-${i}`,
        mime: "image/webp",
        data: await readFile("public/images/ahmed.webp"),
        purpose: "PAYMENT_PROOF",
        status: "ATTACHED",
      });
      await m.Payment.create({
        orderId: order._id,
        method: "BANK_TRANSFER",
        amount: pkg.price,
        payerName: "Amina Khan",
        transactionId: `MOBILE-AUDIT-LONG-TRANSACTION-REFERENCE-2026-${i}`,
        status:
          i === 7
            ? "REJECTED"
            : status === "PENDING_PAYMENT"
              ? "SUBMITTED"
              : status === "REFUND_PENDING" || status === "REFUNDED"
                ? status
                : "PAID",
        proofUploadId: proof._id,
      });
      if (status === "COMPLETED") {
        await m.Transaction.create({
          orderId: order._id,
          trainerId: trainer._id,
          kind: "SALE",
          amount: pkg.price,
          platformFee: 25000,
          trainerAmount: 225000,
          key: "audit-sale",
        });
        await m.Review.create({
          customerId: customer._id,
          trainerId: trainer._id,
          orderId: order._id,
          customerName: "Amina Khan",
          rating: 5,
          review:
            "Clear guidance, thoughtful coaching, and a session that left me feeling confident.",
          trainingGoal: "Strength Training",
        });
      }
    }
    await m.Payout.create({
      trainerId: trainer._id,
      amount: 10000,
      status: "PAID",
      reference: "BANK-TRANSFER-REFERENCE-2026-123456789",
      idempotencyKey: "audit-payout",
    });
    const conversation = await m.Conversation.create({
      customerId: customer._id,
      trainerId: trainer._id,
      trainerUserId: user._id,
      lastMessageAt: new Date(),
    });
    await m.Message.create({
      conversationId: conversation._id,
      senderId: user._id,
      text: "Welcome, Amina! Bring water and a comfortable mat. We’ll start with your goals and build a plan together.",
      idempotencyKey: "audit-message",
    });
    for (const account of [user, customer])
      await m.Notification.create({
        userId: account._id,
        title: "Your next session is ready",
        body: "Your training session is confirmed. Check your schedule for the details.",
        href:
          account.role === "TRAINER"
            ? "/trainer/schedule"
            : "/dashboard/customer/bookings",
      });
  }
  await m.Taxonomy.create({
    kind: "CATEGORY",
    name: "Strength Training",
    slug: "strength-training",
    active: true,
  });
  await m.Taxonomy.create({
    kind: "SPECIALTY",
    name: "Mobility",
    slug: "mobility",
    active: true,
  });
  await m.Taxonomy.create({
    kind: "FAQ",
    name: "How do online sessions work?",
    slug: "online-sessions",
    body: "Join your private session link from your dashboard at the booked time.",
  });
  await m.SupportRequest.create({
    name: "Amina Khan",
    email: customer.normalizedEmail,
    subject: "Help rescheduling my session",
    message: "I would like help choosing another time for my upcoming booking.",
    userId: customer._id,
  });
}
