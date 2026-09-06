import { AuthForm } from "@/components/marketplace/auth-form";
export const metadata = {
  title: "Administrator sign in",
  robots: { index: false, follow: false },
};
export default function Page() {
  return <AuthForm />;
}
