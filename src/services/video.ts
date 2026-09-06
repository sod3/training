import { randomBytes } from "node:crypto";

export type VideoProvider = "NONE" | "GOOGLE_MEET" | "ZOOM" | "MOCK";

export type MeetingContext = {
  trainerName: string;
  customerName: string;
  start: Date;
  end: Date;
  durationMinutes: number;
};

export type MeetingDetails = {
  videoProvider: VideoProvider;
  meetingId: string;
  meetingUrl: string;
  meetingStatus: "PENDING" | "CREATED" | "FAILED";
};

export async function createMeeting(
  provider: VideoProvider,
  context?: Partial<MeetingContext>,
): Promise<MeetingDetails> {
  // In a real implementation, this would call the respective provider's API.
  // For the initial production release, we use a mock/internal URL system
  // that can be upgraded later.
  
  const meetingId = randomBytes(16).toString("hex");
  
  if (provider === "GOOGLE_MEET") {
    // Generate a placeholder format for Google Meet
    const code = `${randomBytes(2).toString("hex")}-${randomBytes(2).toString("hex")}-${randomBytes(2).toString("hex")}`;
    return {
      videoProvider: "GOOGLE_MEET",
      meetingId,
      meetingUrl: `https://meet.google.com/${code}`,
      meetingStatus: "CREATED",
    };
  }

  // Fallback to MOCK provider which directs to our internal video room (if built)
  // or simply serves as a placeholder.
  return {
    videoProvider: "MOCK",
    meetingId,
    meetingUrl: `https://spotter.training/session/${meetingId}`,
    meetingStatus: "CREATED",
  };
}

export async function cancelMeeting(
  provider: VideoProvider,
  meetingId: string,
): Promise<void> {
  // Call provider API to cancel the meeting if necessary
}
