import type { MetadataRoute } from "next";

const baseUrl = (process.env.APP_URL || "https://training-seven-taupe.vercel.app").replace(/\/$/, "");

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/admin/", "/dashboard/", "/trainer/", "/booking", "/checkout", "/reset-password"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
