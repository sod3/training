import { z } from "zod";
import { DateTime } from "luxon";
import { validateDailyAvailability } from "./rules";
export const objectId = z
  .string()
  .regex(/^[a-f\d]{24}$/i, "Invalid identifier format");
export const email = z
  .string({ required_error: "Email address is required" })
  .trim()
  .email("Please enter a valid email address")
  .max(254, "Email address is too long")
  .transform((v) => v.toLowerCase());
export const password = z
  .string({ required_error: "Password is required" })
  .min(12, "Password must be at least 12 characters long")
  .max(72, "Password cannot exceed 72 characters")
  .refine(
    (v) => Buffer.byteLength(v, "utf8") <= 72,
    "Password must be at most 72 UTF-8 bytes",
  );
export const signupSchema = z
  .object({
    firstName: z.string().trim().min(1, "First name is required").max(80, "First name is too long"),
    lastName: z.string().trim().min(1, "Last name is required").max(80, "Last name is too long"),
    email,
    password,
    confirmPassword: z.string({ required_error: "Please confirm your password" }),
    role: z.enum(["CUSTOMER", "TRAINER"]).default("CUSTOMER"),
    terms: z.literal(true, {
      errorMap: () => ({ message: "You must accept the Terms and Privacy Policy to create an account" }),
    }),
  })
  .strict()
  .refine((v) => v.password === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });
export const loginSchema = z
  .object({
    email,
    password: z.string({ required_error: "Password is required" }).min(1, "Password is required").max(72),
  })
  .strict();

const words = z.array(z.string().trim().min(1).max(100)).max(20);
export const timezone = z
  .string()
  .refine((v) => DateTime.now().setZone(v).isValid, "Please select a valid IANA timezone (e.g. Asia/Karachi)");
export const profileSchema = z
  .object({
    displayName: z.string().trim().min(2, "Display name must be at least 2 characters").max(170, "Display name is too long"),
    headline: z.string().trim().max(200, "Headline cannot exceed 200 characters"),
    biography: z.string().trim().min(10, "Biography must be at least 10 characters").max(5000, "Biography cannot exceed 5000 characters"),
    yearsExperience: z.number({ required_error: "Years of experience is required" }).int().min(0, "Years of experience cannot be negative").max(80, "Years of experience cannot exceed 80"),
    category: z.string().trim().min(2, "Please select a main training category").max(120),
    specialties: words,
    trainingGoals: words.default([]),
    timezone,
  })
  .strict();
export const packageSchema = z
  .object({
    name: z.string().trim().min(2, "Package name must be at least 2 characters").max(200, "Package name cannot exceed 200 characters"),
    description: z.string().trim().min(10, "Description must be at least 10 characters").max(2000, "Description cannot exceed 2000 characters"),
    sessionCount: z.number({ required_error: "Number of sessions is required" }).int().min(1, "Package must include at least 1 session").max(100, "Package cannot exceed 100 sessions"),
    sessionDuration: z.number({ required_error: "Session duration is required" }).int().min(15, "Session duration must be at least 15 minutes").max(180, "Session duration cannot exceed 180 minutes").multipleOf(15, "Session duration must be a multiple of 15 minutes"),
    price: z.number({ required_error: "Total package price is required" }).int().min(10000, "Total package price must be at least PKR 100 (10,000 paisa)").max(100000000, "Price exceeds maximum limit"),
    trialPackage: z.boolean().default(false),
    active: z.boolean().default(true),
    sortOrder: z.number().int().min(0).max(100).default(0),
  })
  .strict();
const time = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:mm time format (e.g. 09:00, 17:30)");
export const availabilitySchema = z
  .object({
    rules: z
      .array(
        z
          .object({
            dayOfWeek: z.number().int().min(0).max(6),
            startTime: time,
            endTime: time,

          })
          .strict()
          .refine(
            (v) => v.startTime !== v.endTime,
            "Start and end time must differ",
          ),
      )
      .max(28),
  })
  .strict()
  .refine(
    (v) => validateDailyAvailability(v.rules).valid,
    (v) => ({
      message:
        validateDailyAvailability(v.rules).message ||
        "Daily availability cannot exceed 4 hours (240 minutes) per day",
    }),
  );
export const exceptionSchema = z
  .object({
    start: z.string().datetime({ message: "Invalid start date/time format" }),
    end: z.string().datetime({ message: "Invalid end date/time format" }),
    kind: z.enum(["BLOCK", "AVAILABLE"]),
    reason: z.string().min(1, "Reason is required").max(200, "Reason cannot exceed 200 characters"),

  })
  .strict()
  .refine((v) => new Date(v.end) > new Date(v.start), "End date/time must be after start date/time");
export const bookingSchema = z
  .object({
    packageId: objectId,
    start: z.string().datetime({ message: "Invalid session start time format" }),
    idempotencyKey: z.string().uuid({ message: "Invalid request key" }),
  })
  .strict();
export const settingsSchema = z
  .object({
    platformName: z.string().min(1, "Platform name is required").max(80),
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
