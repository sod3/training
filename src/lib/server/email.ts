import nodemailer from "nodemailer";
import type { ClientSession } from "mongoose";
import { Notification } from "@/models";

export async function notifyUser(
  userId: string | import("mongoose").Types.ObjectId,
  title: string,
  body: string,
  href: string,
  session?: ClientSession,
) {
  await Notification.create([{ userId, title, body, href }], { session });
}

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
  const gmailUser = process.env.GMAIL_USER?.trim();
  const gmailAppPassword = process.env.GMAIL_APP_PASSWORD?.trim();

  if (!gmailUser || !gmailAppPassword) {
    console.warn(
      `[Email] Welcome email skipped for ${to}: GMAIL_USER or GMAIL_APP_PASSWORD is not configured.`,
    );
    return false;
  }

  const baseUrl =
    process.env.APP_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3000";
  const loginUrl = `${baseUrl.replace(/\/$/, "")}/login`;

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: gmailUser,
      pass: gmailAppPassword,
    },
  });

  const subject = "Your SPOTTER account has been successfully created.";
  const roleLabel = role === "TRAINER" ? "Trainer" : "Member";

  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
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
              <p style="margin: 6px 0 0 0; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.5px; color: #94a3b8;">
                Premium Live Online Training
              </p>
            </td>
          </tr>
          <!-- Body Content -->
          <tr>
            <td style="padding: 40px 32px;">
              <h2 style="margin: 0 0 16px 0; font-size: 22px; font-weight: 700; color: #f8fafc;">
                Welcome, ${escapeHtml(name)}! 👋
              </h2>
              <p style="margin: 0 0 20px 0; font-size: 16px; line-height: 1.6; color: #cbd5e1;">
                Your SPOTTER account has been successfully created.
              </p>
              <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 1.6; color: #94a3b8;">
                We are thrilled to welcome you as a ${roleLabel} on SPOTTER. Whether you are ready to book live 1-on-1 coaching sessions or manage your training schedule, SPOTTER provides everything you need for elite fitness progression.
              </p>
              <!-- Call to Action Button -->
              <table border="0" cellspacing="0" cellpadding="0" style="margin: 32px 0;">
                <tr>
                  <td align="center" style="border-radius: 8px; background: linear-gradient(135deg, #0284c7 0%, #38bdf8 100%);">
                    <a href="${loginUrl}" target="_blank" style="font-size: 16px; font-weight: 700; color: #ffffff; text-decoration: none; padding: 14px 32px; display: inline-block; border-radius: 8px; box-shadow: 0 4px 14px rgba(56, 189, 248, 0.4);">
                      Log In to Your Account &rarr;
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin: 24px 0 0 0; font-size: 13px; color: #64748b; line-height: 1.5;">
                If the button above does not work, copy and paste this link into your browser:<br>
                <a href="${loginUrl}" style="color: #38bdf8; text-decoration: underline;">${loginUrl}</a>
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color: #0f172a; padding: 24px 32px; text-align: center; border-top: 1px solid #334155;">
              <p style="margin: 0; font-size: 12px; color: #64748b;">
                &copy; ${new Date().getFullYear()} SPOTTER Training Platform. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  const textContent = `
Hi ${name},

Your SPOTTER account has been successfully created.

Welcome to SPOTTER! You can sign in to your account at any time using the link below:
${loginUrl}

Best regards,
The SPOTTER Team
  `.trim();

  try {
    const info = await transporter.sendMail({
      from: `"SPOTTER" <${gmailUser}>`,
      to,
      subject,
      text: textContent,
      html: htmlContent,
    });

    console.log(
      `[Email] Welcome email successfully sent to ${to} (Message ID: ${info.messageId})`,
    );
    return true;
  } catch (error) {
    console.error(
      `[Email Error] Failed to send welcome email to ${to}:`,
      error,
    );
    return false;
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
