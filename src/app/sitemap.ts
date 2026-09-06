import type { MetadataRoute } from "next";
import { listTrainers } from "@/services/trainers";

const baseUrl = (process.env.APP_URL || "https://training-seven-taupe.vercel.app").replace(/\/$/, "");

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const paths = [
    "",
    "/trainers",
    "/match",
    "/how-it-works",
    "/become-a-trainer",
    "/about",
    "/help",
    "/safety",
    "/privacy",
    "/terms",
    "/cancellation",
    "/contact",
  ];
  let trainerEntries: MetadataRoute.Sitemap = [];
  try {
    let page = 1;
    let pages = 1;
    do {
      const result = await listTrainers({ page, limit: 24 });
      trainerEntries.push(
        ...result.trainers.map((trainer) => ({
          url: `${baseUrl}/trainers/${trainer.slug}`,
          lastModified: now,
          changeFrequency: "weekly" as const,
          priority: 0.7,
        })),
      );
      pages = Math.min(result.pages || 1, 1000);
      page += 1;
    } while (page <= pages);
  } catch {
    // A sitemap should still be available during a temporary database outage.
  }
  return [
    ...paths.map((path, index) => ({
      url: `${baseUrl}${path || "/"}`,
      lastModified: now,
      changeFrequency: index === 0 ? ("daily" as const) : ("weekly" as const),
      priority: index === 0 ? 1 : path === "/trainers" || path === "/match" ? 0.9 : 0.6,
    })),
    ...trainerEntries,
  ];
}
