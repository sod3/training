import { getTrainerBySlug } from "@/lib/services/trainers";
import { notFound } from "next/navigation";
import { Profile } from "@/components/marketplace/profile";
import { trainers } from "@/data/trainers";
export const dynamicParams = false;
export function generateStaticParams() {
  return trainers.map((t) => ({ slug: t.slug }));
}
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const trainer = await getTrainerBySlug(slug);
  if (!trainer) notFound();
  return <Profile trainer={trainer} />;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const t = await getTrainerBySlug(slug);
  return {
    title: t
      ? t.firstName + " " + t.lastName + " — " + t.headline
      : "Trainer not found",
    description: t?.bio,
    alternates: { canonical: "/trainers/" + slug },
  };
}
