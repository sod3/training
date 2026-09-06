import { MongoMemoryReplSet } from "mongodb-memory-server";
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import mongoose from "mongoose";
import { connectDB } from "../src/lib/server/db";
import { models, User } from "../src/models";
import { hashPassword } from "../src/lib/server/security";

async function main() {
  const db = await MongoMemoryReplSet.create({
    replSet: { count: 1, storageEngine: "wiredTiger" },
  });
  process.env.MONGODB_URI = db.getUri();
  await connectDB();
  for (const model of Object.values(models)) await model.createIndexes();
  await User.create({
    normalizedEmail: "admin@spotter.test",
    passwordHash: await hashPassword("integration-admin-password"),
    firstName: "Test",
    lastName: "Admin",
    name: "Test Admin",
    role: "ADMIN",
    emailVerified: true,
  });
  await mongoose.disconnect();
  const child = spawn(
    process.execPath,
    ["node_modules/next/dist/bin/next", "start", "--port", "3200"],
    {
      stdio: "inherit",
      windowsHide: true,
      env: {
        ...process.env,
        NODE_ENV: "production",
        AUTH_SECRET: randomBytes(32).toString("hex"),
        APP_URL: "https://spotter.test",
        SMTP_HOST: "",
        S3_BUCKET: "",
        SAFEPAY_API_KEY: "",
        SAFEPAY_SECRET_KEY: "",
        CRON_SECRET: randomBytes(32).toString("hex"),
      },
    },
  );
  const stop = async () => {
    child.kill();
    await db.stop();
    process.exit();
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
  child.on("exit", async (code) => {
    await db.stop();
    process.exit(code || 0);
  });
}
main().catch(() => {
  process.stderr.write("Test server startup failed\n");
  process.exit(1);
});
