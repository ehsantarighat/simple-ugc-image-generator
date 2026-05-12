// ============================================================================
// aspect-ratio-size-map.ts
// Maps user-selected aspect ratios to GPT Image 2 pixel dimensions.
// All dimensions are divisible by 16, as required by the model.
// ============================================================================

import type { OutputAspectRatio } from "@/lib/services/generation/payload-schema";

export const ASPECT_RATIO_SIZE_MAP: Record<OutputAspectRatio, string> = {
  "1:1": "1024x1024",
  "4:5": "1024x1280",
  "9:16": "1024x1824",
  "16:9": "1824x1024",
};

export function aspectRatioToSize(ratio: OutputAspectRatio): string {
  return ASPECT_RATIO_SIZE_MAP[ratio];
}

export function isValidGptImage2Size(size: string): boolean {
  // Format: WIDTHxHEIGHT
  const match = /^(\d+)x(\d+)$/.exec(size);
  if (!match) return false;
  const w = Number(match[1]);
  const h = Number(match[2]);
  if (!Number.isFinite(w) || !Number.isFinite(h)) return false;
  // Must be divisible by 16.
  if (w % 16 !== 0 || h % 16 !== 0) return false;
  // Must be in a sane range.
  if (w < 256 || h < 256 || w > 4096 || h > 4096) return false;
  return true;
}

// GPT Image 2 is documented to support "auto" and "opaque" backgrounds. We
// explicitly disallow "transparent" — see spec section 2.3.
export type ValidBackground = "auto" | "opaque";
const VALID_BACKGROUNDS: readonly ValidBackground[] = ["auto", "opaque"] as const;

export function isValidGptImage2Background(value: unknown): value is ValidBackground {
  return typeof value === "string" && (VALID_BACKGROUNDS as readonly string[]).includes(value);
}
