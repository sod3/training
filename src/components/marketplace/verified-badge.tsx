import { BadgeCheck } from "lucide-react";
export function VerifiedBadge({
  credentials = false,
  className = "",
}: {
  credentials?: boolean;
  className?: string;
}) {
  return (
    <span
      className={className}
      title={
        credentials
          ? "Professional credentials reviewed by Spotter"
          : "Identity documents reviewed by Spotter"
      }
    >
      <BadgeCheck size={14} />
      {credentials ? "Credentials verified" : "Identity verified"}
    </span>
  );
}
