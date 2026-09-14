/**
 * Professional label mapping and formatting utilities for Admin Panel UI.
 */

const FIELD_LABEL_MAP: Record<string, string> = {
  _id: "ID",
  id: "ID",
  bookingNumber: "Booking Number",
  booking_number: "Booking Number",
  customerId: "Customer ID",
  customer_id: "Customer ID",
  trainerId: "Trainer ID",
  trainer_id: "Trainer ID",
  packageId: "Package ID",
  package_id: "Package ID",
  createdAt: "Created At",
  created_at: "Created At",
  updatedAt: "Updated At",
  updated_at: "Updated At",
  remainingSessions: "Remaining Sessions",
  remaining_sessions: "Remaining Sessions",
  sessionCount: "Session Count",
  sessionDuration: "Session Duration",
  videoProvider: "Video Provider",
  video_provider: "Video Provider",
  bookingStatus: "Booking Status",
  booking_status: "Booking Status",
  paymentStatus: "Payment Status",
  payment_status: "Payment Status",
  status: "Status",
  total: "Total Amount",
  amount: "Amount",
  price: "Price",
  currency: "Currency",
  timezone: "Timezone",
  cnicUploadId: "CNIC Document ID",
  proofUploadId: "Payment Proof ID",
  uploadId: "Document ID",
  platformFee: "Platform Fee",
  trainerAmount: "Trainer Share",
  cancellationReason: "Cancellation Reason",
  cancellationWindowHours: "Cancellation Window (Hours)",
  meetingUrl: "Session Video Link",
  availabilityReviewStatus: "Availability Review Status",
  availabilityReviewNotes: "Availability Notes",
  identityVerificationStatus: "Identity Verification",
  credentialVerificationStatus: "Credential Verification",
  applicationStatus: "Application Status",
  normalizedEmail: "Email Address",
  phone: "Phone Number",
  displayName: "Display Name",
  firstName: "First Name",
  lastName: "Last Name",
  headline: "Headline",
  biography: "Biography",
  yearsExperience: "Years of Experience",
  category: "Category",
  specialties: "Specialties",
  trialPackage: "Trial Package",
  profileVisibility: "Profile Visibility",
  featured: "Featured Trainer",
  sortOrder: "Display Order",
  start: "Start Time",
  end: "End Time",
  trialEligible: "Trial Eligible",
  kind: "Exception Type",
  reason: "Reason",
  reference: "Transfer Reference",
  subject: "Subject",
  action: "Action",
  ip: "IP Address",
  userAgent: "User Agent",
  decision: "Review Decision",
  notes: "Notes / Reason",
  name: "Name",
  slug: "Slug",
  body: "Body Text",
  active: "Active Status",
};

const ACRONYMS: Record<string, string> = {
  id: "ID",
  cnic: "CNIC",
  url: "URL",
  faq: "FAQ",
  pkr: "PKR",
  iana: "IANA",
  bps: "BPS",
  ip: "IP",
};

/**
 * Transforms any raw schema key (camelCase, snake_case, mixed) into a clean, professional Title Case label.
 */
export function formatFieldLabel(key: string): string {
  if (!key) return "";
  if (FIELD_LABEL_MAP[key]) {
    return FIELD_LABEL_MAP[key];
  }

  // Handle keys that might already have spaces like "customer Id" or "created At"
  const normalized = key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return normalized
    .split(" ")
    .map((word) => {
      const lower = word.toLowerCase();
      if (ACRONYMS[lower]) {
        return ACRONYMS[lower];
      }
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}

/**
 * Checks if a key represents an ID field or if a string value is an ObjectID/Hash.
 */
export function isIdKey(key: string): boolean {
  const k = key.toLowerCase();
  return (
    k === "_id" ||
    k === "id" ||
    k.endsWith("id") ||
    k.endsWith("_id") ||
    k === "bookingnumber" ||
    k === "uploadid" ||
    k === "proofuploadid" ||
    k === "cnicuploadid"
  );
}

/**
 * Checks if a string value is a long MongoDB ObjectId (24 hex chars) or Booking Code.
 */
export function isLongIdValue(value: unknown): boolean {
  if (typeof value !== "string") return false;
  const str = value.trim();
  // Mongo ObjectId is 24 hex characters
  if (/^[a-fA-F0-9]{24}$/.test(str)) return true;
  // Booking code like SPT-6AA671705D53769896969D2D
  if (/^SPT-[a-fA-F0-9]{20,}$/i.test(str)) return true;
  return false;
}

/**
 * Truncates long ID strings for clean UI presentation.
 * e.g. "6aa670fa5d53769896969d25" => "6aa670fa…9d25"
 * e.g. "SPT-6AA671705D53769896969D2D" => "SPT-6AA6…9D2D"
 */
export function truncateId(idString: string, prefixLen = 8, suffixLen = 4): string {
  if (!idString || idString.length <= prefixLen + suffixLen + 3) {
    return idString;
  }
  return `${idString.slice(0, prefixLen)}…${idString.slice(-suffixLen)}`;
}

/**
 * Formats a session's start and end timestamps into a clean, compact date and time range.
 * Avoids redundant date repetition when start and end fall on the same day.
 * e.g. Same day: { dateStr: "Sat, Sep 19, 2026", timeStr: "9:00 AM – 10:00 AM", fullStr: "Sat, Sep 19, 2026 · 9:00 AM – 10:00 AM" }
 */
export function formatSessionDateTime(
  startRaw: unknown,
  endRaw?: unknown,
): { dateStr: string; timeStr: string; fullStr: string } {
  if (!startRaw) {
    return { dateStr: "—", timeStr: "—", fullStr: "—" };
  }
  try {
    const startDate = new Date(String(startRaw));
    if (isNaN(startDate.getTime())) {
      return { dateStr: "—", timeStr: "—", fullStr: "—" };
    }

    const dateStr = startDate.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });

    const startTimeStr = startDate.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

    if (!endRaw) {
      return {
        dateStr,
        timeStr: startTimeStr,
        fullStr: `${dateStr} · ${startTimeStr}`,
      };
    }

    const endDate = new Date(String(endRaw));
    if (isNaN(endDate.getTime())) {
      return {
        dateStr,
        timeStr: startTimeStr,
        fullStr: `${dateStr} · ${startTimeStr}`,
      };
    }

    const endTimeStr = endDate.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

    const isSameDay =
      startDate.getFullYear() === endDate.getFullYear() &&
      startDate.getMonth() === endDate.getMonth() &&
      startDate.getDate() === endDate.getDate();

    if (isSameDay) {
      const timeStr = `${startTimeStr} – ${endTimeStr}`;
      return {
        dateStr,
        timeStr,
        fullStr: `${dateStr} · ${timeStr}`,
      };
    } else {
      const endDateStr = endDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
      const fullStr = `${dateStr}, ${startTimeStr} – ${endDateStr}, ${endTimeStr}`;
      return {
        dateStr: `${dateStr} – ${endDateStr}`,
        timeStr: `${startTimeStr} – ${endTimeStr}`,
        fullStr,
      };
    }
  } catch {
    return { dateStr: "—", timeStr: "—", fullStr: "—" };
  }
}

