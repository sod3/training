import { redirect } from "next/navigation";
import { requirePage } from "@/lib/server/security";
export const metadata = { robots: { index: false, follow: false } };
export default async function Page({
  params,
}: {
  params: Promise<{ section?: string[] }>;
}) {
  await requirePage("TRAINER");
  const section = (await params).section;
  redirect(`/trainer${section?.length ? `/${section.join("/")}` : ""}`);
}
