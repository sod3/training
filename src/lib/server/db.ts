import mongoose from "mongoose";

const cache = globalThis as typeof globalThis & {
  spotterDb?: Promise<typeof mongoose>;
};
export async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not configured");
  if (!cache.spotterDb) {
    cache.spotterDb = mongoose
      .connect(uri, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        autoIndex: process.env.NODE_ENV !== "production",
      })
      .catch((error: unknown) => {
        cache.spotterDb = undefined;
        throw error;
      });
  }
  return cache.spotterDb;
}
