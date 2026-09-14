import nodemailer from "nodemailer";
import type { ClientSession } from "mongoose";
import mongoose from "mongoose";
import { EmailLog, Notification, TrainerProfile, User } from "@/models";

import { connectDB } from "./db";

// Helper to escape HTML special characters for template security
export function escapeHtml(str: string): string {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getBaseUrl(): string {
  const url =
    process.env.APP_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3000";
  return url.replace(/\/$/, "");
}

function getTransporter() {
  const smtpHost = process.env.SMTP_HOST?.trim();
  const smtpPort = process.env.SMTP_PORT
    ? parseInt(process.env.SMTP_PORT, 10)
    : 587;
  const smtpUser = process.env.SMTP_USER?.trim();
  const smtpPass = process.env.SMTP_PASS?.trim();
  const smtpSecure = process.env.SMTP_SECURE === "true" || smtpPort === 465;

  if (smtpHost && smtpUser && smtpPass) {
    return nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });
  }

  const gmailUser = process.env.GMAIL_USER?.trim();
  const gmailAppPassword = process.env.GMAIL_APP_PASSWORD?.trim();

  if (gmailUser && gmailAppPassword) {
    return nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: gmailUser,
        pass: gmailAppPassword,
      },
    });
  }

  return null;
}

function getFromAddress(): string {
  const fromEmail =
    process.env.SMTP_FROM?.trim() ||
    process.env.EMAIL_FROM?.trim() ||
    process.env.GMAIL_USER?.trim() ||
    "noreply@spotter.com";
  return `"SPOTTER" <${fromEmail}>`;
}

function getReplyToAddress(): string {
  return (
    process.env.SMTP_REPLY_TO?.trim() ||
    process.env.SUPPORT_EMAIL?.trim() ||
    process.env.GMAIL_USER?.trim() ||
    "support@spotter.com"
  );
}

export interface SendEmailOptions {
  to?: string;
  userId?: string | mongoose.Types.ObjectId;
  subject: string;
  html: string;
  text?: string;
  event: string;
  idempotencyKey?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Core production email dispatcher.
 * Resolves recipient email from database if userId is provided.
 * Checks for duplicate sends using idempotencyKey against EmailLog.
 * Logs execution status (SENT / FAILED / SKIPPED) and errors into EmailLog DB collection.
 * Never throws exceptions to ensure calling business operations remain uninterrupted.
 */
export async function sendEmail({
  to,
  userId,
  subject,
  html,
  text,
  event,
  idempotencyKey,
  metadata,
}: SendEmailOptions): Promise<boolean> {
  let recipient = to?.trim().toLowerCase();

  try {
    await connectDB();

    // If 'to' is not specified, resolve from User model
    if (!recipient && userId) {
      const user = await User.findById(userId).select("normalizedEmail").lean();
      if (user?.normalizedEmail) {
        recipient = user.normalizedEmail.trim().toLowerCase();
      }
    }

    if (!recipient) {
      console.warn(`[Email] Skipped sending '${event}': No valid recipient email address found for userId=${userId}.`);
      await EmailLog.create({
        recipient: recipient || "unknown@unresolved.local",
        userId: userId ? new mongoose.Types.ObjectId(userId) : undefined,
        event,
        subject,
        status: "FAILED",
        error: "No valid recipient email address found",
        idempotencyKey,
        metadata,
      }).catch(() => {});
      return false;
    }

    // Idempotency check: prevent duplicate email dispatches
    if (idempotencyKey) {
      const existingSent = await EmailLog.findOne({
        idempotencyKey,
        status: "SENT",
      }).lean();
      if (existingSent) {
        console.log(`[Email] Skipped duplicate send for key=${idempotencyKey} (event=${event})`);
        await EmailLog.create({
          recipient,
          userId: userId ? new mongoose.Types.ObjectId(userId) : undefined,
          event,
          subject,
          status: "SKIPPED",
          idempotencyKey,
          metadata,
        }).catch(() => {});
        return true;
      }
    }

    const transporter = getTransporter();
    if (!transporter) {
      const warnMsg = `[Email] Delivery skipped for ${recipient} (${event}): SMTP/Gmail credentials are not configured.`;
      console.warn(warnMsg);
      await EmailLog.create({
        recipient,
        userId: userId ? new mongoose.Types.ObjectId(userId) : undefined,
        event,
        subject,
        status: "FAILED",
        error: "SMTP/Gmail credentials not configured",
        idempotencyKey,
        metadata,
      }).catch(() => {});
      return false;
    }

    const textContent = text || html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

    const info = await transporter.sendMail({
      from: getFromAddress(),
      replyTo: getReplyToAddress(),
      to: recipient,
      subject,
      text: textContent,
      html,
    });

    console.log(`[Email] Successfully sent '${event}' to ${recipient} (Message ID: ${info.messageId})`);

    await EmailLog.create({
      recipient,
      userId: userId ? new mongoose.Types.ObjectId(userId) : undefined,
      event,
      subject,
      status: "SENT",
      messageId: info.messageId,
      idempotencyKey,
      metadata,
    }).catch((err) => console.error("[EmailLog DB Error]", err));

    return true;
  } catch (error: any) {
    const errorMsg = error?.message || String(error);
    console.error(`[Email Error] Failed to send '${event}' to ${recipient || userId}:`, error);

    if (recipient) {
      await EmailLog.create({
        recipient,
        userId: userId ? new mongoose.Types.ObjectId(userId) : undefined,
        event,
        subject,
        status: "FAILED",
        error: errorMsg,
        idempotencyKey,
        metadata,
      }).catch(() => {});
    }

    return false;
  }
}

/**
 * Standard SPOTTER Master HTML Layout Generator
 */
export function renderSpotterEmailHtml({
  headline,
  contentHtml,
  ctaText,
  ctaUrl,
  badgeText,
  badgeBg = "#0284c7",
  badgeColor = "#ffffff",
}: {
  headline: string;
  contentHtml: string;
  ctaText?: string;
  ctaUrl?: string;
  badgeText?: string;
  badgeBg?: string;
  badgeColor?: string;
}): string {
  const baseUrl = getBaseUrl();
  const ctaLink = ctaUrl ? (ctaUrl.startsWith("http") ? ctaUrl : `${baseUrl}${ctaUrl}`) : "";

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SPOTTER Notification</title>
</head>
<body style="margin:0; padding:0; background-color:#0f172a; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color:#f8fafc;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#0f172a; padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" border="0" cellspacing="0" cellpadding="0" style="background-color:#1e293b; border-radius:16px; border:1px solid #334155; overflow:hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 32px; text-align: center; border-bottom: 2px solid #38bdf8;">
              <h1 style="margin: 0; font-size: 28px; font-weight: 800; letter-spacing: 2px; color: #ffffff;">
                SPOTTER<span style="color: #38bdf8;">.</span>
              </h1>
              <p style="margin: 6px 0 0 0; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; color: #94a3b8;">
                Premium Live Online Fitness Coaching
              </p>
            </td>
          </tr>

          <!-- Main Content Body -->
          <tr>
            <td style="padding: 36px 32px;">
              ${
                badgeText
                  ? `
              <div style="margin-bottom: 20px;">
                <span style="background-color: ${badgeBg}; color: ${badgeColor}; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.2px; padding: 6px 14px; border-radius: 20px; display: inline-block;">
                  ${escapeHtml(badgeText)}
                </span>
              </div>
              `
                  : ""
              }

              <h2 style="margin: 0 0 18px 0; font-size: 22px; font-weight: 700; color: #f8fafc; line-height: 1.3;">
                ${headline}
              </h2>

              <div style="font-size: 15px; line-height: 1.6; color: #cbd5e1;">
                ${contentHtml}
              </div>

              ${
                ctaText && ctaLink
                  ? `
              <!-- CTA Button -->
              <table border="0" cellspacing="0" cellpadding="0" style="margin: 32px 0 16px 0;">
                <tr>
                  <td align="center" style="border-radius: 8px; background: linear-gradient(135deg, #0284c7 0%, #38bdf8 100%);">
                    <a href="${ctaLink}" target="_blank" style="font-size: 15px; font-weight: 700; color: #ffffff; text-decoration: none; padding: 14px 30px; display: inline-block; border-radius: 8px; box-shadow: 0 4px 14px rgba(56, 189, 248, 0.4);">
                      ${escapeHtml(ctaText)} &rarr;
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin: 16px 0 0 0; font-size: 12px; color: #64748b; line-height: 1.5;">
                Direct link: <a href="${ctaLink}" style="color: #38bdf8; text-decoration: underline;">${ctaLink}</a>
              </p>
              `
                  : ""
              }
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #0f172a; padding: 24px 32px; text-align: center; border-top: 1px solid #334155;">
              <p style="margin: 0 0 8px 0; font-size: 12px; color: #94a3b8;">
                Need assistance? Contact our support team directly from your account dashboard.
              </p>
              <p style="margin: 0; font-size: 11px; color: #64748b;">
                &copy; ${new Date().getFullYear()} SPOTTER Platform. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * In-app Notification trigger with automatic background email dispatch
 */
export async function notifyUser(
  userId: string | import("mongoose").Types.ObjectId,
  title: string,
  body: string,
  href: string,
  session?: ClientSession,
) {
  // 1. Create in-app notification document
  await Notification.create([{ userId, title, body, href }], { session });

  // 2. Dispatch background email notification (non-blocking so DB transaction isn't affected)
  sendEmailForNotification(userId, title, body, href).catch((err) => {
    console.error(`[NotifyUser Email Dispatch Error] user=${userId}:`, err);
  });
}

async function sendEmailForNotification(
  userId: string | import("mongoose").Types.ObjectId,
  title: string,
  body: string,
  href: string,
) {
  await connectDB();
  const user = await User.findById(userId).select("normalizedEmail name role").lean();
  if (!user || !user.normalizedEmail) return;

  const html = renderSpotterEmailHtml({
    headline: `Hello ${escapeHtml(user.name || "Member")},`,
    badgeText: title,
    badgeBg: "#0369a1",
    contentHtml: `
      <p style="margin: 0 0 16px 0;">${escapeHtml(body)}</p>
    `,
    ctaText: "View Details in Dashboard",
    ctaUrl: href,
  });

  await sendEmail({
    to: user.normalizedEmail,
    userId: user._id,
    subject: `SPOTTER: ${title}`,
    html,
    event: "IN_APP_NOTIFICATION_EMAIL",
    metadata: { title, href },
  });
}

/* ============================================================================
   SPECIFIC BRANDED LIFECYCLE EMAIL EVENT HANDLERS
   ============================================================================ */

export interface WelcomeEmailOptions {
  to: string;
  name: string;
  role?: "CUSTOMER" | "TRAINER" | string;
}

export async function sendWelcomeEmail({
  to,
  name,
  role,
}: WelcomeEmailOptions): Promise<boolean> {
  const roleLabel = role === "TRAINER" ? "Trainer" : "Member";
  const subject = "Welcome to SPOTTER – Your Account is Ready";

  const html = renderSpotterEmailHtml({
    headline: `Welcome to SPOTTER, ${escapeHtml(name)}! 👋`,
    badgeText: `${roleLabel} Account Created`,
    badgeBg: "#0284c7",
    contentHtml: `
      <p style="margin: 0 0 16px 0;">Your SPOTTER account has been successfully created and verified.</p>
      <p style="margin: 0 0 16px 0;">We are thrilled to welcome you as a <strong>${roleLabel}</strong> on SPOTTER. Whether you are scheduling live 1-on-1 coaching sessions or managing your training calendar, SPOTTER provides an elite live fitness experience.</p>
      <div style="background-color: #0f172a; border-radius: 8px; padding: 16px; border: 1px solid #334155; margin: 20px 0;">
        <p style="margin: 0; font-size: 14px; color: #38bdf8; font-weight: 600;">Next Steps:</p>
        <ul style="margin: 8px 0 0 0; padding-left: 20px; font-size: 14px; color: #cbd5e1;">
          ${
            role === "TRAINER"
              ? "<li>Complete your professional trainer profile and bio</li><li>Add your available coaching packages</li><li>Set up your weekly availability hours</li>"
              : "<li>Browse top verified coaches</li><li>Select a live session package</li><li>Book your initial 1-on-1 session</li>"
          }
        </ul>
      </div>
    `,
    ctaText: "Log In to Your Dashboard",
    ctaUrl: role === "TRAINER" ? "/trainer/onboarding" : "/login",
  });

  return sendEmail({
    to,
    subject,
    html,
    event: "WELCOME",
    idempotencyKey: `welcome:${to.toLowerCase()}`,
    metadata: { name, role },
  });
}

export async function sendBookingCreatedEmail(params: {
  customerId: string | mongoose.Types.ObjectId;
  trainerId: string | mongoose.Types.ObjectId;
  bookingNumber: string;
  packageName: string;
  sessionCount: number;
  total: number;
  currency?: string;
  sessionStart: string;
  timezone?: string;
  orderId: string;
}): Promise<void> {
  await connectDB();
  const customer = await User.findById(params.customerId).select("normalizedEmail name").lean();
  const trainerProfile = await TrainerProfile.findById(params.trainerId).select("userId displayName").lean();
  const trainerUser = trainerProfile ? await User.findById(trainerProfile.userId).select("normalizedEmail name").lean() : null;

  const formattedPrice = `${(params.total / 100).toLocaleString("en-PK")} ${params.currency || "PKR"}`;
  const formattedTime = new Date(params.sessionStart).toLocaleString("en-US", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: params.timezone || "Asia/Karachi",
  });

  // 1. Email Customer
  if (customer?.normalizedEmail) {
    const html = renderSpotterEmailHtml({
      headline: `Booking Reserved: ${escapeHtml(params.bookingNumber)}`,
      badgeText: "Pending Payment",
      badgeBg: "#f59e0b",
      badgeColor: "#0f172a",
      contentHtml: `
        <p style="margin: 0 0 16px 0;">Hi <strong>${escapeHtml(customer.name)}</strong>, your session reservation with <strong>${escapeHtml(trainerProfile?.displayName || "your coach")}</strong> has been created.</p>
        <table width="100%" border="0" cellspacing="0" cellpadding="10" style="background-color: #0f172a; border-radius: 8px; border: 1px solid #334155; margin: 20px 0; font-size: 14px;">
          <tr>
            <td style="color: #94a3b8; width: 35%;">Booking #:</td>
            <td style="color: #f8fafc; font-weight: 700;">${escapeHtml(params.bookingNumber)}</td>
          </tr>
          <tr>
            <td style="color: #94a3b8;">Package:</td>
            <td style="color: #f8fafc;">${escapeHtml(params.packageName)} (${params.sessionCount} session${params.sessionCount > 1 ? "s" : ""})</td>
          </tr>
          <tr>
            <td style="color: #94a3b8;">First Session:</td>
            <td style="color: #38bdf8; font-weight: 600;">${escapeHtml(formattedTime)}</td>
          </tr>
          <tr>
            <td style="color: #94a3b8;">Total Amount:</td>
            <td style="color: #f8fafc; font-weight: 700;">${formattedPrice}</td>
          </tr>
        </table>
        <p style="margin: 0 0 16px 0;">To confirm this reservation, please complete your payment via JazzCash, EasyPaisa, or Bank Transfer within your hold window and upload payment proof.</p>
      `,
      ctaText: "Complete Payment Now",
      ctaUrl: `/booking/payment?id=${params.orderId}`,
    });

    await sendEmail({
      to: customer.normalizedEmail,
      userId: customer._id,
      subject: `SPOTTER Booking Reserved (${params.bookingNumber})`,
      html,
      event: "BOOKING_CREATED_CUSTOMER",
      idempotencyKey: `booking_created_cust:${params.orderId}`,
      metadata: { bookingNumber: params.bookingNumber },
    });
  }

  // 2. Email Trainer
  if (trainerUser?.normalizedEmail) {
    const html = renderSpotterEmailHtml({
      headline: `New Session Reservation Received!`,
      badgeText: "New Reservation",
      badgeBg: "#0284c7",
      contentHtml: `
        <p style="margin: 0 0 16px 0;">Hi <strong>${escapeHtml(trainerProfile?.displayName || trainerUser.name)}</strong>, a client reserved a session package with you.</p>
        <table width="100%" border="0" cellspacing="0" cellpadding="10" style="background-color: #0f172a; border-radius: 8px; border: 1px solid #334155; margin: 20px 0; font-size: 14px;">
          <tr>
            <td style="color: #94a3b8; width: 35%;">Client Name:</td>
            <td style="color: #f8fafc; font-weight: 700;">${escapeHtml(customer?.name || "Customer")}</td>
          </tr>
          <tr>
            <td style="color: #94a3b8;">Booking #:</td>
            <td style="color: #f8fafc;">${escapeHtml(params.bookingNumber)}</td>
          </tr>
          <tr>
            <td style="color: #94a3b8;">Requested Time:</td>
            <td style="color: #38bdf8; font-weight: 600;">${escapeHtml(formattedTime)}</td>
          </tr>
        </table>
        <p style="margin: 0 0 16px 0;">This booking is currently reserved awaiting customer payment proof verification. We will notify you as soon as payment is verified!</p>
      `,
      ctaText: "View Trainer Dashboard",
      ctaUrl: "/dashboard/trainer/bookings",
    });

    await sendEmail({
      to: trainerUser.normalizedEmail,
      userId: trainerUser._id,
      subject: `SPOTTER: New Booking Reservation (${params.bookingNumber})`,
      html,
      event: "BOOKING_CREATED_TRAINER",
      idempotencyKey: `booking_created_trainer:${params.orderId}`,
      metadata: { bookingNumber: params.bookingNumber },
    });
  }
}

export async function sendPaymentSubmittedEmail(params: {
  customerId: string | mongoose.Types.ObjectId;
  bookingNumber: string;
  method: string;
  transactionId: string;
  orderId: string;
}): Promise<void> {
  await connectDB();
  const customer = await User.findById(params.customerId).select("normalizedEmail name").lean();
  if (!customer?.normalizedEmail) return;

  const html = renderSpotterEmailHtml({
    headline: `Payment Proof Received`,
    badgeText: "Awaiting Verification",
    badgeBg: "#f59e0b",
    badgeColor: "#0f172a",
    contentHtml: `
      <p style="margin: 0 0 16px 0;">Hi <strong>${escapeHtml(customer.name)}</strong>, thank you for submitting your payment proof.</p>
      <table width="100%" border="0" cellspacing="0" cellpadding="10" style="background-color: #0f172a; border-radius: 8px; border: 1px solid #334155; margin: 20px 0; font-size: 14px;">
        <tr>
          <td style="color: #94a3b8; width: 35%;">Booking #:</td>
          <td style="color: #f8fafc; font-weight: 700;">${escapeHtml(params.bookingNumber)}</td>
        </tr>
        <tr>
          <td style="color: #94a3b8;">Payment Method:</td>
          <td style="color: #f8fafc;">${escapeHtml(params.method)}</td>
        </tr>
        <tr>
          <td style="color: #94a3b8;">Transaction Reference:</td>
          <td style="color: #38bdf8; font-weight: 600;">${escapeHtml(params.transactionId)}</td>
        </tr>
      </table>
      <p style="margin: 0 0 16px 0;">Our admin verification team is checking your transaction proof. Your session slot remains securely reserved while we complete verification.</p>
    `,
    ctaText: "View Booking Status",
    ctaUrl: `/booking/success?id=${params.orderId}`,
  });

  await sendEmail({
    to: customer.normalizedEmail,
    userId: customer._id,
    subject: `SPOTTER Payment Proof Received (${params.bookingNumber})`,
    html,
    event: "PAYMENT_SUBMITTED_CUSTOMER",
    idempotencyKey: `payment_submitted:${params.orderId}:${params.transactionId}`,
    metadata: { bookingNumber: params.bookingNumber },
  });
}

export async function sendPaymentApprovedEmail(params: {
  customerId: string | mongoose.Types.ObjectId;
  trainerId: string | mongoose.Types.ObjectId;
  bookingNumber: string;
  packageName: string;
  orderId: string;
  notes?: string;
}): Promise<void> {
  await connectDB();
  const customer = await User.findById(params.customerId).select("normalizedEmail name").lean();
  const trainerProfile = await TrainerProfile.findById(params.trainerId).select("userId displayName").lean();
  const trainerUser = trainerProfile ? await User.findById(trainerProfile.userId).select("normalizedEmail name").lean() : null;

  // 1. Email Customer
  if (customer?.normalizedEmail) {
    const html = renderSpotterEmailHtml({
      headline: `Booking Confirmed! 🎉`,
      badgeText: "Confirmed & Active",
      badgeBg: "#22c55e",
      badgeColor: "#ffffff",
      contentHtml: `
        <p style="margin: 0 0 16px 0;">Hi <strong>${escapeHtml(customer.name)}</strong>, great news! Your payment for booking <strong>${escapeHtml(params.bookingNumber)}</strong> has been verified and approved.</p>
        <p style="margin: 0 0 16px 0;">Your live coaching sessions with <strong>${escapeHtml(trainerProfile?.displayName || "your coach")}</strong> are now officially confirmed.</p>
        ${params.notes ? `<p style="margin: 0 0 16px 0; color: #94a3b8;"><em>Admin note: ${escapeHtml(params.notes)}</em></p>` : ""}
        <div style="background-color: #0f172a; border-radius: 8px; padding: 16px; border: 1px solid #334155; margin: 20px 0; font-size: 14px;">
          <p style="margin: 0; font-weight: 600; color: #38bdf8;">Your Live Video Call Room is Ready!</p>
          <p style="margin: 6px 0 0 0; color: #cbd5e1;">A unique, private SPOTTER video room has been automatically created for your session. You can join directly from your dashboard or session page starting 15 minutes before your scheduled start time.</p>
        </div>
      `,
      ctaText: "Open Live Session Page",
      ctaUrl: `/session/${params.orderId}`,
    });

    await sendEmail({
      to: customer.normalizedEmail,
      userId: customer._id,
      subject: `SPOTTER Booking Confirmed! (${params.bookingNumber})`,
      html,
      event: "PAYMENT_APPROVED_CUSTOMER",
      idempotencyKey: `payment_approved_cust:${params.orderId}`,
      metadata: { bookingNumber: params.bookingNumber },
    });
  }

  // 2. Email Trainer
  if (trainerUser?.normalizedEmail) {
    const html = renderSpotterEmailHtml({
      headline: `Booking Payment Approved & Confirmed`,
      badgeText: "Confirmed Booking",
      badgeBg: "#22c55e",
      badgeColor: "#ffffff",
      contentHtml: `
        <p style="margin: 0 0 16px 0;">Hi <strong>${escapeHtml(trainerProfile?.displayName || trainerUser.name)}</strong>, the payment for booking <strong>${escapeHtml(params.bookingNumber)}</strong> by <strong>${escapeHtml(customer?.name || "Client")}</strong> has been approved.</p>
        <p style="margin: 0 0 16px 0;">A private SPOTTER video call room has been automatically created. You can enter as the host directly from your trainer dashboard 15 minutes prior to the session start time.</p>
      `,
      ctaText: "Open Session Page",
      ctaUrl: `/session/${params.orderId}`,
    });

    await sendEmail({
      to: trainerUser.normalizedEmail,
      userId: trainerUser._id,
      subject: `SPOTTER: Booking Confirmed (${params.bookingNumber})`,
      html,
      event: "PAYMENT_APPROVED_TRAINER",
      idempotencyKey: `payment_approved_trainer:${params.orderId}`,
      metadata: { bookingNumber: params.bookingNumber },
    });
  }
}

export async function sendSessionReminderEmail(params: {
  customerId: string | mongoose.Types.ObjectId;
  trainerId: string | mongoose.Types.ObjectId;
  bookingNumber: string;
  sessionStart: string;
  timezone?: string;
  orderId: string;
}): Promise<void> {
  await connectDB();
  const customer = await User.findById(params.customerId).select("normalizedEmail name").lean();
  const trainerProfile = await TrainerProfile.findById(params.trainerId).select("userId displayName").lean();
  const trainerUser = trainerProfile ? await User.findById(trainerProfile.userId).select("normalizedEmail name").lean() : null;

  const formattedTime = new Date(params.sessionStart).toLocaleString("en-US", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: params.timezone || "Asia/Karachi",
  });

  // 1. Email Customer
  if (customer?.normalizedEmail) {
    const html = renderSpotterEmailHtml({
      headline: `Reminder: Upcoming Coaching Session`,
      badgeText: "Session Reminder",
      badgeBg: "#0284c7",
      contentHtml: `
        <p style="margin: 0 0 16px 0;">Hi <strong>${escapeHtml(customer.name)}</strong>, your live coaching session with <strong>${escapeHtml(trainerProfile?.displayName || "your coach")}</strong> is starting soon!</p>
        <div style="background-color: #0f172a; border-radius: 8px; padding: 16px; border: 1px solid #334155; margin: 20px 0;">
          <p style="margin: 0; font-size: 15px; color: #38bdf8; font-weight: 700;">${escapeHtml(formattedTime)}</p>
        </div>
        <p style="margin: 0 0 16px 0;">Your live video calling room opens 15 minutes before session time. Please ensure your camera and microphone permissions are enabled.</p>
      `,
      ctaText: "Join Video Session",
      ctaUrl: `/session/${params.orderId}`,
    });

    await sendEmail({
      to: customer.normalizedEmail,
      userId: customer._id,
      subject: `SPOTTER Reminder: Upcoming Session (${params.bookingNumber})`,
      html,
      event: "SESSION_REMINDER_CUSTOMER",
      idempotencyKey: `session_reminder_cust:${params.orderId}:${new Date(params.sessionStart).getTime()}`,
      metadata: { bookingNumber: params.bookingNumber },
    });
  }

  // 2. Email Trainer
  if (trainerUser?.normalizedEmail) {
    const html = renderSpotterEmailHtml({
      headline: `Reminder: Upcoming Coaching Session`,
      badgeText: "Session Reminder",
      badgeBg: "#0284c7",
      contentHtml: `
        <p style="margin: 0 0 16px 0;">Hi <strong>${escapeHtml(trainerProfile?.displayName || trainerUser.name)}</strong>, your coaching session with <strong>${escapeHtml(customer?.name || "Client")}</strong> is scheduled soon!</p>
        <div style="background-color: #0f172a; border-radius: 8px; padding: 16px; border: 1px solid #334155; margin: 20px 0;">
          <p style="margin: 0; font-size: 15px; color: #38bdf8; font-weight: 700;">${escapeHtml(formattedTime)}</p>
        </div>
        <p style="margin: 0 0 16px 0;">You can join as host 15 minutes before the session starts.</p>
      `,
      ctaText: "Enter Video Room",
      ctaUrl: `/session/${params.orderId}`,
    });

    await sendEmail({
      to: trainerUser.normalizedEmail,
      userId: trainerUser._id,
      subject: `SPOTTER Reminder: Upcoming Coaching Session (${params.bookingNumber})`,
      html,
      event: "SESSION_REMINDER_TRAINER",
      idempotencyKey: `session_reminder_trainer:${params.orderId}:${new Date(params.sessionStart).getTime()}`,
      metadata: { bookingNumber: params.bookingNumber },
    });
  }
}


export async function sendPaymentRejectedEmail(params: {
  customerId: string | mongoose.Types.ObjectId;
  bookingNumber: string;
  reason: string;
  orderId: string;
}): Promise<void> {
  await connectDB();
  const customer = await User.findById(params.customerId).select("normalizedEmail name").lean();
  if (!customer?.normalizedEmail) return;

  const html = renderSpotterEmailHtml({
    headline: `Payment Proof Needs Attention`,
    badgeText: "Payment Rejected",
    badgeBg: "#ef4444",
    badgeColor: "#ffffff",
    contentHtml: `
      <p style="margin: 0 0 16px 0;">Hi <strong>${escapeHtml(customer.name)}</strong>, your payment submission for booking <strong>${escapeHtml(params.bookingNumber)}</strong> could not be verified.</p>
      <div style="background-color: #450a0a; border-radius: 8px; padding: 16px; border: 1px solid #991b1b; margin: 20px 0;">
        <p style="margin: 0 0 4px 0; font-size: 13px; font-weight: 700; color: #fca5a5; text-transform: uppercase;">Reason for Rejection:</p>
        <p style="margin: 0; font-size: 14px; color: #fef2f2;">${escapeHtml(params.reason)}</p>
      </div>
      <p style="margin: 0 0 16px 0;">Please re-verify your transfer reference and submit valid payment proof from your booking screen before your reservation expires.</p>
    `,
    ctaText: "Resubmit Payment Proof",
    ctaUrl: `/booking/success?id=${params.orderId}`,
  });

  await sendEmail({
    to: customer.normalizedEmail,
    userId: customer._id,
    subject: `SPOTTER Payment Proof Rejected (${params.bookingNumber})`,
    html,
    event: "PAYMENT_REJECTED_CUSTOMER",
    idempotencyKey: `payment_rejected:${params.orderId}:${Date.now()}`,
    metadata: { bookingNumber: params.bookingNumber, reason: params.reason },
  });
}

export async function sendBookingCancelledEmail(params: {
  customerId: string | mongoose.Types.ObjectId;
  trainerId: string | mongoose.Types.ObjectId;
  bookingNumber: string;
  reason: string;
  refundAmount?: number;
  orderId: string;
}): Promise<void> {
  await connectDB();
  const customer = await User.findById(params.customerId).select("normalizedEmail name").lean();
  const trainerProfile = await TrainerProfile.findById(params.trainerId).select("userId displayName").lean();
  const trainerUser = trainerProfile ? await User.findById(trainerProfile.userId).select("normalizedEmail name").lean() : null;

  const refundNotice = params.refundAmount && params.refundAmount > 0
    ? `An eligible refund of ${(params.refundAmount / 100).toLocaleString("en-PK")} PKR has been recorded for admin review.`
    : "";

  // 1. Email Customer
  if (customer?.normalizedEmail) {
    const html = renderSpotterEmailHtml({
      headline: `Booking Cancelled: ${escapeHtml(params.bookingNumber)}`,
      badgeText: "Cancelled",
      badgeBg: "#ef4444",
      contentHtml: `
        <p style="margin: 0 0 16px 0;">Hi <strong>${escapeHtml(customer.name)}</strong>, booking <strong>${escapeHtml(params.bookingNumber)}</strong> has been cancelled.</p>
        <p style="margin: 0 0 16px 0;"><strong>Reason:</strong> ${escapeHtml(params.reason)}</p>
        ${refundNotice ? `<p style="margin: 0 0 16px 0; color: #38bdf8;">${escapeHtml(refundNotice)}</p>` : ""}
      `,
      ctaText: "View Bookings Dashboard",
      ctaUrl: "/dashboard/customer/bookings",
    });

    await sendEmail({
      to: customer.normalizedEmail,
      userId: customer._id,
      subject: `SPOTTER Booking Cancelled (${params.bookingNumber})`,
      html,
      event: "BOOKING_CANCELLED_CUSTOMER",
      idempotencyKey: `booking_cancelled_cust:${params.orderId}`,
      metadata: { bookingNumber: params.bookingNumber },
    });
  }

  // 2. Email Trainer
  if (trainerUser?.normalizedEmail) {
    const html = renderSpotterEmailHtml({
      headline: `Booking Cancelled: ${escapeHtml(params.bookingNumber)}`,
      badgeText: "Cancelled",
      badgeBg: "#ef4444",
      contentHtml: `
        <p style="margin: 0 0 16px 0;">Hi <strong>${escapeHtml(trainerProfile?.displayName || trainerUser.name)}</strong>, booking <strong>${escapeHtml(params.bookingNumber)}</strong> has been cancelled.</p>
        <p style="margin: 0 0 16px 0;"><strong>Reason:</strong> ${escapeHtml(params.reason)}</p>
      `,
      ctaText: "Open Trainer Dashboard",
      ctaUrl: "/dashboard/trainer/bookings",
    });

    await sendEmail({
      to: trainerUser.normalizedEmail,
      userId: trainerUser._id,
      subject: `SPOTTER Notification: Booking Cancelled (${params.bookingNumber})`,
      html,
      event: "BOOKING_CANCELLED_TRAINER",
      idempotencyKey: `booking_cancelled_trainer:${params.orderId}`,
      metadata: { bookingNumber: params.bookingNumber },
    });
  }
}

export async function sendSessionRescheduledEmail(params: {
  customerId: string | mongoose.Types.ObjectId;
  trainerId: string | mongoose.Types.ObjectId;
  bookingNumber: string;
  newStart: string;
  timezone?: string;
  isNewSchedule?: boolean;
}): Promise<void> {
  await connectDB();
  const customer = await User.findById(params.customerId).select("normalizedEmail name").lean();
  const trainerProfile = await TrainerProfile.findById(params.trainerId).select("userId displayName").lean();
  const trainerUser = trainerProfile ? await User.findById(trainerProfile.userId).select("normalizedEmail name").lean() : null;

  const formattedTime = new Date(params.newStart).toLocaleString("en-US", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: params.timezone || "Asia/Karachi",
  });

  const eventTitle = params.isNewSchedule ? "Session Scheduled" : "Session Rescheduled";

  // Email Customer
  if (customer?.normalizedEmail) {
    const html = renderSpotterEmailHtml({
      headline: `${eventTitle} for ${escapeHtml(params.bookingNumber)}`,
      badgeText: eventTitle,
      badgeBg: "#0284c7",
      contentHtml: `
        <p style="margin: 0 0 16px 0;">Hi <strong>${escapeHtml(customer.name)}</strong>, your session date/time has been set:</p>
        <div style="background-color: #0f172a; border-radius: 8px; padding: 16px; border: 1px solid #334155; margin: 20px 0;">
          <p style="margin: 0; font-size: 15px; color: #38bdf8; font-weight: 700;">${escapeHtml(formattedTime)}</p>
        </div>
      `,
      ctaText: "View Schedule",
      ctaUrl: "/dashboard/customer/bookings",
    });

    await sendEmail({
      to: customer.normalizedEmail,
      userId: customer._id,
      subject: `SPOTTER: ${eventTitle} (${params.bookingNumber})`,
      html,
      event: "SESSION_RESCHEDULED_CUSTOMER",
      metadata: { bookingNumber: params.bookingNumber, newStart: params.newStart },
    });
  }

  // Email Trainer
  if (trainerUser?.normalizedEmail) {
    const html = renderSpotterEmailHtml({
      headline: `${eventTitle} for ${escapeHtml(params.bookingNumber)}`,
      badgeText: eventTitle,
      badgeBg: "#0284c7",
      contentHtml: `
        <p style="margin: 0 0 16px 0;">Hi <strong>${escapeHtml(trainerProfile?.displayName || trainerUser.name)}</strong>, a session time was scheduled by your client:</p>
        <div style="background-color: #0f172a; border-radius: 8px; padding: 16px; border: 1px solid #334155; margin: 20px 0;">
          <p style="margin: 0; font-size: 15px; color: #38bdf8; font-weight: 700;">${escapeHtml(formattedTime)}</p>
        </div>
      `,
      ctaText: "View Schedule",
      ctaUrl: "/dashboard/trainer/bookings",
    });

    await sendEmail({
      to: trainerUser.normalizedEmail,
      userId: trainerUser._id,
      subject: `SPOTTER: ${eventTitle} (${params.bookingNumber})`,
      html,
      event: "SESSION_RESCHEDULED_TRAINER",
      metadata: { bookingNumber: params.bookingNumber, newStart: params.newStart },
    });
  }
}

export async function sendTrainerStatusEmail(params: {
  trainerUserId: string | mongoose.Types.ObjectId;
  displayName: string;
  status: string;
  adminNotes?: string;
}): Promise<void> {
  await connectDB();
  const user = await User.findById(params.trainerUserId).select("normalizedEmail name").lean();
  if (!user?.normalizedEmail) return;

  const isApproved = params.status === "APPROVED";
  const badgeBg = isApproved ? "#22c55e" : params.status === "REJECTED" ? "#ef4444" : "#f59e0b";

  const html = renderSpotterEmailHtml({
    headline: isApproved ? "Application Approved – You are Live on SPOTTER! 🎉" : `Trainer Application Update: ${params.status.replace(/_/g, " ")}`,
    badgeText: `Application ${params.status.replace(/_/g, " ")}`,
    badgeBg,
    contentHtml: `
      <p style="margin: 0 0 16px 0;">Hi <strong>${escapeHtml(params.displayName || user.name)}</strong>,</p>
      ${
        isApproved
          ? `<p style="margin: 0 0 16px 0;">Congratulations! Your trainer application and credentials have been reviewed and approved. Your profile is now <strong>PUBLIC</strong> and visible to all SPOTTER clients!</p>`
          : `<p style="margin: 0 0 16px 0;">Your trainer application status has been updated to <strong>${escapeHtml(params.status.replace(/_/g, " "))}</strong>.</p>`
      }
      ${
        params.adminNotes
          ? `
        <div style="background-color: #0f172a; border-radius: 8px; padding: 16px; border: 1px solid #334155; margin: 20px 0;">
          <p style="margin: 0 0 4px 0; font-size: 13px; font-weight: 700; color: #38bdf8;">Feedback / Notes from Admin:</p>
          <p style="margin: 0; font-size: 14px; color: #cbd5e1;">${escapeHtml(params.adminNotes)}</p>
        </div>
        `
          : ""
      }
    `,
    ctaText: isApproved ? "View Live Profile" : "View Application Status",
    ctaUrl: isApproved ? "/trainer/profile" : "/trainer/verification",
  });

  await sendEmail({
    to: user.normalizedEmail,
    userId: user._id,
    subject: `SPOTTER Trainer Verification: ${params.status.replace(/_/g, " ")}`,
    html,
    event: "TRAINER_APPLICATION_STATUS",
    metadata: { status: params.status },
  });
}
