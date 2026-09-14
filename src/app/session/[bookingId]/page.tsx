"use client";

import { useEffect, useRef, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Shield,
  ArrowLeft,
  AlertTriangle,
  Clock,
  CheckCircle2,
  RefreshCw,
  UserCheck,
  PhoneOff,
  ExternalLink,
} from "lucide-react";
import DailyIframe, { DailyCall } from "@daily-co/daily-js";

interface SessionData {
  token: string;
  roomUrl: string;
  roomName: string;
  isOwner: boolean;
  session: {
    id: string;
    orderId: string;
    bookingNumber: string;
    sessionNumber: number;
    start: string;
    end: string;
    trainerName: string;
    customerName: string;
    packageName: string;
  };
}

export default function SessionPage({
  params,
}: {
  params: Promise<{ bookingId: string }>;
}) {
  const { bookingId } = use(params);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<SessionData | null>(null);

  const [callState, setCallState] = useState<"IDLE" | "JOINING" | "JOINED" | "LEFT">("IDLE");
  const [permError, setPermError] = useState<string | null>(null);
  const [callError, setCallError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const callFrameRef = useRef<DailyCall | null>(null);

  // Fetch access token & session verification from server
  const fetchSessionAccess = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/session/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || json.message || "Failed to join video session.");
      }

      setData(json);
    } catch (err: any) {
      setError(err?.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessionAccess();
  }, [bookingId]);

  // Embed Daily Prebuilt widget once data is ready and container is mounted
  useEffect(() => {
    if (!data || !containerRef.current || callFrameRef.current) return;

    setCallState("JOINING");

    try {
      const callFrame = DailyIframe.createFrame(containerRef.current, {
        iframeStyle: {
          width: "100%",
          height: "100%",
          border: "0",
          borderRadius: "16px",
          backgroundColor: "#0f172a",
          minHeight: "100%",
        },
        showLeaveButton: true,
        showFullscreenButton: true,
        theme: {
          colors: {
            accent: "#38bdf8",
            mainAreaBg: "#0f172a",
            background: "#1e293b",
          },
        },

      });

      callFrameRef.current = callFrame;

      callFrame.on("joining-meeting", () => setCallState("JOINING"));
      callFrame.on("joined-meeting", () => setCallState("JOINED"));
      callFrame.on("left-meeting", () => {
        setCallState("LEFT");
        if (callFrameRef.current) {
          callFrameRef.current.destroy().catch(() => {});
          callFrameRef.current = null;
        }
      });
      callFrame.on("error", (e: any) => {
        console.error("[Daily Frame Error]", e);
        setCallError(e?.errorMsg || "A video call connection error occurred.");
      });
      callFrame.on("camera-error", (e: any) => {
        console.warn("[Daily Camera Error]", e);
        setPermError(
          "Camera or microphone permission was denied. Please allow camera and microphone access in your browser site settings.",
        );
      });

      callFrame
        .join({
          url: data.roomUrl,
          token: data.token,
        })
        .catch((err: any) => {
          console.error("[Daily Join Error]", err);
          setCallError(err?.message || "Failed to connect to the Daily room.");
          setCallState("IDLE");
        });
    } catch (err: any) {
      console.error("[Daily Frame Creation Error]", err);
      setCallError(err?.message || "Failed to initialize Daily video player.");
      setCallState("IDLE");
    }

    return () => {
      if (callFrameRef.current) {
        callFrameRef.current.destroy().catch(() => {});
        callFrameRef.current = null;
      }
    };
  }, [data]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-sky-500 selection:text-white">
      {/* Top Header Bar */}
      <header className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 py-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
            title="Back to Dashboard"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-sky-400">
                SPOTTER LIVE
              </span>
              {data?.isOwner !== undefined && (
                <span
                  className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                    data.isOwner
                      ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                      : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                  }`}
                >
                  {data.isOwner ? "Host (Trainer)" : "Client"}
                </span>
              )}
            </div>
            <h1 className="text-sm sm:text-base font-bold text-white truncate max-w-[200px] sm:max-w-xs">
              {data?.session?.packageName || "Live Coaching Session"}
            </h1>
          </div>
        </div>

        {data?.session && (
          <div className="hidden md:flex items-center gap-4 text-xs">
            <div className="bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700/60 flex items-center gap-2">
              <UserCheck size={14} className="text-sky-400" />
              <span>
                <strong className="text-slate-300">Trainer:</strong>{" "}
                {data.session.trainerName}
              </span>
            </div>
            <div className="bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700/60 flex items-center gap-2">
              <Shield size={14} className="text-emerald-400" />
              <span>
                <strong className="text-slate-300">Client:</strong>{" "}
                {data.session.customerName}
              </span>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2">
          {callState === "JOINED" && (
            <button
              onClick={() => {
                if (callFrameRef.current) {
                  callFrameRef.current.leave();
                }
              }}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/40 transition-colors flex items-center gap-1.5"
            >
              <PhoneOff size={14} /> Leave
            </button>
          )}
          <Link
            href="/dashboard"
            className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
          >
            Dashboard
          </Link>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col p-2 sm:p-4 md:p-6 max-w-7xl mx-auto w-full">
        {/* Loading State */}
        {loading && (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center min-h-[400px]">
            <div className="relative mb-6">
              <div className="w-16 h-16 rounded-full border-4 border-slate-800 border-t-sky-400 animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center text-sky-400">
                <Video size={24} />
              </div>
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Connecting to SPOTTER Video</h2>
            <p className="text-sm text-slate-400 max-w-md">
              Verifying session access, confirming authorization, and obtaining Daily meeting credentials...
            </p>
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-lg mx-auto">
            <div className="p-4 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 mb-4">
              <AlertTriangle size={32} />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Unable to Join Session</h2>
            <p className="text-sm text-slate-300 bg-slate-900 p-4 rounded-xl border border-slate-800 mb-6 text-left w-full">
              {error}
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <button
                onClick={fetchSessionAccess}
                className="px-5 py-2.5 rounded-xl font-bold text-sm bg-sky-500 hover:bg-sky-400 text-white transition-all flex items-center gap-2"
              >
                <RefreshCw size={16} /> Try Again
              </button>
              <Link
                href="/dashboard"
                className="px-5 py-2.5 rounded-xl font-bold text-sm bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all"
              >
                Return to Dashboard
              </Link>
            </div>
          </div>
        )}

        {/* Call Permission Error Alert Banner */}
        {permError && (
          <div className="mb-4 p-4 rounded-xl bg-amber-950/80 border border-amber-600/50 text-amber-200 flex items-start gap-3 text-sm animate-fade-in">
            <AlertTriangle size={20} className="text-amber-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <strong className="block font-bold mb-0.5">Media Access Notice:</strong>
              <span>{permError}</span>
            </div>
            <button
              onClick={() => setPermError(null)}
              className="text-amber-400 hover:text-amber-200 text-xs font-bold uppercase tracking-wider"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Call General Error Alert Banner */}
        {callError && (
          <div className="mb-4 p-4 rounded-xl bg-red-950/80 border border-red-600/50 text-red-200 flex items-start gap-3 text-sm animate-fade-in">
            <AlertTriangle size={20} className="text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <strong className="block font-bold mb-0.5">Call Connection Error:</strong>
              <span>{callError}</span>
            </div>
            <button
              onClick={() => setCallError(null)}
              className="text-red-400 hover:text-red-200 text-xs font-bold uppercase tracking-wider"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Active Call / Video Container */}
        {!loading && !error && data && callState !== "LEFT" && (
          <div className="flex-1 flex flex-col min-h-[500px] sm:min-h-[600px] h-[calc(100vh-120px)] bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden relative shadow-2xl">
            {callState === "JOINING" && (
              <div className="absolute inset-0 z-10 bg-slate-900/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
                <div className="w-12 h-12 rounded-full border-4 border-slate-700 border-t-sky-400 animate-spin mb-4" />
                <h3 className="text-lg font-bold text-white mb-1">Joining Video Room</h3>
                <p className="text-xs text-slate-400">
                  Setting up camera, microphone, and encryption...
                </p>
              </div>
            )}

            {/* Daily Prebuilt Target Mount Point */}
            <div ref={containerRef} className="w-full h-full flex-1 min-h-[500px]" />
          </div>
        )}

        {/* Post Call / Left Session View */}
        {!loading && callState === "LEFT" && (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center max-w-md mx-auto my-auto">
            <div className="p-4 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-4">
              <CheckCircle2 size={36} />
            </div>
            <h2 className="text-2xl font-extrabold text-white mb-2">Session Ended</h2>
            <p className="text-sm text-slate-400 mb-6">
              Thank you for training on SPOTTER. Your live session has concluded.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 w-full">
              <Link
                href="/dashboard"
                className="flex-1 px-5 py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white transition-all text-center shadow-lg shadow-sky-500/20"
              >
                Back to Dashboard
              </Link>
              <button
                onClick={() => window.location.reload()}
                className="px-5 py-3 rounded-xl font-bold text-sm bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all"
              >
                Re-join Session
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
