// ============================================================================
// build-structured-payload.ts
// Converts raw user input into the canonical StructuredGenerationPayload.
// Pure function: no I/O, no DB, no OpenAI.
// ============================================================================

import type { PhotographyControls } from "@/types";
import {
  DEFAULT_MODEL_PRESERVATION,
  DEFAULT_NEGATIVE_CONSTRAINTS,
  DEFAULT_PRODUCT_PRESERVATION,
  type GenerationMode,
  type ModelContext,
  type ProductContext,
  type StructuredGenerationPayload,
} from "@/lib/services/generation/payload-schema";
import { aspectRatioToSize } from "@/lib/services/generation/aspect-ratio-size-map";
import {
  inferProductCategory,
} from "@/lib/services/generation/product-category-enhancements";
import { inferProductInteraction } from "@/lib/services/generation/interaction-classifier";

export interface BuildPayloadInput {
  mode: GenerationMode;
  scenePrompt: string;
  controls: PhotographyControls;
  model: ModelContext;
  product: Omit<ProductContext, "inferredCategory">;
  refinementInstruction?: string;
  approvedImageNotes?: string;
}

export function buildStructuredPayload(
  input: BuildPayloadInput
): StructuredGenerationPayload {
  const inferredCategory = inferProductCategory({
    name: input.product.name,
    category: input.product.category,
    description: input.product.description,
  });
  const productInteraction = inferProductInteraction({
    sceneDescription: input.scenePrompt,
    shotType: input.controls.shotType,
  });

  const goalByMode: Record<GenerationMode, string> = {
    ugc_composite_generation:
      "Create a hyper-realistic influencer-style product photograph that preserves the model's identity and the product's exact appearance.",
    image_refinement:
      "Create a controlled revision of the selected image that satisfies the user's refinement request while preserving identity, product, and overall scene.",
    approved_style_variation:
      "Create a natural variation of the approved image that preserves identity, product fidelity, and the established visual style.",
  };

  return {
    mode: input.mode,
    goal: goalByMode[input.mode],
    model: input.model,
    product: { ...input.product, inferredCategory },
    modelPreservation: { ...DEFAULT_MODEL_PRESERVATION },
    productPreservation: { ...DEFAULT_PRODUCT_PRESERVATION },
    scene: {
      userSceneDescription: input.scenePrompt,
      productInteraction,
    },
    photography: {
      shotType: input.controls.shotType,
      cameraAngle: input.controls.cameraAngle,
      lensType: input.controls.lensType,
      framing: input.controls.framing,
      lighting: input.controls.lighting,
      authenticityLevel: input.controls.authenticityLevel,
      productProminence: input.controls.productProminence,
    },
    output: {
      aspectRatio: input.controls.outputAspectRatio,
      size: aspectRatioToSize(input.controls.outputAspectRatio),
      quality: "high",
      outputFormat: "png",
      numberOfVariations: Math.max(1, Math.min(4, input.controls.numberOfVariations)),
      background: "auto",
    },
    negativeConstraints: { ...DEFAULT_NEGATIVE_CONSTRAINTS },
    refinementInstruction: input.refinementInstruction,
    approvedImageNotes: input.approvedImageNotes,
  };
}
