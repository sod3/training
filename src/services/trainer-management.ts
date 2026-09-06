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
  Taxonomy,
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
import { DEFAULT_CATEGORIES, DEFAULT_LANGUAGES, DEFAULT_SPECIALTIES } from "@/lib/catalog";

// Mongoose forwards these options to the driver's withTransaction(). Bound its
// retry budget below the route's 60-second Vercel limit so failures can be logged.
const availabilityTransactionOptions = {
  writeConcern: { w: "majority" as const },
  timeoutMS: 25000,
};

async function assertMenuValues(category: string, specialties: string[], languages: string[], session: mongoose.ClientSession) {
  const [allCategories, allSpecialties] = await Promise.all([
    Taxonomy.find({ kind: "CATEGORY" }).select("name active").session(session).lean(),
    Taxonomy.find({ kind: "SPECIALTY" }).select("name active").session(session).lean(),
  ]);
  const activeCategories = allCategories.filter((value) => value.active).map((value) => value.name);
  const activeSpecialties = allSpecialties.filter((value) => value.active).map((value) => value.name);
  const categories = new Set(allCategories.length ? activeCategories : [...DEFAULT_CATEGORIES]);
  const specialtyMenu = new Set(allSpecialties.length ? activeSpecialties : [...DEFAULT_SPECIALTIES]);
  const languageMenu = new Set<string>(DEFAULT_LANGUAGES);
  assert(categories.has(category), "Choose a valid active training category");
  assert(specialties.length > 0 && specialties.every((value) => specialtyMenu.has(value)), "Choose specialties from the available menu");
  assert(languages.length > 0 && languages.every((value) => languageMenu.has(value as typeof DEFAULT_LANGUAGES[number])), "Choose languages from the available menu");
}

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
      const current = await lockTrainer(trainer._id, session);
      const upload = await Upload.findOne({
        _id: input.uploadId,
        userId: actor.id,
        purpose: "PRIVATE",
        status: { $in: ["READY", "ATTACHED"] },
      }).session(session);
      assert(upload, "Upload your CNIC picture first");
      assert(upload.status === "READY" || String(current.cnicUploadId || "") === String(upload._id), "This identity upload is already attached elsewhere", 409);
      const user = await User.findById(actor.id).session(session);
      assert(user, "Trainer account not found", 404);
      current.legalName = input.name;
      current.phone = input.phone;
      current.cnic = input.cnic;
      current.cnicUploadId = upload._id;
      current.identityVerificationStatus = "PENDING";
      const wasApproved = current.applicationStatus === "APPROVED";
      if (wasApproved) {
        current.applicationStatus = "ACTION_REQUIRED";
        current.profileVisibility = "PRIVATE";
      }
      await current.save({ session });
      const existingIdentity = await TrainerCredential.findOne({
        trainerId: current._id,
        type: "IDENTITY",
      }).session(session);
      if (existingIdentity) {
        existingIdentity.title = "CNIC identity document";
        existingIdentity.issuingOrganization = "NADRA";
        existingIdentity.credentialNumber = input.cnic;
        existingIdentity.uploadId = upload._id;
        existingIdentity.verificationStatus = "PENDING";
        existingIdentity.adminNotes = "";
        existingIdentity.verifiedAt = undefined;
        existingIdentity.verifiedBy = undefined;
        await existingIdentity.save({ session });
      } else {
        await TrainerCredential.create([{
          trainerId: current._id,
          type: "IDENTITY",
          title: "CNIC identity document",
          issuingOrganization: "NADRA",
          credentialNumber: input.cnic,
          uploadId: upload._id,
          verificationStatus: "PENDING",
        }], { session });
      }
      user.phone = input.phone;
      await user.save({ session });
      upload.status = "ATTACHED";
      await upload.save({ session });
      await TrainerApplication.updateOne(
        { trainerId: current._id },
        {
          $set: wasApproved
            ? { status: "ACTION_REQUIRED", adminNotes: "Identity details changed and require re-verification." }
            : { status: "DRAFT" },
          $max: { step: 2 },
          ...(wasApproved ? {} : { $unset: { submittedAt: 1 } }),
        },
        { session },
      );
      return { message: "Identity details saved for verification" };
    });
  }
  if (resource === "profile") {
    const input = profileSchema.parse(data);
    return mongoose.connection.transaction(async (session) => {
      const current = await lockTrainer(trainer._id, session);
      await assertMenuValues(input.category, input.specialties, input.languages, session);
      if (input.timezone !== current.timezone)
        assert(
          !(await Session.exists({
            trainerId: current._id,
            end: { $gt: new Date() },
            $or: [
              { status: "CONFIRMED" },
              { status: "HELD", holdExpiresAt: { $gt: new Date() } },
            ],
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
      await TrainerApplication.updateOne(
        { trainerId: current._id },
        { $max: { step: 1 } },
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
    await TrainerApplication.updateOne({ trainerId: trainer._id }, { $max: { step: 4 } });
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

                $unset: {
                  availabilityReviewedBy: 1,
                  availabilityReviewedAt: 1,
                },
              },
              { session, runValidators: true },
            ),
        );
        await TrainerApplication.updateOne(
          { trainerId: current._id },
          { $max: { step: 5 } },
          { session },
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
            start: { $lt: new Date(input.end) },
            end: { $gt: new Date(input.start) },
            $or: [
              { status: "CONFIRMED" },
              { status: "HELD", holdExpiresAt: { $gt: new Date() } },
            ],
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
        type: z.literal("CERTIFICATION"),
        title: z.string().trim().min(2).max(200),
        issuingOrganization: z.string().trim().min(2).max(200),
        credentialNumber: z.string().trim().max(200).optional(),
        issueDate: z.string().date().optional(),
        expiryDate: z.string().date().optional(),
      })
      .strict()
      .parse(data);
    if (input.issueDate && input.expiryDate)
      assert(
        new Date(input.expiryDate).getTime() >= new Date(input.issueDate).getTime(),
        "Expiry date cannot be before issue date",
      );
    if (input.expiryDate)
      assert(
        new Date(`${input.expiryDate}T23:59:59.999Z`).getTime() > Date.now(),
        "Upload a certification that has not expired",
      );
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
        (await TrainerCredential.countDocuments({ trainerId: trainer._id }).session(session)) < 40,
        "Credential limit reached",
      );
      await TrainerCredential.create(
        [
          {
            ...input,
            issueDate: input.issueDate ? new Date(input.issueDate) : undefined,
            expiryDate: input.expiryDate ? new Date(input.expiryDate) : undefined,
            trainerId: trainer._id,
          },
        ],
        { session },
      );
      await TrainerApplication.updateOne(
        { trainerId: trainer._id },
        { $max: { step: 3 } },
        { session },
      );
      upload.status = "ATTACHED";
      await upload.save({ session });
      return { message: "Certification submitted for review" };
    });
  }
  if (resource === "meeting" && id) {
    objectId.parse(id);
    const input = z
      .object({ meetingUrl: z.string().trim().url().max(1000) })
      .strict()
      .parse(data);
    const parsed = new URL(input.meetingUrl);
    assert(parsed.protocol === "https:", "Meeting link must use HTTPS");
    const appointment = await Session.findOne({
      _id: id,
      trainerId: trainer._id,
      status: "CONFIRMED",
      start: { $gt: new Date() },
    });
    assert(appointment, "Upcoming confirmed session not found", 404);
    appointment.meetingUrl = input.meetingUrl;
    appointment.meetingStatus = "CREATED";
    appointment.videoProvider = parsed.hostname === "meet.google.com"
      ? "GOOGLE_MEET"
      : parsed.hostname.includes("zoom")
        ? "ZOOM"
        : "LINK";
    appointment.meetingId = "";
    await appointment.save();
    await notifyUser(
      appointment.customerId,
      "Session link ready",
      "Your trainer added the private video link for your upcoming session.",
      "/dashboard/customer/bookings",
    );
    return { message: "Private session link saved" };
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
          current.displayName.length >= 2 &&
            current.biography.length >= 100 &&
            current.headline &&
            current.category &&
            current.specialties.length &&
            current.languages.length &&
            current.profileImage &&
            current.phone &&
            current.legalName &&
            current.cnic &&
            current.cnicUploadId,
          "Complete your profile and identity details first",
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
          "/trainer/application",
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
              ? { status: "SUBMITTED", submittedAt: new Date(), adminNotes: "" }
              : {}),
          },
          ...(input.submit ? { $unset: { reviewedAt: 1, reviewedBy: 1 } } : {}),
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
      assert(
        trainer.displayName.length >= 2 &&
          trainer.headline &&
          trainer.biography.length >= 100 &&
          trainer.category &&
          trainer.specialties.length > 0 &&
          trainer.languages.length > 0 &&
          trainer.profileImage &&
          trainer.phone &&
          trainer.cnic &&
          trainer.cnicUploadId,
        "Trainer profile or identity details are incomplete",
        409,
      );
      assert(
        await TrainerPackage.exists({ trainerId: trainer._id, active: true }).session(session),
        "Trainer needs at least one active package before approval",
        409,
      );
      assert(
        await TrainerAvailability.exists({ trainerId: trainer._id, active: true }).session(session),
        "Trainer needs active availability before approval",
        409,
      );
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
