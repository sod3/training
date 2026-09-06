import "server-only";
import { cache } from "react";
import { DateTime } from "luxon";
import { z } from "zod";
import mongoose, { type PipelineStage } from "mongoose";
import {
  TrainerProfile,
  TrainerPackage,
  TrainerCredential,
  Review,
  Session,
  User,
} from "@/models";
import { connectDB } from "@/lib/server/db";
import { getAvailableSlots } from "@/services/bookings";
import type { Trainer, TrainingType } from "@/types/trainer";

const querySchema = z.object({
  q: z.string().max(100).optional(),
  search: z.string().max(100).optional(),
  goal: z.string().max(100).optional(),
  location: z.string().max(100).optional(),
  type: z.enum(["home", "gym", "outdoor", "online", ""]).optional(),
  price: z.coerce.number().min(0).max(1000000).optional(),
  maxPrice: z.coerce.number().min(0).max(1000000).optional(),
  rating: z.coerce.number().min(0).max(5).optional(),
  experience: z.coerce.number().min(0).max(80).optional(),
  sort: z
    .enum(["recommended", "rating", "low", "high", "experience", "soon"])
    .default("recommended"),
  page: z.coerce.number().int().min(1).max(1000).default(1),
  limit: z.coerce.number().int().min(1).max(24).default(12),
  ids: z
    .string()
    .regex(/^[a-f\d]{24}(,[a-f\d]{24}){0,2}$/i)
    .optional(),
  availability: z.enum(["", "today", "tomorrow", "week"]).optional(),
  time: z.enum(["Morning", "Afternoon", "Evening", "Flexible", ""]).optional(),
});
const regex = (s: string) =>
  new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
type ProfileData = mongoose.InferSchemaType<typeof TrainerProfile.schema> & {
  _id: mongoose.Types.ObjectId;
};
export async function presentTrainer(t: ProfileData): Promise<Trainer> {
  const [packages, reviews, credentials, completed, stats] = await Promise.all([
    TrainerPackage.find({ trainerId: t._id, active: true })
      .sort({ sortOrder: 1, price: 1 })
      .limit(30)
      .lean(),
    Review.find({ trainerId: t._id, status: "VISIBLE" })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean(),
    TrainerCredential.find({
      trainerId: t._id,
      type: "CERTIFICATION",
      verificationStatus: "APPROVED",
      $or: [{ expiryDate: null }, { expiryDate: { $gt: new Date() } }],
    })
      .select("title")
      .limit(20)
      .lean(),
    Session.countDocuments({ trainerId: t._id, status: "COMPLETED" }),
    Review.aggregate<{ average: number; count: number }>([
      { $match: { trainerId: t._id, status: "VISIBLE" } },
      {
        $group: { _id: null, average: { $avg: "$rating" }, count: { $sum: 1 } },
      },
    ]),
  ]);
  let nextAvailable = "No open times this week";
  if (packages.length && t.trainingTypes.length)
    for (let offset = 0; offset < 7; offset++) {
      const date = DateTime.now()
        .setZone(t.timezone)
        .plus({ days: offset })
        .toISODate()!;
      const slots = await getAvailableSlots(
        String(t._id),
        date,
        packages[0].sessionDuration,
        t.trainingTypes[0],
      );
      if (slots.length) {
        nextAvailable = DateTime.fromISO(slots[0].start)
          .setZone(t.timezone)
          .toFormat("ccc, d LLL · h:mm a");
        break;
      }
    }
  const [firstName, ...last] = t.displayName.split(" ");
  return {
    id: String(t._id),
    slug: t.slug,
    firstName,
    lastName: last.join(" "),
    profileImage: t.profileImage || "/avatar.svg",
    coverImage: t.coverImage || undefined,
    headline: t.headline,
    bio: t.biography,
    verifiedIdentity: t.identityVerificationStatus === "APPROVED",
    verifiedCredentials: credentials.length > 0,
    rating: stats[0]?.average || 0,
    reviewCount: stats[0]?.count || 0,
    sessionsCompleted: completed,
    experienceYears: t.yearsExperience,
    responseTime: "when available",
    locations: t.serviceAreas,
    trainingTypes: t.trainingTypes as TrainingType[],
    specialties: t.specialties,
    certifications: credentials.map((c) => c.title),
    packages: packages.map((p) => ({
      id: String(p._id),
      title: p.name,
      price: p.price / 100,
      sessions: p.sessionCount,
      duration: p.sessionDuration,
      description: p.description,
    })),
    reviews: reviews.map((r) => ({
      id: String(r._id),
      clientName: r.customerName,
      rating: r.rating,
      date: r.createdAt.toISOString().slice(0, 10),
      goal: r.trainingGoal,
      comment: r.review,
      verified: r.verifiedBooking,
    })),
    basePrice: packages.length
      ? Math.min(...packages.map((p) => p.price / p.sessionCount / 100))
      : 0,
    nextAvailable,
    timezone: t.timezone,
    city: t.city,
  };
}
export async function listTrainers(raw: Record<string, unknown> = {}) {
  const q = querySchema.parse(raw);
  await connectDB();
  const match: Record<string, unknown> = {
    applicationStatus: "APPROVED",
    profileVisibility: "PUBLIC",
  };
  if (q.ids)
    match._id = {
      $in: q.ids
        .split(",")
        .slice(0, 3)
        .map((id) => new mongoose.Types.ObjectId(id)),
    };
  if (q.location) match.serviceAreas = regex(q.location);
  if (q.goal)
    match.$or = [
      { trainingGoals: regex(q.goal) },
      { specialties: regex(q.goal) },
    ];
  if (q.type) match.trainingTypes = q.type;
  if (q.experience) match.yearsExperience = { $gte: q.experience };
  if (q.q || q.search)
    match.$and = [
      {
        $or: ["displayName", "headline", "specialties", "serviceAreas"].map(
          (field) => ({ [field]: regex((q.q || q.search)!) }),
        ),
      },
    ];
  const pipeline: PipelineStage[] = [
    { $match: match },
    {
      $lookup: {
        from: "users",
        localField: "userId",
        foreignField: "_id",
        as: "account",
        pipeline: [{ $match: { status: "ACTIVE" } }, { $project: { _id: 1 } }],
      },
    },
    { $match: { "account.0": { $exists: true } } },
    {
      $lookup: {
        from: "trainerpackages",
        localField: "_id",
        foreignField: "trainerId",
        as: "prices",
        pipeline: [
          { $match: { active: true } },
          {
            $project: { perSession: { $divide: ["$price", "$sessionCount"] } },
          },
        ],
      },
    },
    {
      $lookup: {
        from: "reviews",
        localField: "_id",
        foreignField: "trainerId",
        as: "ratingData",
        pipeline: [
          { $match: { status: "VISIBLE" } },
          { $group: { _id: null, average: { $avg: "$rating" } } },
        ],
      },
    },
    {
      $addFields: {
        basePrice: { $min: "$prices.perSession" },
        averageRating: {
          $ifNull: [{ $arrayElemAt: ["$ratingData.average", 0] }, 0],
        },
      },
    },
    {
      $match: {
        "prices.0": { $exists: true },
        ...(q.price || q.maxPrice
          ? { basePrice: { $lte: (q.price || q.maxPrice)! * 100 } }
          : {}),
        ...(q.rating ? { averageRating: { $gte: q.rating } } : {}),
      },
    },
    {
      $sort:
        q.sort === "low"
          ? { basePrice: 1, _id: 1 }
          : q.sort === "high"
            ? { basePrice: -1, _id: 1 }
            : q.sort === "experience"
              ? { yearsExperience: -1, _id: 1 }
              : q.sort === "rating"
                ? { averageRating: -1, _id: 1 }
                : {
                    featured: -1,
                    averageRating: -1,
                    yearsExperience: -1,
                    _id: 1,
                  },
    },
  ];
  if (
    q.availability ||
    (q.time && q.time !== "Flexible") ||
    q.sort === "soon"
  ) {
    const cursor = TrainerProfile.aggregate<ProfileData>([
      ...pipeline,
      { $project: { account: 0, prices: 0, ratingData: 0 } },
    ]).cursor({ batchSize: 25 });
    const eligible: { trainer: ProfileData; next: string }[] = [];
    for await (const t of cursor) {
      const pkg = await TrainerPackage.findOne({
        trainerId: t._id,
        active: true,
      })
        .sort({ sortOrder: 1 })
        .lean();
      if (!pkg) continue;
      const start = q.availability === "tomorrow" ? 1 : 0;
      const days = ["today", "tomorrow"].includes(q.availability || "") ? 1 : 7;
      let next = "";
      for (let i = start; i < start + days && !next; i++)
        for (const type of q.type ? [q.type] : t.trainingTypes) {
          const slots = await getAvailableSlots(
            String(t._id),
            DateTime.now().setZone(t.timezone).plus({ days: i }).toISODate()!,
            pkg.sessionDuration,
            type,
          );
          const slot = slots.find((s) => {
            const hour = DateTime.fromISO(s.start).setZone(t.timezone).hour;
            return (
              !q.time ||
              q.time === "Flexible" ||
              (q.time === "Morning"
                ? hour < 12
                : q.time === "Afternoon"
                  ? hour >= 12 && hour < 17
                  : hour >= 17)
            );
          });
          if (slot && (!next || slot.start < next)) next = slot.start;
        }
      if (next) eligible.push({ trainer: t, next });
    }
    if (q.sort === "soon")
      eligible.sort((a, b) => a.next.localeCompare(b.next));
    return {
      trainers: await Promise.all(
        eligible
          .slice((q.page - 1) * q.limit, q.page * q.limit)
          .map((t) => presentTrainer(t.trainer)),
      ),
      total: eligible.length,
      page: q.page,
      pages: Math.ceil(eligible.length / q.limit),
    };
  }
  const [result] = await TrainerProfile.aggregate<{
    items: ProfileData[];
    count: { value: number }[];
  }>([
    ...pipeline,
    {
      $facet: {
        items: [
          { $skip: (q.page - 1) * q.limit },
          { $limit: q.limit },
          { $project: { account: 0, prices: 0, ratingData: 0 } },
        ],
        count: [{ $count: "value" }],
      },
    },
  ]);
  const total = result?.count[0]?.value || 0;
  return {
    trainers: await Promise.all((result?.items || []).map(presentTrainer)),
    total,
    page: q.page,
    pages: Math.ceil(total / q.limit),
  };
}
export const getTrainerBySlug = cache(
  async (slug: string): Promise<Trainer | null> => {
    await connectDB();
    const trainer = await TrainerProfile.findOne({
      slug,
      applicationStatus: "APPROVED",
      profileVisibility: "PUBLIC",
    }).lean();
    if (
      !trainer ||
      !(await User.exists({
        _id: trainer.userId,
        status: "ACTIVE",
      }))
    )
      return null;
    return presentTrainer(trainer);
  },
);
export const getFeaturedTrainers = async () =>
  (await listTrainers({ limit: 3 })).trainers;
export const getTrainers = async () => (await listTrainers()).trainers;
