"use client";
import { createContext, useContext, useEffect, useState } from "react";
import Link from "next/link";
import { Check, X } from "lucide-react";
export type Booking = {
  id: string;
  trainerId: string;
  packageId: string;
  date: string;
  time: string;
  type: string;
  address: string;
  name: string;
  price: number;
  status: string;
  completedSessions?: number;
};
type State = {
  saved: string[];
  compare: string[];
  bookings: Booking[];
  messages: { trainerId: string; text: string }[];
  role: string;
  name: string;
  applications: {
    name: string;
    specialty: string;
    status: string;
    email?: string;
    qualifications?: string;
    location?: string;
    availability?: string;
    bio?: string;
    documentName?: string;
  }[];
  progress: { date: string; weight: number }[];
  goal: string;
  reviews: { bookingId: string; rating: number; text: string }[];
};
const initial: State = {
  saved: [],
  compare: [],
  bookings: [],
  messages: [],
  role: "visitor",
  name: "",
  applications: [],
  progress: [],
  goal: "Build strength",
  reviews: [],
};
const Context = createContext<{
  state: State;
  update: (patch: Partial<State>) => void;
  notify: (text: string) => void;
  ready: boolean;
}>({ state: initial, update: () => {}, notify: () => {}, ready: false });
export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState(initial);
  const [ready, setReady] = useState(false);
  const [toast, setToast] = useState("");
  // Hydrate browser-only demo persistence after SSR; the initial server and client snapshots match.
  /* eslint-disable react-hooks/set-state-in-effect -- Restore browser persistence after the identical SSR snapshot. */
  useEffect(() => {
    try {
      const saved = localStorage.getItem("spotter-state");
      if (saved) setState({ ...initial, ...JSON.parse(saved) });
    } catch {}
    setReady(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (ready) {
      try {
        localStorage.setItem("spotter-state", JSON.stringify(state));
      } catch {}
    }
  }, [state, ready]);
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(""), 3200);
      return () => clearTimeout(timer);
    }
  }, [toast]);
  return (
      <Context.Provider
        value={{
          state,
          update: (patch) => setState((s) => ({ ...s, ...patch })),
          notify: setToast,
          ready,
        }}
      >
        {children}
        {toast && (
          <div className="toast" role="status">
            <Check size={18} />
            {toast}
            <button
              aria-label="Dismiss notification"
              onClick={() => setToast("")}
            >
              <X size={16} />
            </button>
          </div>
        )}
        {state.compare.length > 0 && (
          <div className="compare-tray">
            <span>
              <strong>{state.compare.length}/3</strong> trainers selected
            </span>
            <Link className="btn small" href="/compare">
              Compare trainers →
            </Link>
            <button
              aria-label="Clear comparison"
              onClick={() => setState((s) => ({ ...s, compare: [] }))}
            >
              <X size={18} />
            </button>
          </div>
        )}
      </Context.Provider>
  );
}
export const useStore = () => useContext(Context);
