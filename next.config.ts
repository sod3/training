import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
    qualities: [50, 75, 90, 100],
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },
  poweredByHeader: false,
  async redirects() {
    return [
      { source: "/trainer/bookings", destination: "/trainer/clients", permanent: true },
      { source: "/trainer/messages", destination: "/trainer/clients", permanent: true },
      { source: "/trainer/availability", destination: "/trainer/schedule", permanent: true },
      { source: "/trainer/services", destination: "/trainer/schedule", permanent: true },
      { source: "/trainer/pricing", destination: "/trainer/schedule", permanent: true },
      { source: "/trainer/packages", destination: "/trainer/schedule", permanent: true },
      { source: "/trainer/services-pricing", destination: "/trainer/schedule", permanent: true },
      { source: "/trainer/verification", destination: "/trainer/profile", permanent: true },
      { source: "/trainer/application", destination: "/trainer/profile", permanent: true },
      { source: "/trainer/security", destination: "/trainer/profile", permanent: true },
      { source: "/trainer/reviews", destination: "/trainer/profile", permanent: true },
      { source: "/trainer/calendar", destination: "/trainer/schedule", permanent: true },
      { source: "/trainer/payouts", destination: "/trainer/earnings", permanent: true },
      { source: "/trainer/analytics", destination: "/trainer", permanent: true },
      { source: "/dashboard/customer/bookings", destination: "/dashboard/customer/training", permanent: true },
      { source: "/dashboard/customer/messages", destination: "/dashboard/customer/training", permanent: true },
      { source: "/dashboard/customer/reviews", destination: "/dashboard/customer/training", permanent: true },
      { source: "/dashboard/customer/payments", destination: "/dashboard/customer/training", permanent: true },
      { source: "/dashboard/customer/security", destination: "/dashboard/customer/profile", permanent: true },
      { source: "/dashboard/customer/settings", destination: "/dashboard/customer/profile", permanent: true },
    ];
  },
  async headers() {
    return [
      {
        source: "/media/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        source: "/hero.mp4",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        source: "/Trainer.mp4",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Content-Security-Policy",
            value:
              "base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
