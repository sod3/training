import { getTrainerBySlug, listTrainers } from "@/lib/services/trainers";
import { notFound } from "next/navigation";
import { Profile } from "@/components/marketplace/profile";
export const dynamic = "force-dynamic";
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const trainer = await getTrainerBySlug(slug);
  if (!trainer) notFound();
  const related = await listTrainers({ ...(trainer.category ? { category: trainer.category } : {}), limit: 4 });
  const recommended = related.trainers.filter((item) => item.id !== trainer.id).slice(0, 3);
  const baseUrl = (process.env.APP_URL || "https://training-seven-taupe.vercel.app").replace(/\/$/, "");
  const fullName = `${trainer.firstName} ${trainer.lastName}`.trim();
  const structuredData: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: fullName,
    url: `${baseUrl}/trainers/${trainer.slug}`,
    image: trainer.profileImage.startsWith("http") ? trainer.profileImage : `${baseUrl}${trainer.profileImage}`,
    jobTitle: trainer.headline || "Online Personal Trainer",
    description: trainer.bio,
    knowsAbout: [trainer.category, ...trainer.specialties].filter(Boolean),
    ...(trainer.reviewCount > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: Number(trainer.rating.toFixed(2)),
            reviewCount: trainer.reviewCount,
            bestRating: 5,
            worstRating: 1,
          },
        }
      : {}),
    ...(trainer.packages.length
      ? {
          makesOffer: trainer.packages.slice(0, 10).map((pkg) => ({
            "@type": "Offer",
            priceCurrency: "PKR",
            price: pkg.price,
            name: pkg.title,
            url: `${baseUrl}/trainers/${trainer.slug}`,
          })),
        }
      : {}),
  };
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }}
      />
      <Profile trainer={trainer} recommended={recommended} />
    </>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const t = await getTrainerBySlug(slug);
  const name = t ? `${t.firstName} ${t.lastName}`.trim() : "Trainer not found";
  const description = t
    ? (t.bio || `${name} is an online personal trainer on Spotter.`).replace(/\s+/g, " ").trim().slice(0, 158)
    : "Trainer profile not found.";
  return {
    title: t ? `${name} | Online Personal Trainer` : "Trainer not found",
    description,
    alternates: { canonical: "/trainers/" + slug },
    openGraph: t
      ? {
          title: `${name} | Online Personal Trainer`,
          description,
          type: "profile" as const,
          images: [{ url: t.profileImage, alt: `${name}, online personal trainer` }],
        }
      : undefined,
  };
}
