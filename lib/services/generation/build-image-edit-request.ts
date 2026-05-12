// ============================================================================
// build-image-edit-request.ts
// Builds the parameter object for `openai.images.edit`. Validates output
// settings and refuses unsafe ones (e.g. transparent background).
// ============================================================================

import type { Uploadable } from "openai/uploads";
import type { OutputSpecification } from "@/lib/services/generation/payload-schema";
import {
  isValidGptImage2Background,
  isValidGptImage2Size,
} from "@/lib/services/generation/aspect-ratio-size-map";

export interface GptImage2EditRequest {
  model: string;
  image: Uploadable[];
  prompt: string;
  n: number;
  size: string;
  quality: "low" | "medium" | "high";
  output_format: "png" | "jpeg" | "webp";
  background: "auto" | "opaque";
  moderation: "auto" | "low";
}

export function buildImageEditRequest(args: {
  model: string;
  prompt: string;
  images: Uploadable[];
  output: OutputSpecification;
  moderation?: "auto" | "low";
}): GptImage2EditRequest {
  if (!isValidGptImage2Size(args.output.size)) {
    throw new Error(`Invalid GPT Image 2 size: ${args.output.size}`);
  }
  if (!isValidGptImage2Background(args.output.background)) {
    throw new Error(
      `Invalid GPT Image 2 background: ${args.output.background}. Must be "auto" or "opaque".`
    );
  }
  if (args.images.length === 0) {
    throw new Error("At least one reference image is required for image edit.");
  }
  if (args.images.length > 16) {
    throw new Error(`Too many reference images: ${args.images.length}. Max 16.`);
  }

  return {
    model: args.model,
    image: args.images,
    prompt: args.prompt,
    n: Math.max(1, Math.min(4, args.output.numberOfVariations)),
    size: args.output.size,
    quality: args.output.quality,
    output_format: args.output.outputFormat,
    background: args.output.background,
    moderation: args.moderation ?? "auto",
  };
}
