import { redirect } from "next/navigation";
import { requirePage, homeFor } from "@/lib/server/security";
export const metadata = { robots: { index: false, follow: false } };
export default async function Page() {
  const user = await requirePage();
  redirect(
    user.role === "CUSTOMER" ? "/dashboard/customer" : homeFor(user.role),
  );
}
