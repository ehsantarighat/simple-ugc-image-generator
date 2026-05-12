// ============================================================================
// build-refinement-prompt.ts
// Composes the refinement prompt for Mode B (image_refinement).
// Preserves the selected image unless the user explicitly asks for a major
// change, and layers intent-specific instructions if recognized.
// ============================================================================

import type { StructuredGenerationPayload } from "@/lib/services/generation/payload-schema";
import { buildTaskBlock } from "@/lib/services/generation/prompt-blocks/task-block";
import { buildReferenceBlock } from "@/lib/services/generation/prompt-blocks/reference-block";
import { buildModelPreservationBlock } from "@/lib/services/generation/prompt-blocks/model-preservation-block";
import { buildProductPreservationBlock } from "@/lib/services/generation/prompt-blocks/product-preservation-block";
import {
  buildRefinementInstructionBlock,
  buildRefinementPreservationBlock,
  buildRefinementRealismBlock,
  classifyRefinementIntent,
} from "@/lib/services/generation/prompt-blocks/refinement-block";
import { buildNegativeConstraintBlock } from "@/lib/services/generation/prompt-blocks/negative-constraints-block";
import { buildOutputIntentBlock } from "@/lib/services/generation/prompt-blocks/output-intent-block";

export interface BuildRefinementPromptArgs {
  payload: StructuredGenerationPayload;
  refinementRequest: string;
  modelImageCount: number;
  productImageCount: number;
  hasSourceImage: boolean;
}

export function buildRefinementPrompt(args: BuildRefinementPromptArgs): string {
  const { payload } = args;
  const intentExtra = classifyRefinementIntent(args.refinementRequest);

  const sections: string[] = [
    buildTaskBlock("image_refinement"),
    "",
    buildReferenceBlock({
      mode: "image_refinement",
      hasSourceImage: args.hasSourceImage,
      modelImageCount: args.modelImageCount,
      productImageCount: args.productImageCount,
    }),
  ];

  if (payload.model) {
    sections.push(
      "",
      buildModelPreservationBlock({
        rules: payload.modelPreservation,
        model: payload.model,
      })
    );
  }

  sections.push(
    "",
    buildProductPreservationBlock({
      rules: payload.productPreservation,
      product: payload.product,
    }),
    "",
    buildRefinementInstructionBlock(args.refinementRequest),
    "",
    buildRefinementPreservationBlock(),
    "",
    buildRefinementRealismBlock()
  );

  if (intentExtra) {
    sections.push("", "INTENT-SPECIFIC INSTRUCTION:", intentExtra);
  }

  sections.push(
    "",
    buildNegativeConstraintBlock({
      flags: payload.negativeConstraints,
      productCategory: payload.product.inferredCategory,
      productInteraction: payload.scene.productInteraction ?? "unspecified",
      shotType: payload.photography.shotType,
    }),
    "",
    buildOutputIntentBlock("image_refinement")
  );

  return sections.join("\n");
}
