import { loadEnvConfig } from "@next/env";
import mongoose from "mongoose";
import { connectDB } from "../src/lib/server/db";
import { Taxonomy, TrainerProfile } from "../src/models";
import { DEFAULT_SPECIALTIES } from "../src/lib/catalog";

loadEnvConfig(process.cwd());

const slugify = (value: string) =>
  value.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

function mapSpecialty(s: string): string {
  const lower = s.toLowerCase();
  if (lower.includes("fat") || lower.includes("weight")) {
    return "Fat Loss";
  }
  if (lower.includes("mobility") || lower.includes("flexibility") || lower.includes("joint") || lower.includes("posture")) {
    return "Mobility";
  }
  return "Strength and Muscle Building";
}

async function main() {
  await connectDB();
  console.log("Connected to DB, syncing specialties...");

  // 1. Clean up Taxonomy collection for SPECIALTY
  const validSlugs = DEFAULT_SPECIALTIES.map(slugify);
  await Taxonomy.deleteMany({ kind: "SPECIALTY", slug: { $nin: validSlugs } });
  
  for (let i = 0; i < DEFAULT_SPECIALTIES.length; i++) {
    const name = DEFAULT_SPECIALTIES[i];
    const slug = slugify(name);
    await Taxonomy.updateOne(
      { kind: "SPECIALTY", slug },
      { $set: { kind: "SPECIALTY", name, slug, sortOrder: i + 1, active: true } },
      { upsert: true }
    );
  }
  console.log("Taxonomy updated with valid specialties:", DEFAULT_SPECIALTIES);

  // 2. Update TrainerProfile records
  const profiles = await TrainerProfile.find({});
  let updatedCount = 0;

  for (const profile of profiles) {
    const currentSpecialties: string[] = profile.specialties || [];
    const newSpecialties = Array.from(
      new Set(
        currentSpecialties.length > 0
          ? currentSpecialties.map(mapSpecialty)
          : ["Strength and Muscle Building"]
      )
    );

    profile.specialties = newSpecialties;
    await profile.save();
    updatedCount++;
    console.log(`Updated profile ${profile.displayName} (${profile.slug}):`, newSpecialties);
  }

  console.log(`Finished updating ${updatedCount} trainer profiles.`);
}

main()
  .catch((err) => {
    console.error("Error syncing specialties:", err);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
