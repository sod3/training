import { loadEnvConfig } from "@next/env";
import mongoose from "mongoose";
import { connectDB } from "../src/lib/server/db";
import { Taxonomy } from "../src/models";
import { DEFAULT_CATEGORIES, DEFAULT_SPECIALTIES } from "../src/lib/catalog";

loadEnvConfig(process.cwd());

const slugify = (value: string) =>
  value.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

async function main() {
  if (process.env.NODE_ENV === "production" || process.env.ALLOW_DEVELOPMENT_SEED !== "true")
    throw new Error("Development seeding is not enabled");
  await connectDB();
  const entries = [
    ...DEFAULT_CATEGORIES.map((name, index) => ({ kind: "CATEGORY", name, slug: slugify(name), sortOrder: index + 1, active: true })),
    ...DEFAULT_SPECIALTIES.map((name, index) => ({ kind: "SPECIALTY", name, slug: slugify(name), sortOrder: index + 1, active: true })),
  ];
  for (const item of entries)
    await Taxonomy.updateOne({ slug: item.slug }, { $setOnInsert: item }, { upsert: true });
  process.stdout.write("Development categories and specialties seeded. No people, bookings, reviews or payments were created.\n");
}

main()
  .catch(() => {
    process.stderr.write("Seed refused or failed. Use a development database and ALLOW_DEVELOPMENT_SEED=true.\n");
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
