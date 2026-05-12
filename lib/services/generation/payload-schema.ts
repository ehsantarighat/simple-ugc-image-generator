// ============================================================================
// payload-schema.ts
// The richer, canonical structured payload for GPT Image 2 generation.
// This shape is what we persist in `generation_requests.structured_payload_json`
// and what the prompt-block builders consume.
// ============================================================================

import {
  ASPECT_RATIOS,
  AUTHENTICITY_LEVELS,
  CAMERA_ANGLES,
  FRAMINGS,
  LENS_TYPES,
  LIGHTINGS,
  PRODUCT_PROMINENCES,
  SHOT_TYPES,
} from "@/types";

export type GenerationMode =
  | "ugc_composite_generation"
  | "image_refinement"
  | "approved_style_variation";

export type AuthenticityLevel = (typeof AUTHENTICITY_LEVELS)[number];
export type ProductProminence = (typeof PRODUCT_PROMINENCES)[number];
export type ShotType = (typeof SHOT_TYPES)[number];
export type CameraAngle = (typeof CAMERA_ANGLES)[number];
export type LensType = (typeof LENS_TYPES)[number];
export type Framing = (typeof FRAMINGS)[number];
export type Lighting = (typeof LIGHTINGS)[number];
export type OutputAspectRatio = (typeof ASPECT_RATIOS)[number];

export type ProductCategoryHint =
  | "beauty_skincare"
  | "fashion_accessories"
  | "food_beverage"
  | "electronics_gadgets"
  | "home_lifestyle"
  | "unknown";

export type ProductInteraction =
  | "product_in_hand"
  | "product_near_face"
  | "product_on_table"
  | "product_being_used"
  | "unspecified";

export interface ModelPreservationRules {
  preserveIdentity: boolean;
  preserveFaceStructure: boolean;
  preserveHair: boolean;
  preserveSkinTone: boolean;
  preserveVisibleDistinctiveFeatures: boolean;
  realismInstruction?: string;
}

export interface ProductPreservationRules {
  preserveExactProduct: boolean;
  preserveShape: boolean;
  preserveDominantColors: boolean;
  preservePackaging: boolean;
  preserveLogoPlacement: boolean;
  preserveReadableTextWhenPossible: boolean;
  mustNotInventProductDetails: boolean;
  productCriticalFeatures?: string[];
}

export interface SceneSpecification {
  userSceneDescription: string;
  inferredLocation?: string;
  inferredAction?: string;
  inferredMood?: string;
  inferredTimeOfDay?: string;
  productInteraction?: ProductInteraction;
  backgroundNotes?: string;
}

export interface PhotographySpecification {
  shotType: ShotType;
  cameraAngle: CameraAngle;
  lensType: LensType;
  framing: Framing;
  lighting: Lighting;
  authenticityLevel: AuthenticityLevel;
  productProminence: ProductProminence;
}

export interface OutputSpecification {
  aspectRatio: OutputAspectRatio;
  size: string;
  quality: "low" | "medium" | "high";
  outputFormat: "png" | "jpeg" | "webp";
  numberOfVariations: number;
  background: "auto" | "opaque"; // Spec: never "transparent" for GPT Image 2.
}

export interface PromptSafetyAndNegativeConstraints {
  avoidArtificialLook: boolean;
  avoidCGILook: boolean;
  avoidPlasticSkin: boolean;
  avoidOverRetouching: boolean;
  avoidAnatomyDistortion: boolean;
  avoidExtraFingers: boolean;
  avoidMalformedHands: boolean;
  avoidProductDeformation: boolean;
  avoidWrongLogo: boolean;
  avoidInventedText: boolean;
  avoidOverlyCommercialStudioLook: boolean;
  extraNegativeConstraints?: string[];
}

export interface ProductContext {
  name: string;
  brandName?: string | null;
  category?: string | null;
  description?: string | null;
  preservationNotes?: string | null;
  inferredCategory: ProductCategoryHint;
}

export interface ModelContext {
  name: string;
  description?: string | null;
}

export interface StructuredGenerationPayload {
  mode: GenerationMode;
  goal: string;
  model: ModelContext;
  product: ProductContext;
  modelPreservation: ModelPreservationRules;
  productPreservation: ProductPreservationRules;
  scene: SceneSpecification;
  photography: PhotographySpecification;
  output: OutputSpecification;
  negativeConstraints: PromptSafetyAndNegativeConstraints;
  // Mode-specific fields ------------------------------------------------------
  refinementInstruction?: string;
  approvedImageNotes?: string;
}

// ----------------------------------------------------------------------------
// Defaults
// ----------------------------------------------------------------------------

export const DEFAULT_MODEL_PRESERVATION: ModelPreservationRules = {
  preserveIdentity: true,
  preserveFaceStructure: true,
  preserveHair: true,
  preserveSkinTone: true,
  preserveVisibleDistinctiveFeatures: true,
};

export const DEFAULT_PRODUCT_PRESERVATION: ProductPreservationRules = {
  preserveExactProduct: true,
  preserveShape: true,
  preserveDominantColors: true,
  preservePackaging: true,
  preserveLogoPlacement: true,
  preserveReadableTextWhenPossible: true,
  mustNotInventProductDetails: true,
};

export const DEFAULT_NEGATIVE_CONSTRAINTS: PromptSafetyAndNegativeConstraints = {
  avoidArtificialLook: true,
  avoidCGILook: true,
  avoidPlasticSkin: true,
  avoidOverRetouching: true,
  avoidAnatomyDistortion: true,
  avoidExtraFingers: true,
  avoidMalformedHands: true,
  avoidProductDeformation: true,
  avoidWrongLogo: true,
  avoidInventedText: true,
  avoidOverlyCommercialStudioLook: true,
};
