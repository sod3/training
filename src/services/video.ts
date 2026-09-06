/**
 * Video rooms are deliberately not auto-generated. A trainer may attach a real
 * HTTPS Google Meet, Zoom, or other private meeting link to a confirmed session.
 * This helper only classifies an already-created URL; it never fabricates one.
 */
export type VideoProvider = "NONE" | "GOOGLE_MEET" | "ZOOM" | "LINK";

export function classifyMeetingUrl(url: string): Exclude<VideoProvider, "NONE"> {
  const host = new URL(url).hostname.toLowerCase();
  if (host === "meet.google.com" || host.endsWith(".meet.google.com")) return "GOOGLE_MEET";
  if (host === "zoom.us" || host.endsWith(".zoom.us")) return "ZOOM";
  return "LINK";
}
