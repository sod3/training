import { loadEnvConfig } from "@next/env";
import mongoose from "mongoose";
import { connectDB } from "../src/lib/server/db";
import { Taxonomy } from "../src/models";
loadEnvConfig(process.cwd());
async function main() {
  if (
    process.env.NODE_ENV === "production" ||
    process.env.ALLOW_DEVELOPMENT_SEED !== "true"
  )
    throw new Error("Development seeding is not enabled");
  await connectDB();
  const entries = [
    {
      kind: "LOCATION",
      name: "Clifton",
      city: "Karachi",
      slug: "karachi-clifton",
    },
    { kind: "LOCATION", name: "DHA", city: "Karachi", slug: "karachi-dha" },
    ...["Strength Training", "Build Muscle", "Lose Weight", "Mobility"].map(
      (name) => ({
        kind: "SPECIALTY",
        name,
        slug: name.toLowerCase().replaceAll(" ", "-"),
      }),
    ),
  ];
  for (const item of entries)
    await Taxonomy.updateOne(
      { slug: item.slug },
      { $setOnInsert: item },
      { upsert: true },
    );
  process.stdout.write(
    "Development catalog seeded. No people, bookings, reviews or payments were created.\n",
  );
}
main()
  .catch(() => {
    process.stderr.write(
      "Seed refused or failed. Use a development database and ALLOW_DEVELOPMENT_SEED=true.\n",
    );
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
