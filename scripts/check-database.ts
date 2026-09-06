import { loadEnvConfig } from "@next/env";
import mongoose from "mongoose";
import { connectDB } from "../src/lib/server/db";
import { logRequestError } from "../src/lib/server/diagnostics";
import { models, TrainerAvailability, TrainerProfile } from "../src/models";
import { randomUUID } from "node:crypto";

// Read-only. Run with production environment variables injected to check that
// environment; otherwise this checks local .env files, not Vercel's configuration.
loadEnvConfig(process.cwd());
async function main() {
  // Do not build indexes/collections as a side effect of diagnostics.
  mongoose.set("autoIndex", false);
  mongoose.set("autoCreate", false);
  for (const model of Object.values(models)) {
    model.schema.set("autoIndex", false);
    model.schema.set("autoCreate", false);
  }
  const uri = process.env.MONGODB_URI?.trim() || "";
  const configured = {
    mongodbUriPresent: !!uri,
    mongodbSchemeValid: /^mongodb(?:\+srv)?:\/\//.test(uri),
    mongodbDatabaseExplicit: /^mongodb(?:\+srv)?:\/\/[^/]+\/[^?\s]+/.test(uri),
    authSecretValid: (process.env.AUTH_SECRET?.length ?? 0) >= 32,
    appUrlConfigured: !!(
      process.env.APP_URL ||
      process.env.VERCEL_PROJECT_PRODUCTION_URL ||
      process.env.VERCEL_URL
    ),
    vercelEnvironment: process.env.VERCEL_ENV || "local (not Vercel)",
  };
  console.log(JSON.stringify({ configured }));
  await connectDB();
  const database = mongoose.connection.db!;
  await database.command({ ping: 1 });
  const hello = await database.command({ hello: 1 });
  const transactionsSupported = !!hello.setName || hello.msg === "isdbgrid";
  const collections = await database
    .listCollections({}, { nameOnly: true })
    .toArray();
  const collectionNames = new Set(
    collections.map((collection) => collection.name),
  );
  console.log(
    JSON.stringify({
      connected: mongoose.connection.readyState === 1,
      transactionsSupported,
      modelsOnDefaultConnection: Object.values(models).every(
        (model) => model.db === mongoose.connection,
      ),
      trainerCollectionExists: collectionNames.has(
        TrainerProfile.collection.name,
      ),
      availabilityCollectionExists: collectionNames.has(
        TrainerAvailability.collection.name,
      ),
    }),
  );
  if (!transactionsSupported)
    throw new Error(
      "MongoDB replica set or sharded cluster required for availability transactions",
    );
  if (!configured.authSecretValid || !configured.appUrlConfigured)
    throw new Error(
      "Required application environment variables are missing or invalid",
    );
}
main()
  .catch((error: unknown) => {
    logRequestError(
      error,
      { requestId: randomUUID(), operation: "database.check" },
      500,
    );
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
