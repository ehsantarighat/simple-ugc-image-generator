// Domain types used across the app. Kept hand-written rather than generated
// from Supabase because the schema is small and stable.

export type GenerationStatus =
  | "draft"
  | "queued"
  | "generating"
  | "completed"
  | "failed";

export type TargetChannel =
  | "instagram"
  | "tiktok"
  | "amazon"
  | "shopify"
  | "youtube"
  | "general";

export interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface ModelRecord {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  metadata_json: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface ModelImage {
  id: string;
  model_id: string;
  user_id: string;
  storage_path: string;
  sort_order: number;
  created_at: string;
}

export interface ProductRecord {
  id: string;
  user_id: string;
  name: string;
  brand_name: string | null;
  category: string | null;
  description: string | null;
  preservation_rules_json: Record<string, unknown> | null;
  metadata_json: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface ProductImage {
  id: string;
  product_id: string;
  user_id: string;
  storage_path: string;
  sort_order: number;
  created_at: string;
}

export interface ProjectRecord {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  selected_model_id: string | null;
  selected_product_id: string | null;
  target_channel: TargetChannel;
  created_at: string;
  updated_at: string;
}

export interface GenerationRequestRecord {
  id: string;
  project_id: string;
  user_id: string;
  model_id: string;
  product_id: string;
  raw_scene_prompt: string;
  structured_payload_json: StructuredGenerationPayload;
  controls_json: PhotographyControls;
  status: GenerationStatus;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface GeneratedImageRecord {
  id: string;
  generation_request_id: string;
  project_id: string;
  user_id: string;
  parent_image_id: string | null;
  storage_path: string;
  prompt_used: string;
  metadata_json: Record<string, unknown> | null;
  review_json: QualityReview | null;
  is_favorite: boolean;
  created_at: string;
}

export interface RevisionRequestRecord {
  id: string;
  source_generated_image_id: string;
  generation_request_id: string | null;
  user_id: string;
  refinement_prompt: string;
  structured_payload_json: StructuredGenerationPayload;
  status: GenerationStatus;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

// --- Photography controls ---------------------------------------------------

export const SHOT_TYPES = [
  "selfie_style",
  "candid_lifestyle",
  "product_in_hand",
  "mirror_selfie",
  "over_the_shoulder",
  "pov",
  "close_up_interaction",
] as const;
export type ShotType = (typeof SHOT_TYPES)[number];

export const CAMERA_ANGLES = [
  "eye_level",
  "slight_top_angle",
  "low_angle",
  "side_angle",
  "three_quarter",
  "handheld_selfie",
] as const;
export type CameraAngle = (typeof CAMERA_ANGLES)[number];

export const LENS_TYPES = [
  "smartphone_wide",
  "smartphone_portrait",
  "24mm",
  "35mm",
  "50mm",
  "85mm",
  "macro",
] as const;
export type LensType = (typeof LENS_TYPES)[number];

export const FRAMINGS = [
  "extreme_close_up",
  "close_up",
  "medium_close_up",
  "medium_shot",
  "waist_up",
  "full_body",
  "environmental",
] as const;
export type Framing = (typeof FRAMINGS)[number];

export const LIGHTINGS = [
  "soft_window_light",
  "morning_daylight",
  "warm_indoor",
  "golden_hour",
  "bathroom_soft_light",
  "overcast_outdoor",
] as const;
export type Lighting = (typeof LIGHTINGS)[number];

export const AUTHENTICITY_LEVELS = [
  "branded_clean_ugc",
  "natural_influencer",
  "raw_everyday_user",
] as const;
export type AuthenticityLevel = (typeof AUTHENTICITY_LEVELS)[number];

export const PRODUCT_PROMINENCES = ["hero", "balanced", "subtle"] as const;
export type ProductProminence = (typeof PRODUCT_PROMINENCES)[number];

export const ASPECT_RATIOS = ["1:1", "4:5", "9:16", "16:9"] as const;
export type AspectRatio = (typeof ASPECT_RATIOS)[number];

export interface PhotographyControls {
  shotType: ShotType;
  cameraAngle: CameraAngle;
  lensType: LensType;
  framing: Framing;
  lighting: Lighting;
  authenticityLevel: AuthenticityLevel;
  productProminence: ProductProminence;
  outputAspectRatio: AspectRatio;
  numberOfVariations: number;
}

// --- Structured generation payload ------------------------------------------

export interface StructuredGenerationPayload {
  goal: string;
  scene: {
    location?: string;
    action?: string;
    mood?: string;
    description: string;
  };
  modelPreservation: {
    priority: "high" | "critical";
    instruction: string;
  };
  productPreservation: {
    priority: "high" | "critical";
    instruction: string;
  };
  photography: {
    shotType: string;
    cameraAngle: string;
    lensType: string;
    framing: string;
    lighting: string;
    authenticityLevel: string;
    productProminence: string;
  };
  output: {
    aspectRatio: string;
    variations: number;
  };
  negativeConstraints: string[];
}

export interface QualityReview {
  modelSimilarityScore?: number;
  productFidelityScore?: number;
  realismScore?: number;
  promptMatchScore?: number;
  notes?: string;
}

// --- Joined views used by the UI --------------------------------------------

export interface ModelWithImages extends ModelRecord {
  images: ModelImage[];
}

export interface ProductWithImages extends ProductRecord {
  images: ProductImage[];
}

export interface ProjectWithSelections extends ProjectRecord {
  model: ModelRecord | null;
  product: ProductRecord | null;
}

export interface GenerationRequestWithImages extends GenerationRequestRecord {
  images: GeneratedImageRecord[];
}
