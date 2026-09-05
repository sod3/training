import { AuthForm } from "@/components/marketplace/auth-form";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ role?: string }>;
}) {
  const role = (await searchParams).role;
  return (
    <AuthForm
      initialRole={
        role && ["customer", "trainer", "admin"].includes(role)
          ? role
          : "customer"
      }
    />
  );
}
