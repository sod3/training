import mongoose from "mongoose";
import { z } from "zod";
import {
  AuditLog,
  Session,
  TrainerApplication,
  TrainerAvailability,
  TrainerAvailabilityException,
  TrainerCredential,
  TrainerPackage,
  TrainerProfile,
  Upload,
  User,
} from "@/models";
import { assert } from "@/lib/server/errors";
import { connectDB } from "@/lib/server/db";
import { databaseOperation } from "@/lib/server/diagnostics";
import { availabilityConflict } from "@/lib/server/rules";
import { notifyUser } from "@/lib/server/email";
import { type Actor } from "@/lib/server/security";
import {
  availabilitySchema,
  exceptionSchema,
  objectId,
  packageSchema,
  profileSchema,
  timezone,
} from "@/lib/server/validation";
import { lockTrainer, settings } from "./bookings";

// Mongoose forwards these options to the driver's withTransaction(). Bound its
// retry budget below the route's 60-second Vercel limit so failures can be logged.
const availabilityTransactionOptions = {
  readConcern: { level: "snapshot" as const },
  writeConcern: { w: "majority" as const },
  timeoutMS: 25000,
};

export async function ownTrainer(actor: Actor) {
  assert(actor.role === "TRAINER", "Trainer access required", 403);
  objectId.parse(actor.id);
  await connectDB();
  const trainer = await databaseOperation("TrainerProfile.findOne(owner)", () =>
    TrainerProfile.findOne({ userId: actor.id }),
  );
  assert(trainer, "Trainer profile not found", 404);
  return trainer;
}
export async function trainerAction(
  actor: Actor,
  resource: string,
  id: string | undefined,
  data: unknown,
  method: string,
) {
  const trainer = await ownTrainer(actor);
  if (resource === "verification") {
    const input = z
      .object({
        name: z.string().trim().min(2).max(170),
        phone: z.string().trim().min(7).max(30),
        cnic: z
          .string()
          .trim()
          .regex(/^\d{5}-\d{7}-\d$/, "Use CNIC format 12345-1234567-1"),
        uploadId: objectId,
      })
      .strict()
      .parse(data);
    return mongoose.connection.transaction(async (session) => {
      const upload = await Upload.findOne({
        _id: input.uploadId,
        userId: actor.id,
        purpose: "PRIVATE",
        status: "READY",
      }).session(session);
      assert(upload, "Upload your CNIC picture first");
      const user = await User.findById(actor.id).session(session);
      assert(user, "Trainer account not found", 404);
      const current = await lockTrainer(trainer._id, session);
      current.displayName = input.name;
      current.phone = input.phone;
      current.cnic = input.cnic;
      current.cnicUploadId = upload._id;
      current.identityVerificationStatus = "PENDING";
      current.applicationStatus = "SUBMITTED";
      current.profileVisibility = "PRIVATE";
      await current.save({ session });
      user.name = input.name;
      user.phone = input.phone;
      await user.save({ session });
      upload.status = "ATTACHED";
      await upload.save({ session });
      await TrainerApplication.updateOne(
        { trainerId: current._id },
        { $set: { status: "SUBMITTED", submittedAt: new Date(), step: 1 } },
        { session },
      );
      return { message: "Verification details submitted" };
    });
  }
  if (resource === "profile") {
    const input = profileSchema.parse(data);
    return mongoose.connection.transaction(async (session) => {
      const current = await lockTrainer(trainer._id, session);
      if (
        current.displayName !== input.displayName &&
        current.applicationStatus === "APPROVED"
      ) {
        current.identityVerificationStatus = "PENDING";
        current.applicationStatus = "ACTION_REQUIRED";
        current.profileVisibility = "PRIVATE";
        await TrainerApplication.updateOne(
          { trainerId: current._id },
          {
            $set: {
              status: "ACTION_REQUIRED",
              adminNotes:
                "Your display name changed. Resubmit identity documents for review.",
            },
          },
          { session },
        );
      }
      if (input.timezone !== current.timezone)
        assert(
          !(await Session.exists({
            trainerId: current._id,
            status: { $in: ["HELD", "CONFIRMED"] },
            end: { $gt: new Date() },
          }).session(session)),
          "Timezone cannot change while upcoming reservations exist",
        );
      current.set(input);
      await current.save({ session });
      await TrainerAvailability.updateMany(
        { trainerId: current._id },
        { $set: { timezone: input.timezone } },
        { session },
      );
      return { message: "Profile saved" };
    });
  }
  if (resource === "packages") {
    const input = packageSchema.parse(data);
    if (id) {
      objectId.parse(id);
      assert(
        await TrainerPackage.findOneAndUpdate(
          { _id: id, trainerId: trainer._id },
          { $set: input },
          { runValidators: true },
        ),
        "Package not found",
        404,
      );
    } else {
      assert(
        (await TrainerPackage.countDocuments({ trainerId: trainer._id })) < 30,
        "Maximum 30 packages",
      );
      await TrainerPackage.create({ ...input, trainerId: trainer._id });
    }
    return { message: "Package saved" };
  }
  if (resource === "availability") {
    assert(!id, "Not found", 404);
    assert(
      method === "POST" || method === "PATCH",
      "Use POST or PATCH to replace the weekly schedule",
      405,
    );
    const input = availabilitySchema.parse(data);
    const selectedTrainingTypes = [
      ...new Set(input.rules.flatMap((rule) => rule.trainingTypes)),
    ];
    const conflict = availabilityConflict(input.rules);
    assert(
      !conflict,
      `Time windows ${conflict?.join(" and ")} overlap. Combine them or adjust their times.`,
      409,
    );
    return databaseOperation("TrainerAvailability.transaction", () =>
      mongoose.connection.transaction(async (session) => {
        const current = await databaseOperation(
          "TrainerProfile.lock(availability)",
          () => lockTrainer(trainer._id, session),
        );
        // The zone is server-owned; invalid stored profile data is a server error.
        if (!timezone.safeParse(current.timezone).success)
          throw new Error(
            "TrainerProfile.timezone is not a valid IANA timezone",
          );
        // Existing sessions remain explicit reservations. Removing a rule never cancels them.
        await databaseOperation("TrainerAvailability.deleteMany(replace)", () =>
          TrainerAvailability.deleteMany(
            { trainerId: trainer._id },
            { session },
          ),
        );
        if (input.rules.length)
          await databaseOperation(
            "TrainerAvailability.create(weekly rules)",
            () =>
              TrainerAvailability.create(
                input.rules.map((r) => ({
                  ...r,
                  trainerId: current._id,
                  timezone: current.timezone,
                })),
                // Mongoose 9 rejects multi-document create with a session unless
                // writes are explicitly ordered. Keep all rows in this transaction.
                { session, ordered: true },
              ),
          );
        // Update only review metadata, without revalidating unrelated legacy profile fields.
        await databaseOperation(
          "TrainerProfile.updateOne(availability review)",
          () =>
            TrainerProfile.updateOne(
              { _id: current._id },
              {
                $set: {
                  availabilityReviewStatus: "APPROVED",
                  availabilityReviewNotes: "",
                },
                ...(selectedTrainingTypes.length
                  ? {
                      $addToSet: {
                        trainingTypes: { $each: selectedTrainingTypes },
                      },
                    }
                  : {}),
                $unset: {
                  availabilityReviewedBy: 1,
                  availabilityReviewedAt: 1,
                },
              },
              { session, runValidators: true },
            ),
        );
        return {
          message:
            "Availability saved and active immediately. Existing reservations remain scheduled.",
        };
      }, availabilityTransactionOptions),
    );
  }
  if (resource === "exceptions") {
    if (method === "DELETE" && id) {
      objectId.parse(id);
      await mongoose.connection.transaction(async (session) => {
        await lockTrainer(trainer._id, session);
        await TrainerAvailabilityException.deleteOne(
          { _id: id, trainerId: trainer._id },
          { session },
        );
      });
      return { message: "Exception removed" };
    }
    const input = exceptionSchema.parse(data);
    return mongoose.connection.transaction(async (session) => {
      await lockTrainer(trainer._id, session);
      if (input.kind === "BLOCK")
        assert(
          !(await Session.exists({
            trainerId: trainer._id,
            status: { $in: ["CONFIRMED", "HELD"] },
            start: { $lt: new Date(input.end) },
            end: { $gt: new Date(input.start) },
          }).session(session)),
          "This period contains reservations. Resolve those bookings before blocking it.",
          409,
        );
      await TrainerAvailabilityException.create(
        [{ ...input, trainerId: trainer._id }],
        { session },
      );
      return { message: "Exception saved" };
    });
  }
  if (resource === "credentials") {
    const input = z
      .object({
        uploadId: objectId,
        type: z.enum(["IDENTITY", "CERTIFICATION"]),
        title: z.string().min(2).max(200),
        issuingOrganization: z.string().max(200),
        credentialNumber: z.string().max(200).optional(),
        expiryDate: z.string().date().optional(),
      })
      .strict()
      .parse(data);
    return mongoose.connection.transaction(async (session) => {
      await lockTrainer(trainer._id, session);
      const upload = await Upload.findOne({
        _id: input.uploadId,
        userId: actor.id,
        purpose: "PRIVATE",
        status: "READY",
      }).session(session);
      assert(upload, "Document is not available");
      assert(
        (await TrainerCredential.countDocuments({
          trainerId: trainer._id,
        }).session(session)) < 40,
        "Credential limit reached",
      );
      await TrainerCredential.create([{ ...input, trainerId: trainer._id }], {
        session,
      });
      upload.status = "ATTACHED";
      await upload.save({ session });
      return { message: "Credential submitted for review" };
    });
  }
  if (resource === "application") {
    const input = z
      .object({
        step: z.number().int().min(0).max(9),
        submit: z.boolean().default(false),
      })
      .strict()
      .parse(data);
    return mongoose.connection.transaction(async (session) => {
      const current = await lockTrainer(trainer._id, session);
      assert(
        ["DRAFT", "ACTION_REQUIRED", "REJECTED"].includes(
          current.applicationStatus,
        ),
        "Application is already under review or approved",
        409,
      );
      if (input.submit) {
        assert(
          (await settings(session)).trainerApplicationEnabled,
          "Applications are currently closed",
        );
        assert(
          current.biography.length >= 50 &&
            current.headline &&
            current.specialties.length &&
            current.serviceAreas.length &&
            current.trainingTypes.length &&
            current.city,
          "Complete your professional profile first",
        );
        assert(
          await TrainerPackage.exists({
            trainerId: current._id,
            active: true,
          }).session(session),
          "Add at least one package",
        );
        assert(
          await TrainerAvailability.exists({
            trainerId: current._id,
            active: true,
          }).session(session),
          "Set your availability",
        );
        for (const type of ["IDENTITY", "CERTIFICATION"])
          assert(
            await TrainerCredential.exists({
              trainerId: current._id,
              type,
              verificationStatus: { $in: ["PENDING", "APPROVED"] },
            }).session(session),
            `Upload ${type.toLowerCase()} documents`,
          );
        current.applicationStatus = "SUBMITTED";
        await current.save({ session });
        await notifyUser(
          actor.id,
          "Application received",
          "Your trainer application is ready for our review team.",
          "/trainer/verification",
          session,
        );
        const admins = await User.find({ role: "ADMIN", status: "ACTIVE" })
          .select("_id")
          .session(session);
        for (const admin of admins)
          await notifyUser(
            admin._id,
            "Trainer application submitted",
            current.displayName,
            "/admin/applications",
            session,
          );
      }
      await TrainerApplication.updateOne(
        { trainerId: trainer._id },
        {
          $set: {
            step: input.step,
            ...(input.submit
              ? { status: "SUBMITTED", submittedAt: new Date() }
              : {}),
          },
        },
        { session },
      );
      return {
        message: input.submit ? "Application submitted" : "Progress saved",
      };
    });
  }
  assert(false, "Not found", 404);
}
export async function reviewApplication(
  actor: Actor,
  id: string,
  data: unknown,
) {
  assert(actor.role === "ADMIN", "Admin access required", 403);
  objectId.parse(id);
  const input = z
    .object({
      status: z.enum([
        "UNDER_REVIEW",
        "ACTION_REQUIRED",
        "APPROVED",
        "REJECTED",
      ]),
      notes: z.string().max(3000),
    })
    .strict()
    .parse(data);
  if (["ACTION_REQUIRED", "REJECTED"].includes(input.status))
    assert(input.notes.trim().length >= 10, "Provide an actionable reason");
  return mongoose.connection.transaction(async (session) => {
    const application = await TrainerApplication.findById(id).session(session);
    assert(application, "Application not found", 404);
    const trainer = await lockTrainer(application.trainerId, session);
    assert(
      application.status !== "DRAFT",
      "Application must first be submitted",
    );
    if (input.status === "APPROVED") {
      for (const type of ["IDENTITY", "CERTIFICATION"])
        assert(
          await TrainerCredential.exists({
            trainerId: trainer._id,
            type,
            verificationStatus: "APPROVED",
            $or: [{ expiryDate: null }, { expiryDate: { $gt: new Date() } }],
          }).session(session),
          `Approve valid ${type.toLowerCase()} evidence first`,
        );
      assert(
        await User.exists({
          _id: trainer.userId,
          status: "ACTIVE",
        }).session(session),
        "Trainer account must be active",
      );
      trainer.identityVerificationStatus = "APPROVED";
      trainer.credentialVerificationStatus = "APPROVED";
    }
    const before = application.status;
    application.status = input.status;
    application.adminNotes = input.notes;
    application.reviewedAt = new Date();
    application.reviewedBy = new mongoose.Types.ObjectId(actor.id);
    trainer.applicationStatus = input.status;
    trainer.profileVisibility =
      input.status === "APPROVED" ? "PUBLIC" : "PRIVATE";
    await application.save({ session });
    await trainer.save({ session });
    await AuditLog.create(
      [
        {
          actorId: actor.id,
          actorRole: actor.role,
          action: "REVIEW_APPLICATION",
          entityType: "TrainerApplication",
          entityId: id,
          previousValues: { status: before },
          newValues: input,
        },
      ],
      { session },
    );
    await notifyUser(
      trainer.userId,
      `Trainer application: ${input.status.toLowerCase().replaceAll("_", " ")}`,
      input.notes || "Your profile is ready to welcome clients.",
      "/trainer/verification",
      session,
    );
    return { message: "Application reviewed" };
  });
}
