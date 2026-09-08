import fs from "fs";
import path from "path";
import mongoose from "mongoose";

const envFile = fs.readFileSync(path.join(process.cwd(), ".env"), "utf-8");
for (const line of envFile.split("\n")) {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    process.env[match[1].trim()] = match[2].trim();
  }
}

import { TrainerProfile, TrainerPackage } from "./src/models";
import { connectDB } from "./src/lib/server/db";

async function main() {
  await connectDB();
  const trainers = await TrainerProfile.find({}).lean();
  console.log(`Found ${trainers.length} trainers`);
  for (const t of trainers) {
    const packages = await TrainerPackage.find({ trainerId: t._id }).lean();
    console.log(`\nTrainer: ${t.displayName} (${t.slug})`);
    console.log(`Packages count: ${packages.length}`);
    for (const p of packages) {
      console.log(` - Name: "${p.name}", price: ${p.price} cents (PKR ${p.price/100}), sessions: ${p.sessionCount}, duration: ${p.sessionDuration}m, active: ${p.active}`);
    }
  }
}

main().finally(() => mongoose.disconnect());
