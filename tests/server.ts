import { MongoMemoryReplSet } from "mongodb-memory-server";
import { spawn, execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { createServer } from "node:https";
import { request as upstreamRequest } from "node:http";
import { mkdtemp, readFile, unlink, rmdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
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
  if (process.env.MOBILE_AUDIT === "1") {
    const { seedMobileAudit } = await import("./mobile-fixtures");
    await seedMobileAudit();
  }
  await mongoose.disconnect();
  // Safari requires HTTPS to use production __Host- secure session cookies.
  // Generate an ephemeral certificate; never change application cookie policy.
  let closeHttps = async () => {};
  if (process.env.MOBILE_AUDIT === "1") {
    const certDir = await mkdtemp(join(tmpdir(), "spotter-mobile-https-"));
    const keyPath = join(certDir, "key.pem");
    const certPath = join(certDir, "cert.pem");
    execFileSync(
      "openssl",
      [
        "req",
        "-x509",
        "-newkey",
        "rsa:2048",
        "-nodes",
        "-keyout",
        keyPath,
        "-out",
        certPath,
        "-days",
        "1",
        "-subj",
        "/CN=localhost",
        "-addext",
        "subjectAltName=DNS:localhost,IP:127.0.0.1",
      ],
      { stdio: "ignore", windowsHide: true },
    );
    const proxy = createServer(
      { key: await readFile(keyPath), cert: await readFile(certPath) },
      (req, res) => {
        const upstream = upstreamRequest(
          {
            hostname: "127.0.0.1",
            port: 3200,
            path: req.url,
            method: req.method,
            headers: req.headers,
          },
          (response) => {
            res.writeHead(response.statusCode || 502, response.headers);
            response.pipe(res);
          },
        );
        upstream.on("error", () => {
          if (!res.headersSent) res.writeHead(502);
          res.end();
        });
        req.on("aborted", () => upstream.destroy());
        req.pipe(upstream);
      },
    );
    await new Promise<void>((resolve) => proxy.listen(3201, resolve));
    let closing = false;
    closeHttps = async () => {
      if (closing) return;
      closing = true;
      proxy.close();
      proxy.closeAllConnections();
      await unlink(keyPath);
      await unlink(certPath);
      await rmdir(certDir);
    };
  }
  const child = spawn(
    process.execPath,
    ["node_modules/next/dist/bin/next", "start", "--port", "3200"],
    {
      stdio: "inherit",
      windowsHide: true,
      env: {
        ...process.env,
        NODE_ENV: "production",
        // Deliberately differ from the browser timezone so SSR/client locale
        // mismatches are caught by the end-to-end suite.
        TZ: "UTC",
        AUTH_SECRET: randomBytes(32).toString("hex"),
        APP_URL:
          process.env.MOBILE_AUDIT === "1"
            ? "https://localhost:3201"
            : "https://spotter.test",
        ...(process.env.MOBILE_AUDIT === "1"
          ? {
              JAZZCASH_ACCOUNT_NUMBER: "03001234567",
              BANK_IBAN: "PK21MEZN0010530113545140",
              BANK_ACCOUNT_NAME: "Spotter Online Fitness Coaching",
            }
          : {}),
        CRON_SECRET: randomBytes(32).toString("hex"),
      },
    },
  );
  const stop = async () => {
    child.kill();
    await closeHttps();
    await db.stop();
    process.exit();
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
  child.on("exit", async (code) => {
    await closeHttps();
    await db.stop();
    process.exit(code || 0);
  });
}
main().catch(() => {
  process.stderr.write("Test server startup failed\n");
  process.exit(1);
});
