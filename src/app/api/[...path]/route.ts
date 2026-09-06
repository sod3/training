import "server-only";
import { z } from "zod";
import { connectDB } from "@/lib/server/db";
import { assert, errorResponse } from "@/lib/server/errors";
import {
  checkOrigin,
  currentUser,
  logout,
  rateLimit,
  requestIp,
  requireUser,
} from "@/lib/server/security";
import { objectId } from "@/lib/server/validation";
import {
  Conversation,
  Favorite,
  Message,
  Notification,
  Session,
  Taxonomy,
  TrainerPackage,
} from "@/models";
import { authAction } from "@/services/auth";
import {
  cancelBooking,
  completeSession,
  createBooking,
  expireHolds,
  getAvailableSlots,
  ownedOrder,
  scheduleSession,
} from "@/services/bookings";
import {
  accountAction,
  contact,
  createConversation,
  createReview,
  favorite,
  ownConversation,
  sendMessage,
} from "@/services/community";
import {
  adminAction,
  dashboardData,
  requestPayout,
} from "@/services/dashboard";
import {
  processPaymentEvent,
  reconcilePayment,
  submitManualPayment,
} from "@/services/payments";
import {
  attachPublic,
  cleanUploads,
  mediaResponse,
  uploadFile,
} from "@/services/storage";
import { trainerAction } from "@/services/trainer-management";
import { getTrainerBySlug, listTrainers } from "@/services/trainers";
import { notifyUser } from "@/lib/server/email";
import { exportData } from "@/services/export";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
type Context = { params: Promise<{ path: string[] }> };
async function handle(request: Request, context: Context) {
  try {
    const { path } = await context.params;
    const [root, id, action] = path;
    assert(path.length <= 3, "Not found", 404);
    const params = Object.fromEntries(new URL(request.url).searchParams);
    const method = request.method;
    if (root === "auth" && id === "me" && method === "GET") {
      const user = await currentUser();
      if (!user) return json({ user: null, saved: [], unread: 0 });
      const conversations = await Conversation.find({
        $or: [{ customerId: user.id }, { trainerUserId: user.id }],
      })
        .select("_id")
        .lean();
      const [saved, unread, unreadMessages] = await Promise.all([
        Favorite.find({ customerId: user.id })
          .select("trainerId")
          .limit(500)
          .lean(),
        Notification.countDocuments({ userId: user.id, readAt: null }),
        Message.countDocuments({
          conversationId: { $in: conversations.map((c) => c._id) },
          senderId: { $ne: user.id },
          readAt: null,
        }),
      ]);
      return json({
        user,
        saved: saved.map((f) => String(f.trainerId)),
        unread,
        unreadMessages,
      });
    }
    if (root === "payment-methods" && method === "GET")
      return json({
        accountName: process.env.PAYMENT_ACCOUNT_NAME || "Spotter Training",
        jazzcash: process.env.JAZZCASH_ACCOUNT_NUMBER || "Add JazzCash number",
        easypaisa:
          process.env.EASYPAISA_ACCOUNT_NUMBER || "Add EasyPaisa number",
      });
    await connectDB();
    if (root === "jobs" && method === "GET") {
      assert(
        process.env.CRON_SECRET &&
          request.headers.get("authorization") ===
            `Bearer ${process.env.CRON_SECRET}`,
        "Unauthorized",
        401,
      );
      const expired = await expireHolds();
      const reminders = await Session.find({
        status: "CONFIRMED",
        reminderSentAt: null,
        start: { $gt: new Date(), $lte: new Date(Date.now() + 86400000) },
      }).limit(30);
      for (const session of reminders) {
        const updated = await Session.findOneAndUpdate(
          { _id: session._id, reminderSentAt: null },
          { $set: { reminderSentAt: new Date() } },
        );
        if (updated)
          await notifyUser(
            session.customerId,
            "Upcoming session",
            "Your next training session is within 24 hours.",
            "/dashboard/customer/bookings",
          );
      }
      const cleaned = await cleanUploads();
      return json({ expired, cleaned, emailDelivery: "disabled" });
    }
    if (root === "payments" && id === "webhook" && method === "POST") {
      const raw = await request.text();
      assert(raw.length <= 65536, "Request too large", 413);
      return json(
        await processPaymentEvent(
          raw,
          request.headers.get("x-sfpy-signature") || "",
        ),
      );
    }
    if (method === "GET") {
      if (root === "trainers" && !id) return json(await listTrainers(params));
      if (root === "trainers" && id && !action) {
        const trainer = await getTrainerBySlug(id);
        assert(trainer, "Trainer not found", 404);
        return json({ trainer });
      }
      if (root === "trainers" && id && action === "availability") {
        objectId.parse(id);
        const input = z
          .object({
            date: z.string(),
            packageId: objectId,
            type: z.enum(["home", "gym", "outdoor", "online"]),
          })
          .parse(params);
        const pkg = await TrainerPackage.findOne({
          _id: input.packageId,
          trainerId: id,
          active: true,
        }).lean();
        assert(pkg, "Package not found", 404);
        return json({
          slots: await getAvailableSlots(
            id,
            input.date,
            pkg.sessionDuration,
            input.type,
          ),
        });
      }
      if (root === "catalog")
        return json({
          items: await Taxonomy.find({ active: true })
            .sort({ sortOrder: 1 })
            .limit(300)
            .select("kind name slug city body")
            .lean(),
        });
      if (root === "media" && id) return mediaResponse(id, await currentUser());
      const user = await requireUser(
        root === "admin"
          ? ["ADMIN"]
          : root === "trainer"
            ? ["TRAINER"]
            : undefined,
      );
      if (root === "admin" && id === "export" && action)
        return exportData(user, action);
      if (root === "bookings" && id && action === "availability") {
        const order = await ownedOrder(user, id);
        return json({
          slots: await getAvailableSlots(
            String(order.trainerId),
            params.date,
            order.packageSnapshot.sessionDuration!,
            order.trainingType!,
            undefined,
            params.sessionId ? objectId.parse(params.sessionId) : undefined,
          ),
        });
      }
      if (root === "dashboard" || root === "admin" || root === "trainer")
        return json(await dashboardData(user, id || "overview", params));
      if (root === "bookings" && id) {
        const order = await ownedOrder(user, id);
        return json({
          order,
          sessions: await Session.find({ orderId: id })
            .sort({ start: 1 })
            .lean(),
        });
      }
      if (root === "messages" && id) {
        await ownConversation(user, id);
        const page = z.coerce
          .number()
          .int()
          .min(1)
          .max(1000)
          .parse(params.page || 1);
        return json({
          items: (
            await Message.find({ conversationId: id })
              .sort({ createdAt: -1 })
              .skip((page - 1) * 50)
              .limit(50)
              .lean()
          ).reverse(),
          page,
        });
      }
      assert(false, "Not found", 404);
    }
    checkOrigin(request);
    if (root === "uploads") {
      const user = await requireUser();
      await rateLimit(`upload:${user.id}`, 15, 60);
      return json(await uploadFile(user, await request.formData()));
    }
    const raw = await request.text();
    assert(raw.length <= 32768, "Request too large", 413);
    let data: unknown;
    try {
      data = raw ? JSON.parse(raw) : {};
    } catch {
      assert(false, "Invalid JSON");
    }
    if (root === "auth") {
      if (id === "logout") {
        await logout();
        return json({ message: "Signed out" });
      }
      return json(await authAction(id || "", data, request));
    }
    if (root === "contact") {
      await rateLimit(`contact:${requestIp(request)}`, 5, 60);
      return json(await contact(data, await currentUser()));
    }
    const user = await requireUser(
      root === "admin"
        ? ["ADMIN"]
        : root === "trainer"
          ? ["TRAINER"]
          : undefined,
    );
    await rateLimit(`write:${user.id}`, 150, 15);
    if (root === "admin")
      return json(await adminAction(user, id || "", action, data));
    if (root === "trainer") {
      if (id === "payouts") return json(await requestPayout(user, data));
      return json(await trainerAction(user, id || "", action, data, method));
    }
    if (root === "account")
      return json(await accountAction(user, id || "", data));
    if (root === "favorites") return json(await favorite(user, data));
    if (root === "reviews") return json(await createReview(user, data));
    if (root === "conversations")
      return json(await createConversation(user, data));
    if (root === "messages" && id) {
      await rateLimit(`message:${user.id}`, 30, 15);
      if (action === "read") {
        await ownConversation(user, id);
        await Message.updateMany(
          { conversationId: id, senderId: { $ne: user.id }, readAt: null },
          { $set: { readAt: new Date() } },
        );
        return json({ message: "Messages marked read" });
      }
      return json(await sendMessage(user, id, data));
    }
    if (root === "notifications") {
      await Notification.updateMany(
        {
          userId: user.id,
          ...(id ? { _id: objectId.parse(id) } : {}),
          readAt: null,
        },
        { $set: { readAt: new Date() } },
      );
      return json({ message: "Notifications marked read" });
    }
    if (root === "media") {
      const input = z
        .object({
          uploadId: objectId,
          field: z.enum(["avatar", "profileImage", "coverImage"]),
        })
        .strict()
        .parse(data);
      return json(await attachPublic(user, input));
    }
    if (root === "bookings") {
      if (!id) {
        await rateLimit(`checkout:${user.id}`, 10, 15);
        return json(await createBooking(user, data));
      }
      if (action === "cancel") return json(await cancelBooking(user, id, data));
      if (action === "schedule" || action === "reschedule")
        return json(await scheduleSession(user, id, data));
      if (action === "pay") {
        await rateLimit(`payment:${user.id}`, 10, 15);
        return json(await submitManualPayment(user, id, data));
      }
      if (action === "reconcile") {
        await rateLimit(`reconcile:${user.id}`, 15, 15);
        return json(await reconcilePayment(user, id));
      }
    }
    if (root === "sessions" && id)
      return json(await completeSession(user, id, data));
    assert(false, "Not found", 404);
  } catch (error) {
    return errorResponse(error);
  }
}
function json(data: unknown) {
  return Response.json(data, { headers: { "Cache-Control": "no-store" } });
}
export const GET = handle;
export const POST = handle;
export const PATCH = handle;
export const DELETE = handle;
