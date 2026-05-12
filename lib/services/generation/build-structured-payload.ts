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
  type OutputAspectRatio,
  type OutputScope,
  type PackGenerationSpecification,
  type PlatformTarget,
  type ProductContext,
  type StructuredGenerationPayload,
  type StyleMode,
  type SubjectMode,
} from "@/lib/services/generation/payload-schema";
import { aspectRatioToSize } from "@/lib/services/generation/aspect-ratio-size-map";
import { inferProductCategory } from "@/lib/services/generation/product-category-enhancements";
import { inferProductInteraction } from "@/lib/services/generation/interaction-classifier";

export interface BuildPayloadInput {
  mode: GenerationMode;
  scenePrompt: string;
  controls: PhotographyControls;
  // subjectMode is required; when product_only, `model` is optional.
  subjectMode: SubjectMode;
  styleMode: StyleMode;
  outputScope: OutputScope;
  model: ModelContext | null;
  product: Omit<ProductContext, "inferredCategory">;
  packGeneration?: PackGenerationSpecification;
  refinementInstruction?: string;
  approvedImageNotes?: string;
  targetAspectRatioOverride?: OutputAspectRatio;
  targetPlatform?: PlatformTarget;
}

const GOAL_BY_MODE: Record<GenerationMode, string> = {
  ugc_composite_generation:
    "Create a hyper-realistic influencer-style product photograph that preserves the model's identity and the product's exact appearance.",
  image_refinement:
    "Create a controlled revision of the selected image that satisfies the user's refinement request while preserving identity, product, and overall scene.",
  approved_style_variation:
    "Create a natural variation of the approved image that preserves identity, product fidelity, and the established visual style.",
  product_only_studio_generation:
    "Create a clean, realistic, commercially polished product-only studio photograph that preserves the product exactly.",
  product_only_lifestyle_generation:
    "Create a believable product-only lifestyle scene that integrates the product naturally into a real environment.",
  product_model_studio_generation:
    "Create a polished studio-style product photograph that includes the model alongside the product.",
  pack_anchor_generation:
    "Create a strong anchor photograph for this concept that will serve as the visual reference for additional ratio and variation outputs.",
  pack_variation_generation:
    "Create a coherent ratio/composition variation of the approved anchor image while preserving identity, product, and tone.",
};

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

  // Output ratio may be overridden on a per-pack-variation basis.
  const effectiveRatio: OutputAspectRatio =
    input.targetAspectRatioOverride ?? input.controls.outputAspectRatio;

  // When subjectMode is product_only, we drop model context entirely and
  // soften model-preservation rules to "n/a".
  const effectiveModel: ModelContext | null =
    input.subjectMode === "product_only" ? null : input.model;

  return {
    mode: input.mode,
    goal: GOAL_BY_MODE[input.mode],
    subjectMode: input.subjectMode,
    styleMode: input.styleMode,
    outputScope: input.outputScope,
    model: effectiveModel,
    product: { ...input.product, inferredCategory },
    modelPreservation:
      input.subjectMode === "product_only"
        ? {
            preserveIdentity: false,
            preserveFaceStructure: false,
            preserveHair: false,
            preserveSkinTone: false,
            preserveVisibleDistinctiveFeatures: false,
          }
        : { ...DEFAULT_MODEL_PRESERVATION },
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
      aspectRatio: effectiveRatio,
      size: aspectRatioToSize(effectiveRatio),
      quality: "high",
      outputFormat: "png",
      numberOfVariations: Math.max(1, Math.min(4, input.controls.numberOfVariations)),
      background: "auto",
    },
    negativeConstraints: { ...DEFAULT_NEGATIVE_CONSTRAINTS },
    packGeneration: input.packGeneration,
    refinementInstruction: input.refinementInstruction,
    approvedImageNotes: input.approvedImageNotes,
    targetAspectRatioOverride: input.targetAspectRatioOverride,
    targetPlatform: input.targetPlatform,
  };
}
