import { AuthForm } from "@/components/marketplace/auth-form";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ role?: string }>;
}) {
  return (
    <AuthForm
      signup
      initialRole={
        (await searchParams).role === "trainer" ? "trainer" : "customer"
      }
    />
  );
}
