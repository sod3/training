import { loadEnvConfig } from "@next/env";
import mongoose from "mongoose";
import { connectDB } from "../src/lib/server/db";
import { models } from "../src/models";
loadEnvConfig(process.cwd());
async function main() {
  await connectDB();
  for (const model of Object.values(models)) await model.createIndexes();
  process.stdout.write("Database indexes created.\n");
}
main()
  .catch(() => {
    process.stderr.write("Index creation failed.\n");
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
