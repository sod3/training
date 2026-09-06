"use client";
import { createContext, useContext, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { api, useApi } from "@/lib/client-api";
type State = {
  saved: string[];
  compare: string[];
  role: string;
  name: string;
  unread: number;
  unreadMessages: number;
  emailVerified: boolean;
};
const initial: State = {
  saved: [],
  compare: [],
  role: "visitor",
  name: "",
  unread: 0,
  unreadMessages: 0,
  emailVerified: false,
};
const Context = createContext<{
  state: State;
  update: (patch: { compare?: string[] }) => void;
  notify: (text: string) => void;
  ready: boolean;
  refresh: () => void;
  toggleSaved: (id: string) => Promise<void>;
}>({
  state: initial,
  update: () => {},
  notify: () => {},
  ready: false,
  refresh: () => {},
  toggleSaved: async () => {},
});
export function StoreProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { data, reload, loading } = useApi<{
    user: { name: string; role: string; emailVerified: boolean } | null;
    saved: string[];
    unread: number;
    unreadMessages: number;
  }>("auth/me");
  const [compare, setCompare] = useState<string[]>([]);
  const [toast, setToast] = useState("");
  useEffect(() => {
    try {
      const ids = JSON.parse(sessionStorage.getItem("spotter-compare") || "[]");
      if (Array.isArray(ids))
        Promise.resolve().then(() =>
          setCompare(
            ids
              .filter((v) => typeof v === "string" && /^[a-f\d]{24}$/.test(v))
              .slice(0, 3),
          ),
        );
    } catch {}
  }, []);
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(""), 4500);
      return () => clearTimeout(timer);
    }
  }, [toast]);
  const state: State = {
    ...initial,
    compare,
    saved: data?.saved || [],
    name: data?.user?.name || "",
    role: data?.user?.role.toLowerCase() || "visitor",
    unread: data?.unread || 0,
    unreadMessages: data?.unreadMessages || 0,
    emailVerified: !!data?.user?.emailVerified,
  };
  async function toggleSaved(id: string) {
    if (!data?.user) {
      router.push(
        `/login?next=${encodeURIComponent(`${window.location.pathname}${window.location.search}`)}&save=${id}`,
      );
      return;
    }
    try {
      await api("favorites", {
        trainerId: id,
        saved: !state.saved.includes(id),
      });
      reload();
      setToast(
        state.saved.includes(id)
          ? "Trainer removed from favorites."
          : "Trainer saved.",
      );
    } catch (e) {
      setToast((e as Error).message);
    }
  }
  return (
    <Context.Provider
      value={{
        state,
        update: (patch) => {
          if (patch.compare) {
            setCompare(patch.compare);
            sessionStorage.setItem(
              "spotter-compare",
              JSON.stringify(patch.compare),
            );
          }
        },
        notify: setToast,
        ready: !loading,
        refresh: reload,
        toggleSaved,
      }}
    >
      {children}
      {toast && (
        <div className="toast" role="status">
          {toast}
          <button
            aria-label="Dismiss notification"
            onClick={() => setToast("")}
          >
            <X size={16} />
          </button>
        </div>
      )}
      {compare.length > 0 && (
        <div className="compare-tray">
          <span>
            <strong>{compare.length}/3</strong> trainers selected
          </span>
          <Link className="btn small" href="/compare">
            Compare trainers →
          </Link>
          <button
            aria-label="Clear comparison"
            onClick={() => {
              setCompare([]);
              sessionStorage.removeItem("spotter-compare");
            }}
          >
            <X size={18} />
          </button>
        </div>
      )}
    </Context.Provider>
  );
}
export const useStore = () => useContext(Context);
