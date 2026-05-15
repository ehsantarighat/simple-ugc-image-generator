// ============================================================================
// openai-image-edit.ts
// Backward-compatible shim. Existing services call into here; the actual
// routing now flows through provider-routing-service.ts so we can layer in
// Seedream/Qwen/FLUX/Gemini etc. without touching any caller.
// ============================================================================

import "server-only";

import type { Uploadable } from "openai/uploads";
import { routeAndGenerate } from "@/lib/services/providers/provider-routing-service";
import type {
  OutputSpecification,
  QualityPriority,
} from "@/lib/services/generation/payload-schema";

export interface ImageEditCallArgs {
  model: string;
  prompt: string;
  images: Uploadable[];
  output: OutputSpecification;
  moderation?: "auto" | "low";
  qualityPriority?: QualityPriority;
  preferredProviderId?: string;
}

export interface ImageEditResult {
  images: Buffer[];
  providerId?: string;
  routingReason?: string;
}

export async function callOpenAIImageEdit(
  args: ImageEditCallArgs
): Promise<ImageEditResult> {
  const { result, providerId, routingReason } = await routeAndGenerate({
    qualityPriority: args.qualityPriority,
    preferredProviderId: args.preferredProviderId,
    call: {
      prompt: args.prompt,
      references: args.images,
      output: args.output,
      qualityPriority: args.qualityPriority,
    },
  });
  return {
    images: result.images,
    providerId,
    routingReason,
  };
}
