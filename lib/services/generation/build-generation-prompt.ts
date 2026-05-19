// ============================================================================
// build-generation-prompt.ts
// Composes the final natural-language prompt for the primary generation
// modes (UGC composite + product-only studio/lifestyle + product+model studio
// + pack anchor). Picks blocks based on subjectMode and styleMode.
// ============================================================================

import type {
  GenerationMode,
  StructuredGenerationPayload,
} from "@/lib/services/generation/payload-schema";
import { buildTaskBlock } from "@/lib/services/generation/prompt-blocks/task-block";
import { buildOutputFormatBlock } from "@/lib/services/generation/prompt-blocks/output-format-block";
import { buildReferenceBlock } from "@/lib/services/generation/prompt-blocks/reference-block";
import { buildSubjectModeBlock } from "@/lib/services/generation/prompt-blocks/subject-mode-block";
import { buildStyleModeBlock } from "@/lib/services/generation/prompt-blocks/style-mode-block";
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
import {
  buildWardrobeSwapBlock,
  detectIsApparel,
} from "@/lib/services/generation/prompt-blocks/wardrobe-swap-block";

export interface BuildGenerationPromptArgs {
  payload: StructuredGenerationPayload;
  modelImageCount: number;
  productImageCount: number;
}

// Set of modes that share this builder. Each pulls the same blocks but the
// style/subject/output-intent blocks vary by payload.
const COMPATIBLE_MODES: Readonly<Set<GenerationMode>> = new Set<GenerationMode>([
  "ugc_composite_generation",
  "product_only_studio_generation",
  "product_only_lifestyle_generation",
  "product_model_studio_generation",
  "pack_anchor_generation",
]);

export function buildGenerationPrompt(args: BuildGenerationPromptArgs): string {
  const { payload } = args;
  if (!COMPATIBLE_MODES.has(payload.mode)) {
    throw new Error(
      `buildGenerationPrompt does not support mode "${payload.mode}". Use a mode-specific builder.`
    );
  }

  const isProductOnly = payload.subjectMode === "product_only";
  const sections: string[] = [];

  // Detect apparel/wearable products early — used by both the reference
  // block (to suppress "preserve outfit" language) and the wardrobe-swap
  // block (which gets promoted to the very top when triggered).
  const isApparel =
    !isProductOnly &&
    detectIsApparel({
      category: payload.product.inferredCategory,
      product: payload.product,
    });

  // OUTPUT FORMAT must come first — it's the only thing preventing the
  // image model from collaging the inputs when given many references.
  sections.push(buildOutputFormatBlock());
  sections.push("");

  // WARDROBE comes second when apparel is detected. Image models pay the
  // most attention to opening tokens — burying this mid-prompt was letting
  // it lose to the visual signal of the model's reference outfit.
  if (isApparel) {
    sections.push(buildWardrobeSwapBlock({ product: payload.product }));
    sections.push("");
  }

  sections.push(buildTaskBlock(payload.mode));
  sections.push("");
  sections.push(
    buildReferenceBlock({
      mode: payload.mode,
      hasSourceImage: false,
      modelImageCount: isProductOnly ? 0 : args.modelImageCount,
      productImageCount: args.productImageCount,
      hasWardrobeSwap: isApparel,
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
        hasWardrobeSwap: isApparel,
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
  sections.push(buildSceneBlock(payload.scene));
  sections.push("");
  sections.push(buildPhotographyBlock(payload.photography));

  // Authenticity block is most meaningful for UGC and lifestyle; we include
  // it everywhere because the realism framing helps studio mode too.
  sections.push("");
  sections.push(buildAuthenticityBlock(payload.photography));

  sections.push("");
  sections.push(buildRealismBlock());
  sections.push("");
  sections.push(buildCompositionPriorityBlock());

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
  sections.push(buildOutputIntentBlock(payload.mode));

  return sections.join("\n");
}
