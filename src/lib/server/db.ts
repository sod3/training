import mongoose from "mongoose";
import { databaseOperation } from "./diagnostics";

const cache = globalThis as typeof globalThis & {
  spotterDb?: Promise<typeof mongoose>;
};
export async function connectDB() {
  return databaseOperation("MongoDB.connect", async () => {
    const uri = process.env.MONGODB_URI?.trim();
    if (!uri) throw new Error("MONGODB_URI is not configured");
    if (!/^mongodb(?:\+srv)?:\/\//.test(uri))
      throw new Error("MONGODB_URI must use mongodb:// or mongodb+srv://");
    if (cache.spotterDb) return cache.spotterDb;
    if (mongoose.connection.readyState === 1) return mongoose;
    if (!cache.spotterDb) {
      cache.spotterDb = mongoose
        .connect(uri, {
          maxPoolSize: 10,
          minPoolSize: 0,
          serverSelectionTimeoutMS: 5000,
          connectTimeoutMS: 10000,
          bufferCommands: false,
          autoIndex: process.env.NODE_ENV !== "production",
        })
        .finally(() => {
          // Cache only the in-flight attempt; readyState is the source of truth
          // after it settles, including after disconnects in a warm serverless instance.
          cache.spotterDb = undefined;
        });
    }
    return cache.spotterDb;
  });
}
