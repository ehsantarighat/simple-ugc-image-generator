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
  | "approved_style_variation"
  // Subject/style-aware modes from the content-scaling addendum.
  | "product_only_studio_generation"
  | "product_only_lifestyle_generation"
  | "product_model_studio_generation"
  // Pack-aware modes.
  | "pack_anchor_generation"
  | "pack_variation_generation"
  // Final unified spec — product reproduction at scale + ratio variant.
  | "product_reproduction_generation"
  | "ratio_variant_generation";

// Top-level creation paths exposed to the user on the dashboard.
export type CreationMode = "product_reproduction" | "ugc_model_product";

// MVP routing hint. Stored on the project + payload; actual provider routing
// uses this as one signal.
export type QualityPriority = "economy" | "balanced" | "premium" | "auto";

// 10 style presets for product-only reproduction (Mode A).
export type ProductReproductionStyle =
  | "studio_white_background"
  | "studio_colored_background"
  | "studio_tabletop"
  | "flat_lay"
  | "catalog_premium"
  | "lifestyle_product_only"
  | "shelf_scene"
  | "desk_scene"
  | "bathroom_scene"
  | "minimal_brand_scene";

export const ALL_CREATION_MODES: readonly CreationMode[] = [
  "product_reproduction",
  "ugc_model_product",
] as const;

export const ALL_QUALITY_PRIORITIES: readonly QualityPriority[] = [
  "economy",
  "balanced",
  "premium",
  "auto",
] as const;

export const ALL_PRODUCT_REPRODUCTION_STYLES: readonly ProductReproductionStyle[] = [
  "studio_white_background",
  "studio_colored_background",
  "studio_tabletop",
  "flat_lay",
  "catalog_premium",
  "lifestyle_product_only",
  "shelf_scene",
  "desk_scene",
  "bathroom_scene",
  "minimal_brand_scene",
] as const;

export type SubjectMode = "product_only" | "product_with_model";

export type StyleMode = "studio" | "lifestyle" | "ugc" | "hybrid";

export type OutputScope =
  | "single_image"
  | "few_variations"
  | "multi_format_pack"
  | "multi_concept_pack"
  | "full_campaign_pack";

export type PlatformTarget =
  | "instagram_feed"
  | "instagram_story"
  | "tiktok"
  | "meta_ads"
  | "product_page"
  | "marketplace_listing"
  | "website_banner"
  | "landing_page"
  | "email_banner"
  | "other";

export type AnchorStrategy = "none" | "single_anchor" | "per_concept_anchor";

export type PackType = "multi_format" | "multi_concept" | "campaign";

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

export interface PackGenerationSpecification {
  enabled: boolean;
  packType?: PackType;
  packIntent?: string;
  selectedPlatforms: PlatformTarget[];
  requestedAspectRatios: OutputAspectRatio[];
  requestedConceptCount: number;
  requestedVariationCount: number;
  anchorStrategy: AnchorStrategy;
}

export interface StructuredGenerationPayload {
  mode: GenerationMode;
  goal: string;
  // Top-level project context.
  creationMode?: CreationMode;
  subjectMode: SubjectMode;
  styleMode: StyleMode;
  outputScope: OutputScope;
  qualityPriority?: QualityPriority;
  // model may be absent when subjectMode === 'product_only'.
  model: ModelContext | null;
  product: ProductContext;
  modelPreservation: ModelPreservationRules;
  productPreservation: ProductPreservationRules;
  scene: SceneSpecification;
  photography: PhotographySpecification;
  output: OutputSpecification;
  negativeConstraints: PromptSafetyAndNegativeConstraints;
  packGeneration?: PackGenerationSpecification;
  // Mode-specific fields ------------------------------------------------------
  refinementInstruction?: string;
  approvedImageNotes?: string;
  // Set on pack_variation_generation jobs to drive ratio reframing.
  targetAspectRatioOverride?: OutputAspectRatio;
  targetPlatform?: PlatformTarget;
  // Product-reproduction (Mode A) style selection.
  stylePreset?: ProductReproductionStyle;
  // Optional routing notes the registry/adapter may consume.
  selectedProvider?: string;
  routingContext?: Record<string, unknown>;
}

// ----------------------------------------------------------------------------
// Constants used by the planner / validators.
// ----------------------------------------------------------------------------

export const ALL_PLATFORM_TARGETS: readonly PlatformTarget[] = [
  "instagram_feed",
  "instagram_story",
  "tiktok",
  "meta_ads",
  "product_page",
  "marketplace_listing",
  "website_banner",
  "landing_page",
  "email_banner",
  "other",
] as const;

export const ALL_STYLE_MODES: readonly StyleMode[] = [
  "studio",
  "lifestyle",
  "ugc",
  "hybrid",
] as const;

export const ALL_SUBJECT_MODES: readonly SubjectMode[] = [
  "product_only",
  "product_with_model",
] as const;

export const ALL_OUTPUT_SCOPES: readonly OutputScope[] = [
  "single_image",
  "few_variations",
  "multi_format_pack",
  "multi_concept_pack",
  "full_campaign_pack",
] as const;

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
