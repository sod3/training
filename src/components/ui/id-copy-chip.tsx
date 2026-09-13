"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { truncateId } from "@/lib/admin-formatters";

export function IdCopyChip({
  value,
  truncate = true,
  className = "",
}: {
  value: string;
  truncate?: boolean;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  if (!value) return null;

  const displayString = truncate ? truncateId(value) : value;

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback if clipboard API is blocked
    }
  };

  return (
    <span
      className={`id-copy-chip inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono bg-slate-100 dark:bg-zinc-800/80 text-slate-800 dark:text-zinc-200 border border-slate-200/80 dark:border-zinc-700/70 transition-colors group ${className}`}
      title={`Click to copy full string: ${value}`}
    >
      <span className="font-semibold tracking-tight">{displayString}</span>
      <button
        type="button"
        onClick={handleCopy}
        className="id-copy-btn p-0.5 rounded text-slate-400 hover:text-slate-700 dark:hover:text-zinc-100 transition-colors"
        aria-label={`Copy ${value}`}
      >
        {copied ? (
          <span className="text-emerald-600 dark:text-emerald-400 font-sans font-semibold text-[10px] flex items-center gap-0.5">
            <Check size={12} /> Copied
          </span>
        ) : (
          <Copy size={12} className="opacity-70 group-hover:opacity-100" />
        )}
      </button>
    </span>
  );
}
