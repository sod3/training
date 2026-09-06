import { randomUUID } from "node:crypto";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
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

function storage() {
  assert(
    process.env.S3_BUCKET &&
      process.env.S3_REGION &&
      process.env.S3_ACCESS_KEY_ID &&
      process.env.S3_SECRET_ACCESS_KEY,
    "File storage is not configured",
    503,
  );
  return new S3Client({
    region: process.env.S3_REGION,
    ...(process.env.S3_ENDPOINT ? { endpoint: process.env.S3_ENDPOINT } : {}),
    forcePathStyle: !!process.env.S3_ENDPOINT,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
    },
  });
}
function hasStorageConfig() {
  return Boolean(
    process.env.S3_BUCKET &&
      process.env.S3_REGION &&
      process.env.S3_ACCESS_KEY_ID &&
      process.env.S3_SECRET_ACCESS_KEY,
  );
}
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
      purpose === "PAYMENT_PROOF" ||
      actor.role === "TRAINER",
    "Only trainers upload verification documents",
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
  // Keep uploads functional on deployments without object storage. MongoDB is
  // already used for private documents and mediaResponse can serve the same
  // stored bytes for public and payment-proof uploads. When S3 is configured,
  // use it to keep binary data out of MongoDB.
  const client = hasStorageConfig() ? storage() : null;
  if (client)
    await client.send(
      new PutObjectCommand({
        Bucket: process.env.S3_BUCKET,
        Key: key,
        Body: body,
        ContentType: mime,
        ServerSideEncryption: "AES256",
      }),
    );
  try {
    const upload = await Upload.create({
      userId: actor.id,
      key,
      mime,
      size: body.length,
      data: client ? undefined : body,
      purpose: String(purpose),
    });
    return {
      id: String(upload._id),
      url: purpose === "PUBLIC" ? `/api/media/${upload._id}` : undefined,
    };
  } catch (error) {
    if (client)
      await client.send(
        new DeleteObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key }),
      );
    throw error;
  }
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
  if (data.field === "avatar")
    await User.updateOne({ _id: actor.id }, { $set: { avatar: url } });
  else {
    assert(actor.role === "TRAINER", "Trainer access required", 403);
    await TrainerProfile.updateOne(
      { userId: actor.id },
      { $set: { [data.field]: url } },
    );
  }
  upload.status = "ATTACHED";
  await upload.save();
  return { url };
}
export async function mediaUrl(id: string, actor: Actor | null) {
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
          (await TrainerCredential.exists({ uploadId: id })),
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
  } else
    assert(
      upload.status === "ATTACHED" || actor?.id === String(upload.userId),
      "File not found",
      404,
    );
  return getSignedUrl(
    storage(),
    new GetObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: upload.key,
      ResponseContentDisposition:
        upload.purpose !== "PUBLIC" ? "attachment" : "inline",
    }),
    { expiresIn: 60 },
  );
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
  if (upload.data)
    return new Response(new Uint8Array(upload.data), {
      headers: {
        "Content-Type": upload.mime || "application/octet-stream",
        "Content-Disposition":
          upload.purpose === "PRIVATE" ? "attachment" : "inline",
        "Cache-Control": "private, no-store",
      },
    });
  return Response.redirect(await mediaUrl(id, actor), 307);
}
export async function cleanUploads() {
  if (!process.env.S3_BUCKET) return 0;
  const abandoned = await Upload.find({
    status: "READY",
    createdAt: { $lt: new Date(Date.now() - 86400000) },
  }).limit(50);
  for (const file of abandoned) {
    await storage().send(
      new DeleteObjectCommand({ Bucket: process.env.S3_BUCKET, Key: file.key }),
    );
    await file.deleteOne();
  }
  return abandoned.length;
}
