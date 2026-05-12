// ============================================================================
// build-generation-prompt.ts
// Composes the final natural-language prompt for Mode A
// (ugc_composite_generation) by stitching the prompt blocks.
// ============================================================================

import type { StructuredGenerationPayload } from "@/lib/services/generation/payload-schema";
import { buildTaskBlock } from "@/lib/services/generation/prompt-blocks/task-block";
import { buildReferenceBlock } from "@/lib/services/generation/prompt-blocks/reference-block";
import { buildModelPreservationBlock } from "@/lib/services/generation/prompt-blocks/model-preservation-block";
import { buildProductPreservationBlock } from "@/lib/services/generation/prompt-blocks/product-preservation-block";
import { buildSceneBlock } from "@/lib/services/generation/prompt-blocks/scene-block";
import { buildPhotographyBlock } from "@/lib/services/generation/prompt-blocks/photography-block";
import { buildAuthenticityBlock } from "@/lib/services/generation/prompt-blocks/authenticity-block";
import {
  buildCompositionPriorityBlock,
  buildRealismBlock,
} from "@/lib/services/generation/prompt-blocks/realism-block";
import { buildNegativeConstraintBlock } from "@/lib/services/generation/prompt-blocks/negative-constraints-block";
import { buildOutputIntentBlock } from "@/lib/services/generation/prompt-blocks/output-intent-block";

export interface BuildGenerationPromptArgs {
  payload: StructuredGenerationPayload;
  modelImageCount: number;
  productImageCount: number;
}

export function buildGenerationPrompt(args: BuildGenerationPromptArgs): string {
  const { payload } = args;
  const sections = [
    buildTaskBlock("ugc_composite_generation"),
    "",
    buildReferenceBlock({
      mode: "ugc_composite_generation",
      hasSourceImage: false,
      modelImageCount: args.modelImageCount,
      productImageCount: args.productImageCount,
    }),
    "",
    buildModelPreservationBlock({
      rules: payload.modelPreservation,
      model: payload.model,
    }),
    "",
    buildProductPreservationBlock({
      rules: payload.productPreservation,
      product: payload.product,
    }),
    "",
    buildSceneBlock(payload.scene),
    "",
    buildPhotographyBlock(payload.photography),
    "",
    buildAuthenticityBlock(payload.photography),
    "",
    buildRealismBlock(),
    "",
    buildCompositionPriorityBlock(),
    "",
    buildNegativeConstraintBlock({
      flags: payload.negativeConstraints,
      productCategory: payload.product.inferredCategory,
      productInteraction: payload.scene.productInteraction ?? "unspecified",
      shotType: payload.photography.shotType,
    }),
    "",
    buildOutputIntentBlock("ugc_composite_generation"),
  ];
  return sections.join("\n");
}
