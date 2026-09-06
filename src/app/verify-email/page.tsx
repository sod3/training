import { AuthForm } from "@/components/marketplace/auth-form";
export const metadata = { robots: { index: false, follow: false } };
export default function Page() {
  return <AuthForm mode="verify-email" />;
}
