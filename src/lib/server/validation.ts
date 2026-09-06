import { z } from "zod";
import { DateTime } from "luxon";
export const objectId = z
  .string()
  .regex(/^[a-f\d]{24}$/i, "Invalid identifier");
export const email = z
  .string()
  .trim()
  .email()
  .max(254)
  .transform((v) => v.toLowerCase());
export const password = z
  .string()
  .min(12)
  .max(72)
  .refine(
    (v) => Buffer.byteLength(v, "utf8") <= 72,
    "Password must be at most 72 UTF-8 bytes",
  );
export const signupSchema = z
  .object({
    firstName: z.string().trim().min(1).max(80),
    lastName: z.string().trim().min(1).max(80),
    email,
    password,
    confirmPassword: z.string(),
    role: z.enum(["CUSTOMER", "TRAINER"]).default("CUSTOMER"),
    terms: z.literal(true),
  })
  .strict()
  .refine((v) => v.password === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });
export const loginSchema = z
  .object({ email, password: z.string().min(1).max(72) })
  .strict();
export const trainingType = z.enum(["home", "gym", "outdoor", "online"]);
const words = z.array(z.string().trim().min(1).max(100)).max(20);
export const timezone = z
  .string()
  .refine((v) => DateTime.now().setZone(v).isValid, "Use an IANA timezone");
export const profileSchema = z
  .object({
    displayName: z.string().trim().min(2).max(170),
    headline: z.string().trim().max(200),
    biography: z.string().trim().max(5000),
    yearsExperience: z.number().int().min(0).max(80),
    specialties: words,
    trainingGoals: words,
    trainingTypes: z.array(trainingType).max(4),
    serviceAreas: words,
    city: z.string().max(100),
    timezone,
    languages: words,
  })
  .strict();
export const packageSchema = z
  .object({
    name: z.string().trim().min(2).max(200),
    description: z.string().trim().min(10).max(2000),
    sessionCount: z.number().int().min(1).max(100),
    sessionDuration: z.number().int().min(15).max(180).multipleOf(15),
    price: z.number().int().min(10000).max(100000000),
    trialPackage: z.boolean().default(false),
    active: z.boolean().default(true),
    sortOrder: z.number().int().min(0).max(100).default(0),
  })
  .strict();
const time = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:mm (00:00–23:59)");
export const availabilitySchema = z
  .object({
    rules: z
      .array(
        z
          .object({
            dayOfWeek: z.number().int().min(0).max(6),
            startTime: time,
            endTime: time,
            trainingTypes: z
              .array(trainingType)
              .min(1)
              .max(4)
              .refine(
                (types) => new Set(types).size === types.length,
                "Training types must be unique",
              ),
          })
          .strict()
          .refine(
            (v) => v.startTime !== v.endTime,
            "Start and end must differ",
          ),
      )
      .max(28),
  })
  .strict();
export const exceptionSchema = z
  .object({
    start: z.string().datetime(),
    end: z.string().datetime(),
    kind: z.enum(["BLOCK", "AVAILABLE"]),
    reason: z.string().max(200),
    trainingTypes: z.array(trainingType).max(4),
  })
  .strict()
  .refine((v) => new Date(v.end) > new Date(v.start), "End must follow start");
export const bookingSchema = z
  .object({
    packageId: objectId,
    start: z.string().datetime(),
    trainingType,
    address: z.string().trim().max(1000).default(""),
    idempotencyKey: z.string().uuid(),
  })
  .strict()
  .refine(
    (v) => v.trainingType !== "home" || v.address.length >= 10,
    "Home sessions require an address",
  );
export const settingsSchema = z
  .object({
    platformName: z.string().min(1).max(80),
    supportEmail: email,
    defaultTimezone: timezone,
    commissionBps: z.number().int().min(0).max(5000),
    cancellationWindowHours: z.number().min(0).max(168),
    minimumBookingNoticeHours: z.number().min(0).max(168),
    maximumAdvanceBookingDays: z.number().int().min(1).max(365),
    holdMinutes: z.number().int().min(5).max(30),
    trainerApplicationEnabled: z.boolean(),
    maintenanceMode: z.boolean(),
  })
  .strict();
