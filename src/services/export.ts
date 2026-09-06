import {
  AuditLog,
  Order,
  Payout,
  TrainerProfile,
  Transaction,
  User,
} from "@/models";
import { assert } from "@/lib/server/errors";
import { type Actor } from "@/lib/server/security";
const exports = {
  users: {
    model: User,
    fields: ["name", "normalizedEmail", "role", "status", "createdAt"],
  },
  trainers: {
    model: TrainerProfile,
    fields: [
      "displayName",
      "slug",
      "city",
      "applicationStatus",
      "profileVisibility",
      "createdAt",
    ],
  },
  bookings: {
    model: Order,
    fields: [
      "bookingNumber",
      "customerId",
      "trainerId",
      "total",
      "currency",
      "bookingStatus",
      "paymentStatus",
      "createdAt",
    ],
  },
  transactions: {
    model: Transaction,
    fields: [
      "orderId",
      "trainerId",
      "kind",
      "amount",
      "platformFee",
      "trainerAmount",
      "createdAt",
    ],
  },
  payouts: {
    model: Payout,
    fields: ["trainerId", "amount", "status", "reference", "createdAt"],
  },
};
export function csvCell(value: unknown) {
  let text = value instanceof Date ? value.toISOString() : String(value ?? "");
  if (/^[\s]*[=+@-]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}
export async function exportData(actor: Actor, resource: string) {
  assert(actor.role === "ADMIN", "Admin access required", 403);
  assert(resource in exports, "Export not found", 404);
  const { model, fields } = exports[resource as keyof typeof exports];
  await AuditLog.create({
    actorId: actor.id,
    actorRole: actor.role,
    action: "EXPORT_CSV",
    entityType: resource,
    entityId: "up-to-10000-records",
  });
  const cursor = model.collection
    .find({}, { projection: Object.fromEntries(fields.map((f) => [f, 1])) })
    .sort({ createdAt: -1 })
    .limit(10000);
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(
        encoder.encode(fields.map(csvCell).join(",") + "\r\n"),
      );
      try {
        for await (const row of cursor)
          controller.enqueue(
            encoder.encode(
              fields.map((f) => csvCell(row[f])).join(",") + "\r\n",
            ),
          );
        controller.close();
      } catch (error) {
        controller.error(error);
      } finally {
        await cursor.close();
      }
    },
    async cancel() {
      await cursor.close();
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="spotter-${resource}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
