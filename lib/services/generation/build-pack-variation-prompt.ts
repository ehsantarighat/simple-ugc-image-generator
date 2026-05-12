// ============================================================================
// build-pack-variation-prompt.ts
// Composes the prompt for pack_variation_generation: re-shoot an approved
// anchor into a new aspect ratio (and/or platform). The anchor goes first in
// the image attachment order.
// ============================================================================

import type { StructuredGenerationPayload } from "@/lib/services/generation/payload-schema";
import { buildTaskBlock } from "@/lib/services/generation/prompt-blocks/task-block";
import { buildReferenceBlock } from "@/lib/services/generation/prompt-blocks/reference-block";
import { buildSubjectModeBlock } from "@/lib/services/generation/prompt-blocks/subject-mode-block";
import { buildStyleModeBlock } from "@/lib/services/generation/prompt-blocks/style-mode-block";
import { buildModelPreservationBlock } from "@/lib/services/generation/prompt-blocks/model-preservation-block";
import { buildProductPreservationBlock } from "@/lib/services/generation/prompt-blocks/product-preservation-block";
import { buildRatioReframeBlock } from "@/lib/services/generation/prompt-blocks/ratio-reframe-block";
import { buildNegativeConstraintBlock } from "@/lib/services/generation/prompt-blocks/negative-constraints-block";
import { buildOutputIntentBlock } from "@/lib/services/generation/prompt-blocks/output-intent-block";

export interface BuildPackVariationPromptArgs {
  payload: StructuredGenerationPayload;
  modelImageCount: number;
  productImageCount: number;
}

export function buildPackVariationPrompt(args: BuildPackVariationPromptArgs): string {
  const { payload } = args;
  if (payload.mode !== "pack_variation_generation") {
    throw new Error(
      `buildPackVariationPrompt called with mode "${payload.mode}". Expected pack_variation_generation.`
    );
  }
  const isProductOnly = payload.subjectMode === "product_only";
  const targetRatio = payload.output.aspectRatio;

  const sections: string[] = [];
  sections.push(buildTaskBlock(payload.mode));
  sections.push("");
  sections.push(
    buildReferenceBlock({
      mode: payload.mode,
      hasSourceImage: true,
      modelImageCount: isProductOnly ? 0 : args.modelImageCount,
      productImageCount: args.productImageCount,
    })
  );
  sections.push("");
  sections.push(buildSubjectModeBlock(payload.subjectMode));
  sections.push("");
  sections.push(buildStyleModeBlock(payload.styleMode));

  if (!isProductOnly && payload.model) {
    sections.push("");
    sections.push(
      buildModelPreservationBlock({
        rules: payload.modelPreservation,
        model: payload.model,
      })
    );
  }

  sections.push("");
  sections.push(
    buildProductPreservationBlock({
      rules: payload.productPreservation,
      product: payload.product,
    })
  );

  sections.push("");
  sections.push(
    buildRatioReframeBlock({
      targetRatio,
      targetPlatform: payload.targetPlatform,
    })
  );

  sections.push("");
  sections.push(
    buildNegativeConstraintBlock({
      flags: payload.negativeConstraints,
      productCategory: payload.product.inferredCategory,
      productInteraction: payload.scene.productInteraction ?? "unspecified",
      shotType: payload.photography.shotType,
    })
  );
  sections.push("");
  sections.push(buildOutputIntentBlock("approved_style_variation"));
  return sections.join("\n");
}
