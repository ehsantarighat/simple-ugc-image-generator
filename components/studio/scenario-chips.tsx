"use client";

import { cn } from "@/lib/utils";

export interface Scenario {
  id: string;
  title: string;
  prompt: string;
  hint?: string;
}

interface Props {
  scenarios: Scenario[];
  onPick: (s: Scenario) => void;
}

// Small chip row beneath the textarea. Clicking a chip auto-fills the prompt
// with the scenario's `prompt` text. Visible empty-state guidance for users
// who don't know what to type.
export function ScenarioChips({ scenarios, onPick }: Props) {
  if (scenarios.length === 0) return null;
  return (
    <div className="mt-3 flex flex-wrap justify-center gap-2">
      {scenarios.map((s) => (
        <button
          key={s.id}
          type="button"
          onClick={() => onPick(s)}
          title={s.hint ?? s.prompt}
          className={cn(
            "rounded-full border border-[var(--color-border)] px-3 py-1 text-xs",
            "text-[var(--color-muted-foreground)] transition-colors",
            "hover:border-[var(--color-foreground)] hover:bg-[var(--color-secondary)] hover:text-[var(--color-foreground)]"
          )}
        >
          {s.title}
        </button>
      ))}
    </div>
  );
}
