// ============================================================================
// build-variation-prompt.ts
// Composes the variation prompt for Mode C (approved_style_variation).
// ============================================================================

import type { StructuredGenerationPayload } from "@/lib/services/generation/payload-schema";
import { buildTaskBlock } from "@/lib/services/generation/prompt-blocks/task-block";
import { buildReferenceBlock } from "@/lib/services/generation/prompt-blocks/reference-block";
import { buildModelPreservationBlock } from "@/lib/services/generation/prompt-blocks/model-preservation-block";
import { buildProductPreservationBlock } from "@/lib/services/generation/prompt-blocks/product-preservation-block";
import {
  buildVariationAvoidBlock,
  buildVariationConsistencyBlock,
  buildVariationGoalBlock,
} from "@/lib/services/generation/prompt-blocks/approved-variation-block";
import { buildNegativeConstraintBlock } from "@/lib/services/generation/prompt-blocks/negative-constraints-block";
import { buildOutputIntentBlock } from "@/lib/services/generation/prompt-blocks/output-intent-block";

export interface BuildVariationPromptArgs {
  payload: StructuredGenerationPayload;
  variationRequest?: string | null;
  modelImageCount: number;
  productImageCount: number;
}

export function buildVariationPrompt(args: BuildVariationPromptArgs): string {
  const { payload } = args;
  const sections = [
    buildTaskBlock("approved_style_variation"),
    "",
    buildReferenceBlock({
      mode: "approved_style_variation",
      hasSourceImage: true,
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
    buildVariationGoalBlock(args.variationRequest),
    "",
    buildVariationConsistencyBlock(),
    "",
    buildVariationAvoidBlock(),
    "",
    buildNegativeConstraintBlock({
      flags: payload.negativeConstraints,
      productCategory: payload.product.inferredCategory,
      productInteraction: payload.scene.productInteraction ?? "unspecified",
      shotType: payload.photography.shotType,
    }),
    "",
    buildOutputIntentBlock("approved_style_variation"),
  ];
  return sections.join("\n");
}
