// ============================================================================
// interaction-classifier.ts
// Spec section 17. Infer how the model interacts with the product from the
// scene description and shot type, and emit the matching prompt fragment.
// ============================================================================

import type {
  ProductInteraction,
  ShotType,
} from "@/lib/services/generation/payload-schema";

const PROMPT_FRAGMENTS: Record<ProductInteraction, string> = {
  product_in_hand:
    "The product is naturally held in the model's hand. Keep the grip physically plausible, with correct finger placement, realistic contact shadows, and natural product scale.",
  product_near_face:
    "The product appears close to the model's face without covering essential facial identity features. Keep the product scale and hand position natural.",
  product_on_table:
    "The product is placed naturally on a nearby surface within the scene, with believable scale, perspective, and contact shadow.",
  product_being_used:
    "The product is being used in a believable and category-appropriate way. Preserve product accuracy and avoid impossible or unnatural usage.",
  unspecified: "",
};

export function buildInteractionPrompt(interaction?: ProductInteraction): string {
  if (!interaction) return "";
  return PROMPT_FRAGMENTS[interaction];
}

// Heuristic inference. Returns the most likely interaction from a free-form
// scene description, with shot type acting as a tiebreaker.
export function inferProductInteraction(args: {
  sceneDescription: string;
  shotType: ShotType;
}): ProductInteraction {
  const s = args.sceneDescription.toLowerCase();

  if (/(near (?:her|his|the) (?:cheek|face|chin|mouth)|to (?:her|his) face)/.test(s)) {
    return "product_near_face";
  }
  if (/(on (?:the |a )?(?:table|desk|counter|shelf|floor|bench)|placed on)/.test(s)) {
    return "product_on_table";
  }
  if (/(holding|holds|in (?:her|his) hand|in hand|grip|grasping|fingers? around)/.test(s)) {
    return "product_in_hand";
  }
  if (/(using|applying|opening|drinking|eating|wearing|tapping|typing|spraying|pouring)/.test(s)) {
    return "product_being_used";
  }
  if (
    args.shotType === "product_in_hand" ||
    args.shotType === "selfie_style" ||
    args.shotType === "mirror_selfie"
  ) {
    return "product_in_hand";
  }
  if (args.shotType === "close_up_interaction") {
    return "product_being_used";
  }
  return "unspecified";
}
