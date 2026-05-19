"use client";

import * as React from "react";
import { ChevronDown, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

export type QualityPriority = "economy" | "balanced" | "premium" | "auto";

const LABELS: Record<QualityPriority, string> = {
  auto: "Auto",
  economy: "Economy",
  balanced: "Balanced",
  premium: "Premium",
};

const HINTS: Record<QualityPriority, string> = {
  auto: "Let the registry pick the best provider available.",
  economy: "Prefer cheaper standard-tier providers (Qwen, Gemini).",
  balanced: "Standard tier first, premium as fallback.",
  premium: "Premium tier first (GPT Image 2, Seedream).",
};

interface Props {
  value: QualityPriority;
  onChange: (v: QualityPriority) => void;
}

export function QualityPicker({ value, onChange }: Props) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] px-3 py-1 text-xs text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
      >
        <Zap className="h-3 w-3" />
        {LABELS[value]}
        <ChevronDown className="h-3 w-3" />
      </button>
      {open && (
        <div className="absolute right-0 top-9 z-50 w-56 rounded-lg border border-[var(--color-border)] bg-[var(--color-popover)] p-1.5 shadow-lg">
          <div className="px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-[var(--color-muted-foreground)]">
            Quality priority
          </div>
          {(["auto", "premium", "balanced", "economy"] as QualityPriority[]).map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => {
                onChange(q);
                setOpen(false);
              }}
              className={cn(
                "w-full rounded-md px-2 py-1.5 text-left text-sm transition-colors",
                q === value
                  ? "bg-[var(--color-secondary)] font-medium"
                  : "hover:bg-[var(--color-secondary)]/60"
              )}
            >
              <div>{LABELS[q]}</div>
              <div className="mt-0.5 text-[10px] text-[var(--color-muted-foreground)]">
                {HINTS[q]}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
