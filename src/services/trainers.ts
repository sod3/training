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
import type { Trainer } from "@/types/trainer";

const querySchema = z.object({
  q: z.string().max(100).optional(),
  search: z.string().max(100).optional(),
  category: z.string().max(120).optional(),
  specialty: z.string().max(120).optional(),
  goal: z.string().max(120).optional(),
  price: z.coerce.number().min(0).max(1000000).optional(),
  maxPrice: z.coerce.number().min(0).max(1000000).optional(),
  sort: z.enum(["recommended", "rating", "low", "high", "experience"]).default("recommended"),
  page: z.coerce.number().int().min(1).max(1000).default(1),
  limit: z.coerce.number().int().min(1).max(24).default(12),
  ids: z.string().regex(/^[a-f\d]{24}(,[a-f\d]{24}){0,5}$/i).optional(),
});

const regex = (s: string) =>
  new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");

type ProfileData = mongoose.InferSchemaType<typeof TrainerProfile.schema> & {
  _id: mongoose.Types.ObjectId;
};

export async function presentTrainer(t: ProfileData): Promise<Trainer> {
  const [packages, reviews, credentials, completed, stats, account] =
    await Promise.all([
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
        { $group: { _id: null, average: { $avg: "$rating" }, count: { $sum: 1 } } },
      ]),
      User.findById(t.userId).select("avatar").lean(),
    ]);

  const zone = t.timezone || "UTC";
  const availabilityWeekStart = DateTime.now().setZone(zone).toISODate()!;
  let nextAvailable = "No open times this week";
  let nextAvailableAt: string | undefined;
  let nextAvailableDate: string | undefined;
  if (packages.length) {
    for (let offset = 0; offset < 7; offset++) {
      const date = DateTime.now().setZone(zone).plus({ days: offset }).toISODate()!;
      const slots = await getAvailableSlots(
        String(t._id),
        date,
        packages[0].sessionDuration,
      );
      if (slots[0]) {
        nextAvailableAt = slots[0].start;
        nextAvailable = DateTime.fromISO(slots[0].start)
          .setZone(zone)
          .toFormat("ccc, d LLL · h:mm a");
        nextAvailableDate = date;
        break;
      }
    }
  }

  const [firstName, ...last] = t.displayName.split(" ");
  return {
    id: String(t._id),
    slug: t.slug,
    firstName,
    lastName: last.join(" "),
    profileImage: t.profileImage || account?.avatar || "/avatar.svg",
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
    category: t.category || undefined,
    languages: t.languages || [],
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
    nextAvailableAt,
    nextAvailableDate,
    availabilityWeekStart,
    timezone: zone,
  };
}

async function trainerFacets(filters: { category?: string; specialty?: string } = {}) {
  const profiles = await TrainerProfile.find({
    applicationStatus: "APPROVED",
    profileVisibility: "PUBLIC",
  })
    .select("category specialties userId")
    .limit(1000)
    .lean();
  const userIds = profiles.map((p) => p.userId);
  const active = new Set(
    (await User.find({ _id: { $in: userIds }, status: "ACTIVE" }).select("_id").lean()).map(
      (u) => String(u._id),
    ),
  );
  const activeProfiles = profiles.filter((p) => active.has(String(p.userId)));
  const bookableTrainerIds = new Set(
    (await TrainerPackage.distinct("trainerId", {
      trainerId: { $in: activeProfiles.map((profile) => profile._id) },
      active: true,
    })).map(String),
  );
  const visible = activeProfiles.filter((profile) => bookableTrainerIds.has(String(profile._id)));
  const count = (values: string[]) =>
    Object.entries(
      values.reduce<Record<string, number>>((acc, value) => {
        if (value) acc[value] = (acc[value] || 0) + 1;
        return acc;
      }, {}),
    )
      .map(([name, total]) => ({ name, count: total }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  const categoryPool = filters.specialty
    ? visible.filter((profile) => profile.specialties?.includes(filters.specialty!))
    : visible;
  const specialtyPool = filters.category
    ? visible.filter((profile) => profile.category === filters.category)
    : visible;
  return {
    categories: count(categoryPool.map((p) => p.category || "").filter(Boolean)),
    specialties: count(specialtyPool.flatMap((p) => p.specialties || [])),
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
      $in: q.ids.split(",").map((id) => new mongoose.Types.ObjectId(id)),
    };
  if (q.category) match.category = q.category;
  if (q.specialty) match.specialties = q.specialty;
  if (q.goal)
    match.$or = [
      { category: regex(q.goal) },
      { trainingGoals: regex(q.goal) },
      { specialties: regex(q.goal) },
    ];
  if (q.q || q.search) {
    const search = regex((q.q || q.search)!);
    match.$and = [
      {
        $or: ["displayName", "headline", "category", "specialties"].map((field) => ({
          [field]: search,
        })),
      },
    ];
  }

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
          { $project: { perSession: { $divide: ["$price", "$sessionCount"] } } },
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
        averageRating: { $ifNull: [{ $arrayElemAt: ["$ratingData.average", 0] }, 0] },
      },
    },
    {
      $match: {
        "prices.0": { $exists: true },
        ...(q.price || q.maxPrice
          ? { basePrice: { $lte: (q.price || q.maxPrice)! * 100 } }
          : {}),
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
                : { featured: -1, averageRating: -1, yearsExperience: -1, _id: 1 },
    },
  ];

  const [result, facets] = await Promise.all([
    TrainerProfile.aggregate<{ items: ProfileData[]; count: { value: number }[] }>([
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
    ]).then((rows) => rows[0]),
    trainerFacets({ category: q.category, specialty: q.specialty }),
  ]);
  const total = result?.count[0]?.value || 0;
  return {
    trainers: await Promise.all((result?.items || []).map(presentTrainer)),
    total,
    page: q.page,
    pages: Math.ceil(total / q.limit),
    facets,
  };
}

export async function matchTrainers(raw: Record<string, unknown>) {
  const input = z
    .object({
      goal: z.string().max(120).default(""),
      experience: z.enum(["Beginner", "Intermediate", "Advanced"]).default("Beginner"),
      time: z.enum(["Morning", "Afternoon", "Evening", "Flexible"]).default("Flexible"),
      budget: z.coerce.number().min(0).max(1000000).default(0),
      timezone: z.string().trim().max(100).default("UTC"),
    })
    .parse(raw);
  const customerZone = DateTime.now().setZone(input.timezone).isValid ? input.timezone : "UTC";
  const pool = (await listTrainers({ limit: 24 })).trainers;
  const scored = await Promise.all(
    pool.map(async (trainer) => {
      let score = 0;
      const reasons: string[] = [];
      const terms = [trainer.category, ...trainer.specialties].filter(Boolean).join(" ").toLowerCase();
      const goalWords = input.goal.toLowerCase().split(/\s+|&/).filter((w) => w.length > 3);
      if (!input.goal || trainer.category === input.goal || goalWords.some((w) => terms.includes(w))) {
        score += 45;
        if (input.goal) reasons.push(`Matches ${input.goal}`);
      }
      const fitsBudget = !input.budget || trainer.basePrice <= input.budget;
      if (fitsBudget) {
        score += 25;
        if (input.budget) reasons.push("Fits your budget");
      }
      const experienceTarget = input.experience === "Advanced" ? 5 : input.experience === "Intermediate" ? 2 : 0;
      if (trainer.experienceYears >= experienceTarget) {
        score += 15;
        reasons.push(`${trainer.experienceYears}+ years experience`);
      }
      if (input.time === "Flexible") score += 15;
      else if (trainer.packages[0]) {
        const profile = await TrainerProfile.findById(trainer.id).select("timezone").lean();
        const zone = profile?.timezone || "UTC";
        let available = false;
        for (let offset = 0; offset < 7 && !available; offset++) {
          const date = DateTime.now().setZone(zone).plus({ days: offset }).toISODate()!;
          const slots = await getAvailableSlots(trainer.id, date, trainer.packages[0].duration);
          available = slots.some((slot) => {
            const hour = DateTime.fromISO(slot.start).setZone(customerZone).hour;
            return input.time === "Morning"
              ? hour < 12
              : input.time === "Afternoon"
                ? hour >= 12 && hour < 17
                : hour >= 17;
          });
        }
        if (available) {
          score += 15;
          reasons.push(`Available ${input.time.toLowerCase()}`);
        }
      }
      return { ...trainer, matchScore: score, matchReasons: reasons.slice(0, 3) };
    }),
  );
  scored.sort((a, b) => b.matchScore - a.matchScore || b.rating - a.rating);
  return { best: scored.slice(0, 3), recommended: scored.slice(3, 7) };
}

export const getTrainerBySlug = cache(async (slug: string): Promise<Trainer | null> => {
  await connectDB();
  const trainer = await TrainerProfile.findOne({
    slug,
    applicationStatus: "APPROVED",
    profileVisibility: "PUBLIC",
  }).lean();
  if (!trainer || !(await User.exists({ _id: trainer.userId, status: "ACTIVE" }))) return null;
  return presentTrainer(trainer);
});

export const getFeaturedTrainers = async () => (await listTrainers({ limit: 3 })).trainers;
export const getTrainers = async () => (await listTrainers()).trainers;
