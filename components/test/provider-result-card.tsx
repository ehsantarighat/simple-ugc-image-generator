"use client";

import { AlertTriangle, Check, Cpu, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SignedClientImage } from "@/components/generation/signed-client-image";
import { cn } from "@/lib/utils";

export type ProviderTier = "economy" | "standard" | "premium";

export interface ProviderInfo {
  id: string;
  tier: ProviderTier;
  family: string;
  maxReferenceImages: number;
  notes?: string | null;
}

export type ResultState =
  | { status: "idle" }
  | { status: "running" }
  | {
      status: "ok";
      storagePath: string;
      durationMs: number;
      providerInfoId?: string;
    }
  | { status: "error"; error: string; durationMs?: number };

interface Props {
  info: ProviderInfo;
  state: ResultState;
}

export function ProviderResultCard({ info, state }: Props) {
  const tierColor: Record<ProviderTier, string> = {
    premium: "bg-amber-50 text-amber-900 border-amber-200",
    standard: "bg-sky-50 text-sky-900 border-sky-200",
    economy: "bg-emerald-50 text-emerald-900 border-emerald-200",
  };

  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-sm transition-shadow",
        state.status === "ok" && "hover:shadow-md"
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 px-4 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-sm font-medium">
            <Cpu className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{info.id}</span>
          </div>
          <div className="mt-0.5 text-[10px] uppercase tracking-wider text-[var(--color-muted-foreground)]">
            {info.family} · max {info.maxReferenceImages} ref
            {info.maxReferenceImages === 1 ? "" : "s"}
          </div>
        </div>
        <Badge variant="outline" className={cn("text-[10px]", tierColor[info.tier])}>
          {info.tier}
        </Badge>
      </div>

      {/* Image / state */}
      <div className="relative aspect-square w-full overflow-hidden bg-[var(--color-secondary)]">
        {state.status === "idle" && (
          <div className="grid h-full place-items-center text-xs text-[var(--color-muted-foreground)]">
            Ready
          </div>
        )}
        {state.status === "running" && (
          <div className="grid h-full place-items-center gap-2 text-xs text-[var(--color-muted-foreground)]">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Generating…</span>
          </div>
        )}
        {state.status === "ok" && (
          <SignedClientImage path={state.storagePath} />
        )}
        {state.status === "error" && (
          <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center text-xs text-[var(--color-destructive)]">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <div className="max-h-32 overflow-auto break-words">
              {state.error}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-2 text-[11px] text-[var(--color-muted-foreground)]">
        {state.status === "ok" ? (
          <>
            <span className="flex items-center gap-1">
              <Check className="h-3 w-3 text-green-600" />
              Success
            </span>
            <span>{(state.durationMs / 1000).toFixed(1)}s</span>
          </>
        ) : state.status === "error" ? (
          <>
            <span className="text-[var(--color-destructive)]">Failed</span>
            {state.durationMs !== undefined && (
              <span>{(state.durationMs / 1000).toFixed(1)}s</span>
            )}
          </>
        ) : state.status === "running" ? (
          <span>Up to 90s</span>
        ) : (
          <span>Click Run to start</span>
        )}
      </div>
    </div>
  );
}
