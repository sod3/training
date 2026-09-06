import { loadEnvConfig } from "@next/env";
import mongoose from "mongoose";
import { z } from "zod";
import { connectDB } from "../src/lib/server/db";
import { hashPassword } from "../src/lib/server/security";
import { email, password } from "../src/lib/server/validation";
import { AuditLog, User, models } from "../src/models";
loadEnvConfig(process.cwd());
async function main() {
  const input = z
    .object({ ADMIN_EMAIL: email, ADMIN_PASSWORD: password })
    .parse(process.env);
  await connectDB();
  for (const model of Object.values(models)) await model.createIndexes();
  const existing = await User.findOne({ normalizedEmail: input.ADMIN_EMAIL });
  if (existing) {
    if (existing.role !== "ADMIN")
      throw new Error(
        "Email belongs to a non-admin account. Refusing privilege escalation.",
      );
    existing.passwordHash = await hashPassword(input.ADMIN_PASSWORD);
    existing.status = "ACTIVE";
    existing.emailVerified = true;
    existing.sessionVersion += 1;
    await existing.save();
    process.stdout.write("Admin credentials synchronized from environment.\n");
    return;
  }
  const passwordHash = await hashPassword(input.ADMIN_PASSWORD);
  await mongoose.connection.transaction(async (session) => {
    const [admin] = await User.create(
      [
        {
          normalizedEmail: input.ADMIN_EMAIL,
          passwordHash,
          firstName: "Spotter",
          lastName: "Admin",
          name: "Spotter Admin",
          role: "ADMIN",
          status: "ACTIVE",
          emailVerified: true,
        },
      ],
      { session },
    );
    await AuditLog.create(
      [
        {
          actorId: admin._id,
          actorRole: "ADMIN",
          action: "BOOTSTRAP_ADMIN",
          entityType: "User",
          entityId: String(admin._id),
        },
      ],
      { session },
    );
  });
  process.stdout.write(
    "Initial admin created securely. Remove ADMIN_PASSWORD from the deployment environment after bootstrap.\n",
  );
}
main()
  .catch(() => {
    process.stderr.write(
      "Admin bootstrap failed. Check environment values and MongoDB connectivity. No credentials were logged.\n",
    );
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
