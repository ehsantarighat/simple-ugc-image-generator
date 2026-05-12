// ============================================================================
// control-mappings.ts
// Verbatim mappings from spec sections 8.1–8.7. These convert enum control
// values into the natural-language phrasing that the prompt blocks consume.
// ============================================================================

import type {
  AuthenticityLevel,
  CameraAngle,
  Framing,
  LensType,
  Lighting,
  ProductProminence,
  ShotType,
} from "@/lib/services/generation/payload-schema";

export const SHOT_TYPE_PROMPT_MAP: Record<ShotType, string> = {
  selfie_style:
    "handheld or self-shot influencer-style photograph with a naturally casual point of view",
  candid_lifestyle:
    "candid lifestyle photograph that feels captured during a real moment",
  product_in_hand:
    "the model naturally holding or presenting the product in hand",
  mirror_selfie:
    "realistic mirror selfie composition with believable reflection behavior",
  over_the_shoulder:
    "over-the-shoulder composition showing the model and product from a natural observational angle",
  pov: "first-person point-of-view style image that feels personally captured",
  close_up_interaction:
    "close-up interaction shot focused on the model engaging naturally with the product",
};

export const CAMERA_ANGLE_PROMPT_MAP: Record<CameraAngle, string> = {
  eye_level: "camera positioned at natural eye level",
  slight_top_angle:
    "camera slightly above the subject, creating a natural creator-content perspective",
  low_angle: "subtle low-angle composition while remaining realistic and not dramatic",
  side_angle: "natural side-angle view",
  three_quarter:
    "three-quarter angle that reveals both face and product naturally",
  handheld_selfie:
    "handheld selfie angle with believable arm-distance framing",
};

export const LENS_PROMPT_MAP: Record<LensType, string> = {
  smartphone_wide:
    "modern smartphone wide-lens look with natural mobile-photo perspective",
  smartphone_portrait:
    "smartphone portrait-mode feel with gentle background separation and realistic computational photography",
  "24mm": "24mm wide environmental photography feel",
  "35mm": "35mm documentary lifestyle photography feel",
  "50mm": "50mm natural portrait and lifestyle perspective",
  "85mm":
    "85mm portrait-lens compression with believable shallow depth of field",
  macro: "macro-like close product detail rendering with careful focus control",
};

export const FRAMING_PROMPT_MAP: Record<Framing, string> = {
  extreme_close_up: "extreme close-up framing",
  close_up: "close-up framing",
  medium_close_up: "medium close-up framing from chest or shoulders upward",
  medium_shot: "medium shot showing the subject and relevant surroundings",
  waist_up: "waist-up framing",
  full_body: "full-body composition",
  environmental:
    "environmental composition that gives clear context to the surrounding location",
};

export const LIGHTING_PROMPT_MAP: Record<Lighting, string> = {
  soft_window_light:
    "soft natural window light with believable falloff and delicate shadows",
  morning_daylight: "fresh morning daylight, natural and gently directional",
  warm_indoor:
    "warm indoor ambient light with realistic household illumination",
  golden_hour:
    "golden-hour natural sunlight with warm believable highlights",
  bathroom_soft_light:
    "soft bathroom lighting with realistic diffuse highlights and shadows",
  overcast_outdoor:
    "soft overcast outdoor daylight with low-contrast natural shadows",
};

export const AUTHENTICITY_PROMPT_MAP: Record<AuthenticityLevel, string> = {
  branded_clean_ugc:
    "clean, polished UGC suitable for a brand-owned social post while still looking real",
  natural_influencer:
    "authentic influencer content that looks casually well-composed and genuinely photographed",
  raw_everyday_user:
    "raw everyday user-created feel, natural and believable, with slightly less polished framing",
};

export const PRODUCT_PROMINENCE_PROMPT_MAP: Record<ProductProminence, string> = {
  hero:
    "the product should be clearly noticeable and visually important in the composition",
  balanced: "the product and the model should share attention naturally",
  subtle:
    "the product should be present and recognizable but integrated more casually into the scene",
};

// Short-label maps (used in UI chips and history).
export const SHOT_TYPE_LABELS: Record<ShotType, string> = {
  selfie_style: "Selfie style",
  candid_lifestyle: "Candid lifestyle",
  product_in_hand: "Product in hand",
  mirror_selfie: "Mirror selfie",
  over_the_shoulder: "Over the shoulder",
  pov: "First-person POV",
  close_up_interaction: "Close-up interaction",
};

export const CAMERA_ANGLE_LABELS: Record<CameraAngle, string> = {
  eye_level: "Eye level",
  slight_top_angle: "Slight top angle",
  low_angle: "Low angle",
  side_angle: "Side angle",
  three_quarter: "Three-quarter",
  handheld_selfie: "Handheld selfie",
};

export const LENS_LABELS: Record<LensType, string> = {
  smartphone_wide: "Smartphone wide",
  smartphone_portrait: "Smartphone portrait",
  "24mm": "24mm",
  "35mm": "35mm",
  "50mm": "50mm",
  "85mm": "85mm",
  macro: "Macro",
};

export const FRAMING_LABELS: Record<Framing, string> = {
  extreme_close_up: "Extreme close-up",
  close_up: "Close-up",
  medium_close_up: "Medium close-up",
  medium_shot: "Medium shot",
  waist_up: "Waist-up",
  full_body: "Full body",
  environmental: "Environmental",
};

export const LIGHTING_LABELS: Record<Lighting, string> = {
  soft_window_light: "Soft window light",
  morning_daylight: "Morning daylight",
  warm_indoor: "Warm indoor",
  golden_hour: "Golden hour",
  bathroom_soft_light: "Bathroom soft light",
  overcast_outdoor: "Overcast outdoor",
};

export const AUTHENTICITY_LABELS: Record<AuthenticityLevel, string> = {
  branded_clean_ugc: "Branded clean UGC",
  natural_influencer: "Natural influencer",
  raw_everyday_user: "Raw everyday user",
};

export const PRODUCT_PROMINENCE_LABELS: Record<ProductProminence, string> = {
  hero: "Hero",
  balanced: "Balanced",
  subtle: "Subtle",
};
