"use client";
import { createContext, useContext, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  X,
  CheckCircle,
  AlertTriangle,
  ShieldCheck,
  Info,
  HelpCircle,
} from "lucide-react";
import { api, useApi } from "@/lib/client-api";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

type State = {
  saved: string[];
  compare: string[];
  role: string;
  name: string;
  email: string;
  unread: number;
  unreadMessages: number;
  emailVerified: boolean;
};

const initial: State = {
  saved: [],
  compare: [],
  role: "visitor",
  name: "",
  email: "",
  unread: 0,
  unreadMessages: 0,
  emailVerified: false,
};

export type ConfirmOptions = {
  title?: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "lime" | "danger" | "primary" | "warning";
  icon?: "check" | "alert" | "shield" | "info" | "help";
};

export type ToastItem = {
  id: string;
  message: string;
  type?: "success" | "error" | "warning" | "info";
  title?: string;
};

const Context = createContext<{
  state: State;
  update: (patch: { compare?: string[] }) => void;
  notify: (
    text: string,
    type?: "success" | "error" | "warning" | "info",
    title?: string,
  ) => void;
  confirmModal: (options: ConfirmOptions) => Promise<boolean>;
  ready: boolean;
  refresh: () => void;
  toggleSaved: (id: string) => Promise<void>;
}>({
  state: initial,
  update: () => {},
  notify: () => {},
  confirmModal: async () => false,
  ready: false,
  refresh: () => {},
  toggleSaved: async () => {},
});

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { data, reload, loading } = useApi<{
    user: {
      name: string;
      email?: string;
      role: string;
      emailVerified: boolean;
    } | null;
    saved: string[];
    unread: number;
    unreadMessages: number;
  }>("auth/me");
  const [compare, setCompare] = useState<string[]>([]);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    options: ConfirmOptions;
    resolve?: (value: boolean) => void;
  }>({
    isOpen: false,
    options: { description: "" },
  });

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
    if (toasts.length === 0) return;
    const timer = setTimeout(() => {
      setToasts((prev) => prev.slice(1));
    }, 4500);
    return () => clearTimeout(timer);
  }, [toasts]);

  const notify = (
    message: string,
    type: "success" | "error" | "warning" | "info" = "info",
    title?: string,
  ) => {
    if (!message) return;
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev.slice(-4), { id, message, type, title }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const confirmModal = (options: ConfirmOptions): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      setConfirmState({
        isOpen: true,
        options: {
          title: options.title || "Confirm Action",
          confirmText: options.confirmText || "Confirm",
          cancelText: options.cancelText || "Cancel",
          variant: options.variant || "lime",
          icon: options.icon || "help",
          ...options,
        },
        resolve,
      });
    });
  };

  const handleConfirmResponse = (result: boolean) => {
    if (confirmState.resolve) {
      confirmState.resolve(result);
    }
    setConfirmState({ isOpen: false, options: { description: "" } });
  };

  const state: State = {
    ...initial,
    compare,
    saved: data?.saved || [],
    name: data?.user?.name || "",
    email: data?.user?.email || "",
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
      notify(
        state.saved.includes(id)
          ? "Trainer removed from favorites."
          : "Trainer saved.",
        "success",
      );
    } catch (e) {
      notify((e as Error).message, "error");
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
        notify,
        confirmModal,
        ready: !loading,
        refresh: reload,
        toggleSaved,
      }}
    >
      {children}

      {/* Confirmation Modal Overlay */}
      <Dialog
        open={confirmState.isOpen}
        onOpenChange={(open) => {
          if (!open) handleConfirmResponse(false);
        }}
      >
        <DialogContent className="spotter-modal-card" showCloseButton={false}>
          <div className="spotter-modal-header">
            <div
              className={`spotter-modal-icon-badge ${confirmState.options.variant || "lime"}`}
            >
              {confirmState.options.icon === "check" && (
                <CheckCircle size={22} />
              )}
              {confirmState.options.icon === "alert" && (
                <AlertTriangle size={22} />
              )}
              {confirmState.options.icon === "shield" && (
                <ShieldCheck size={22} />
              )}
              {confirmState.options.icon === "info" && <Info size={22} />}
              {(confirmState.options.icon === "help" ||
                !confirmState.options.icon) &&
                (confirmState.options.variant === "danger" ? (
                  <AlertTriangle size={22} />
                ) : (
                  <HelpCircle size={22} />
                ))}
            </div>
            <div className="spotter-modal-title-group">
              <DialogTitle id="spotter-modal-title">
                {confirmState.options.title || "Confirm Action"}
              </DialogTitle>
              <DialogDescription className="spotter-modal-description">
                {confirmState.options.description}
              </DialogDescription>
            </div>
          </div>
          <div className="spotter-modal-actions">
            <button
              type="button"
              className="btn outline small spotter-modal-cancel-btn"
              onClick={() => handleConfirmResponse(false)}
            >
              {confirmState.options.cancelText || "Cancel"}
            </button>
            <button
              type="button"
              className={`btn small spotter-modal-confirm-btn ${
                confirmState.options.variant === "danger"
                  ? "danger"
                  : confirmState.options.variant === "lime"
                    ? "lime"
                    : ""
              }`}
              autoFocus
              onClick={() => handleConfirmResponse(true)}
            >
              {confirmState.options.confirmText || "Confirm"}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Enhanced Toast System */}
      {toasts.length > 0 && (
        <div
          className="spotter-toast-container"
          role="region"
          aria-label="Notifications"
        >
          {toasts.map((t) => (
            <div
              key={t.id}
              className={`spotter-toast spotter-toast-${t.type || "info"}`}
              role="status"
            >
              <div className="spotter-toast-icon">
                {t.type === "success" && <CheckCircle size={18} />}
                {t.type === "error" && <AlertTriangle size={18} />}
                {t.type === "warning" && <AlertTriangle size={18} />}
                {t.type === "info" && <Info size={18} />}
              </div>
              <div className="spotter-toast-body">
                {t.title && (
                  <strong className="spotter-toast-title">{t.title}</strong>
                )}
                <p className="spotter-toast-message">{t.message}</p>
              </div>
              <button
                type="button"
                className="spotter-toast-close"
                aria-label="Dismiss notification"
                onClick={() => removeToast(t.id)}
              >
                <X size={15} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Compare Tray */}
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
