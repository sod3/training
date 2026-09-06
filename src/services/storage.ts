import { randomUUID } from "node:crypto";
import sharp from "sharp";
import {
  AuditLog,
  TrainerCredential,
  TrainerProfile,
  Upload,
  User,
} from "@/models";
import { assert } from "@/lib/server/errors";
import { type Actor } from "@/lib/server/security";
import { objectId } from "@/lib/server/validation";

export async function uploadFile(actor: Actor, form: FormData) {
  const file = form.get("file");
  const purpose = form.get("purpose");
  assert(
    file instanceof File &&
      ["PUBLIC", "PRIVATE", "PAYMENT_PROOF"].includes(String(purpose)),
    "Choose a file and purpose",
  );
  assert(
    purpose === "PUBLIC" ||
      (purpose === "PRIVATE" && actor.role === "TRAINER") ||
      (purpose === "PAYMENT_PROOF" && actor.role === "CUSTOMER"),
    "You cannot upload that file type",
    403,
  );
  assert(
    file.size > 0 && file.size <= 4 * 1024 * 1024,
    "Maximum file size is 4 MB",
  );
  let body = Buffer.from(await file.arrayBuffer());
  let mime = file.type;
  const pdf =
    mime === "application/pdf" &&
    /\.pdf$/i.test(file.name) &&
    body.subarray(0, 5).toString() === "%PDF-";
  if (pdf) {
    assert(purpose === "PRIVATE", "PDF documents must be private");
  } else {
    assert(
      ["image/jpeg", "image/png", "image/webp"].includes(mime) &&
        /\.(jpe?g|png|webp)$/i.test(file.name),
      "Use JPG, PNG, WebP, or a private PDF",
    );
    const img = sharp(body, { limitInputPixels: 24000000 });
    const meta = await img.metadata();
    assert(
      meta.width && meta.height && meta.width >= 100 && meta.height >= 100,
      "Image must be at least 100 × 100 pixels",
    );
    body = await img
      .rotate()
      .resize({
        width: 2000,
        height: 2000,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 85 })
      .toBuffer();
    mime = "image/webp";
  }
  const key = `${String(purpose).toLowerCase()}/${actor.id}/${randomUUID()}.${pdf ? "pdf" : "webp"}`;
  // Spotter stores new uploads directly in MongoDB. This keeps public media,
  // trainer verification evidence and payment proof on the same protected
  // database-backed path requested for this deployment.
  const upload = await Upload.create({
    userId: actor.id,
    key,
    mime,
    size: body.length,
    data: body,
    purpose: String(purpose),
  });
  return {
    id: String(upload._id),
    url: purpose === "PUBLIC" ? `/api/media/${upload._id}` : undefined,
  };
}
export async function attachPublic(
  actor: Actor,
  data: { uploadId: string; field: "avatar" | "profileImage" | "coverImage" },
) {
  objectId.parse(data.uploadId);
  const upload = await Upload.findOne({
    _id: data.uploadId,
    userId: actor.id,
    purpose: "PUBLIC",
  });
  assert(upload, "Upload not found", 404);
  const url = `/api/media/${upload._id}`;
  if (data.field === "avatar") {
    await User.updateOne({ _id: actor.id }, { $set: { avatar: url } });
    // Trainers use their account photo as the public profile photo unless
    // they have uploaded a dedicated trainer image. Keep both surfaces in
    // sync so the account upload is not unexpectedly invisible publicly.
    if (actor.role === "TRAINER")
      await TrainerProfile.updateOne(
        { userId: actor.id, profileImage: { $in: [null, ""] } },
        { $set: { profileImage: url } },
      );
  } else {
    assert(actor.role === "TRAINER", "Trainer access required", 403);
    const result = await TrainerProfile.updateOne(
      { userId: actor.id },
      { $set: { [data.field]: url } },
    );
    assert(result.matchedCount === 1, "Trainer profile not found", 404);
  }
  upload.status = "ATTACHED";
  await upload.save();
  return { url };
}
export async function mediaResponse(id: string, actor: Actor | null) {
  objectId.parse(id);
  const upload = await Upload.findById(id);
  assert(upload, "File not found", 404);
  if (upload.purpose !== "PUBLIC") {
    assert(
      actor && (String(upload.userId) === actor.id || actor.role === "ADMIN"),
      "File not found",
      404,
    );
    if (actor.role === "ADMIN") {
      assert(
        upload.purpose === "PAYMENT_PROOF" ||
          (await TrainerCredential.exists({ uploadId: id })) ||
          (await TrainerProfile.exists({ cnicUploadId: id })),
        "File not found",
        404,
      );
      await AuditLog.create({
        actorId: actor.id,
        actorRole: actor.role,
        action: "VIEW_PRIVATE_DOCUMENT",
        entityType: "Upload",
        entityId: id,
      });
    }
  } else {
    assert(
      upload.status === "ATTACHED" || actor?.id === String(upload.userId),
      "File not found",
      404,
    );
  }
  assert(upload.data, "File data is unavailable", 410);
  return new Response(new Uint8Array(upload.data), {
    headers: {
      "Content-Type": upload.mime || "application/octet-stream",
      "Content-Disposition":
        upload.purpose === "PRIVATE" && upload.mime === "application/pdf"
          ? "attachment"
          : "inline",
      "Cache-Control":
        upload.purpose === "PUBLIC"
          ? "public, max-age=86400, immutable"
          : "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
export async function cleanUploads() {
  const result = await Upload.deleteMany({
    status: "READY",
    createdAt: { $lt: new Date(Date.now() - 86400000) },
  });
  return result.deletedCount ?? 0;
}
