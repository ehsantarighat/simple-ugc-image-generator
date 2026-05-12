import type {
  PhotographyControls,
  StructuredGenerationPayload,
} from "@/types";

// Human-readable labels for each enum value. Used both in the UI and when
// rendering the final natural-language prompt for GPT Image 2.
export const SHOT_TYPE_LABELS: Record<string, string> = {
  selfie_style: "selfie-style framing",
  candid_lifestyle: "candid lifestyle shot",
  product_in_hand: "product held in hand",
  mirror_selfie: "mirror selfie",
  over_the_shoulder: "over-the-shoulder view",
  pov: "first-person POV",
  close_up_interaction: "close-up product interaction",
};

export const CAMERA_ANGLE_LABELS: Record<string, string> = {
  eye_level: "eye level",
  slight_top_angle: "slight top-down angle",
  low_angle: "low angle looking up",
  side_angle: "side profile angle",
  three_quarter: "three-quarter angle",
  handheld_selfie: "handheld at arm's length",
};

export const LENS_LABELS: Record<string, string> = {
  smartphone_wide: "modern smartphone wide-angle lens",
  smartphone_portrait: "smartphone portrait lens",
  "24mm": "24mm wide lens",
  "35mm": "35mm documentary lens",
  "50mm": "50mm natural perspective lens",
  "85mm": "85mm portrait lens with soft background separation",
  macro: "macro lens with fine detail",
};

export const FRAMING_LABELS: Record<string, string> = {
  extreme_close_up: "extreme close-up framing",
  close_up: "close-up framing",
  medium_close_up: "medium close-up framing",
  medium_shot: "medium shot framing",
  waist_up: "waist-up framing",
  full_body: "full-body framing",
  environmental: "environmental wide framing showing surroundings",
};

export const LIGHTING_LABELS: Record<string, string> = {
  soft_window_light: "soft natural window light",
  morning_daylight: "fresh morning daylight",
  warm_indoor: "warm indoor lighting",
  golden_hour: "golden-hour sunlight",
  bathroom_soft_light: "diffused soft bathroom light",
  overcast_outdoor: "even overcast outdoor light",
};

export const AUTHENTICITY_LABELS: Record<string, string> = {
  branded_clean_ugc: "polished but believable branded UGC look",
  natural_influencer: "natural influencer-style realism",
  raw_everyday_user: "raw everyday smartphone snapshot feel",
};

export const PRODUCT_PROMINENCE_LABELS: Record<string, string> = {
  hero: "the product is the clear hero of the frame",
  balanced: "the product is balanced equally with the person and setting",
  subtle: "the product is naturally integrated and subtle",
};

export interface BuildPayloadInput {
  scenePrompt: string;
  controls: PhotographyControls;
  product: {
    name: string;
    brand_name?: string | null;
    category?: string | null;
    description?: string | null;
    preservation_notes?: string | null;
  };
  model: {
    name: string;
    description?: string | null;
  };
}

const NEGATIVE_CONSTRAINTS = [
  "Avoid an overly polished CGI or 3D render look",
  "Preserve natural skin texture, pores, and minor imperfections",
  "Maintain believable, physically-plausible lighting and shadows",
  "Avoid distorted anatomy or unnatural proportions",
  "Avoid malformed or extra fingers and hands",
  "Avoid product deformation, smearing, or invented logos",
  "Avoid text artifacts and gibberish on labels — keep packaging legible",
  "Avoid plastic-looking skin or doll-like rendering",
  "Avoid stock-photo or studio sheen unless explicitly requested",
];

// Builds the internal structured payload from user input. This is what we
// persist to the database alongside the generation request.
export function buildStructuredPayload(input: BuildPayloadInput): StructuredGenerationPayload {
  const { controls, product, model, scenePrompt } = input;

  const productBits = [
    `Product name: ${product.name}`,
    product.brand_name ? `Brand: ${product.brand_name}` : null,
    product.category ? `Category: ${product.category}` : null,
    product.description ? `Description: ${product.description}` : null,
    product.preservation_notes ? `Must-preserve: ${product.preservation_notes}` : null,
  ].filter(Boolean) as string[];

  const modelBits = [
    `Model: ${model.name}`,
    model.description ? `Identity notes: ${model.description}` : null,
  ].filter(Boolean) as string[];

  return {
    goal:
      "Create a hyper-realistic influencer-style product photograph that preserves the model's identity and the product's exact appearance.",
    scene: { description: scenePrompt },
    modelPreservation: {
      priority: "critical",
      instruction: `Use the model reference images as the canonical identity. Preserve facial structure, eye color, hair style and texture, skin tone, body type, and overall appearance. ${modelBits.join(". ")}.`,
    },
    productPreservation: {
      priority: "critical",
      instruction: `Use the product reference images as the canonical source for the product's exact shape, dominant colors, packaging texture, and logo placement. ${productBits.join(". ")}. Do not invent labels, change colors, or alter the shape.`,
    },
    photography: {
      shotType: controls.shotType,
      cameraAngle: controls.cameraAngle,
      lensType: controls.lensType,
      framing: controls.framing,
      lighting: controls.lighting,
      authenticityLevel: controls.authenticityLevel,
      productProminence: controls.productProminence,
    },
    output: {
      aspectRatio: controls.outputAspectRatio,
      variations: controls.numberOfVariations,
    },
    negativeConstraints: NEGATIVE_CONSTRAINTS,
  };
}

// Renders the natural-language prompt sent to GPT Image 2. This is the final
// surface that hits the model.
export function renderPromptFromPayload(payload: StructuredGenerationPayload): string {
  const photo = payload.photography;
  const lines: string[] = [];

  lines.push(
    "Create a hyper-realistic, influencer-style product photograph that looks like a real photograph taken in a natural everyday setting — not like synthetic AI art."
  );
  lines.push(
    "Use the attached MODEL REFERENCE IMAGES to preserve the same person's identity: facial structure, hair, skin tone, body type. Do not blend with any other face."
  );
  lines.push(
    "Use the attached PRODUCT REFERENCE IMAGES to preserve the product's exact shape, dominant colors, packaging texture, and logo placement. Do not invent labels or alter colors."
  );
  lines.push(`Scene: ${payload.scene.description}`);
  lines.push(
    `Shot: ${SHOT_TYPE_LABELS[photo.shotType] ?? photo.shotType}, ${CAMERA_ANGLE_LABELS[photo.cameraAngle] ?? photo.cameraAngle}.`
  );
  lines.push(
    `Lens: ${LENS_LABELS[photo.lensType] ?? photo.lensType}. Framing: ${FRAMING_LABELS[photo.framing] ?? photo.framing}.`
  );
  lines.push(
    `Lighting: ${LIGHTING_LABELS[photo.lighting] ?? photo.lighting}. Look and feel: ${AUTHENTICITY_LABELS[photo.authenticityLevel] ?? photo.authenticityLevel}.`
  );
  lines.push(
    `Product placement: ${PRODUCT_PROMINENCE_LABELS[photo.productProminence] ?? photo.productProminence}.`
  );
  lines.push(
    "The final image must look like a candid photograph: realistic skin texture, natural shadows, plausible object interaction, accurate proportions, and authentic environmental detail."
  );
  lines.push("Avoid the following: " + payload.negativeConstraints.join("; ") + ".");

  if (payload.modelPreservation.instruction) {
    lines.push(`Identity guidance: ${payload.modelPreservation.instruction}`);
  }
  if (payload.productPreservation.instruction) {
    lines.push(`Product guidance: ${payload.productPreservation.instruction}`);
  }

  return lines.join("\n");
}

// gpt-image accepts a fixed set of sizes. Pick the closest one for each ratio.
export function aspectRatioToImageSize(ratio: string): "1024x1024" | "1024x1536" | "1536x1024" {
  switch (ratio) {
    case "1:1":
      return "1024x1024";
    case "9:16":
    case "4:5":
      return "1024x1536";
    case "16:9":
      return "1536x1024";
    default:
      return "1024x1024";
  }
}
