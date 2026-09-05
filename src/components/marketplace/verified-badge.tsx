"use client";
import { BadgeCheck } from "lucide-react";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverTitle,
  PopoverDescription,
} from "@/components/ui/popover";
export function VerifiedBadge({
  credentials = false,
  className = "",
}: {
  credentials?: boolean;
  className?: string;
}) {
  return (
    <Popover>
      <PopoverTrigger
        className={className + " verification-trigger"}
        aria-label={credentials ? "Verified · demo: about sample verification" : "Identity · demo: about sample verification"}
      >
        <BadgeCheck size={14} />{" "}
        {credentials ? "Verified · demo" : "Identity · demo"}
      </PopoverTrigger>
      <PopoverContent className="verification-content">
        <PopoverTitle>Spotter verification preview</PopoverTitle>
        <PopoverDescription>
          These are illustrative checks for a sample profile, not verification
          of a real person.
        </PopoverDescription>
        <p>
          Identity: sample confirmed status
          <br />
          Qualifications:{" "}
          {credentials ? "sample reviewed status" : "not reviewed"}
        </p>
      </PopoverContent>
    </Popover>
  );
}
