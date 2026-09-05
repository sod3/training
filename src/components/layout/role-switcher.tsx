"use client";
import { useRouter } from "next/navigation";
import { useStore } from "@/components/marketplace/store";
export type AppRole = "visitor" | "customer" | "trainer" | "admin";
export function RoleSwitcher() {
  const { state, update } = useStore();
  const router = useRouter();
  if (process.env.NODE_ENV !== "development") return null;
  return (
    <label className="dev-role">
      <span className="sr-only">Demo role</span>
      <select
        value={state.role}
        onChange={(e) => {
          const role = e.target.value;
          update({ role });
          localStorage.setItem("app_role", role);
          router.push(
            role === "visitor"
              ? "/"
              : role === "admin"
                ? "/admin"
                : `/dashboard/${role}`,
          );
        }}
      >
        {["visitor", "customer", "trainer", "admin"].map((r) => (
          <option value={r} key={r}>
            Demo: {r}
          </option>
        ))}
      </select>
    </label>
  );
}
