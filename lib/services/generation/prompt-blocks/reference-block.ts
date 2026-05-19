import type { GenerationMode } from "@/lib/services/generation/payload-schema";

// Tells the image-edit model how to interpret the attached reference images.
// Order inside the request matters: source image (if any) first, then model
// refs, then product refs.
//
// When `hasWardrobeSwap` is true, the model-reference lines are rewritten to
// scope preservation strictly to the person (face/body/hair) — never the
// outfit, jewelry, or accessories visible in the reference. The phrase
// "visible distinctive features" is removed entirely because image models
// were reading it as "preserve the cardigan she's wearing in the photo."
export function buildReferenceBlock(args: {
  mode: GenerationMode;
  hasSourceImage: boolean;
  modelImageCount: number;
  productImageCount: number;
  hasWardrobeSwap?: boolean;
}): string {
  const lines: string[] = ["REFERENCE IMAGE USAGE:"];
  if (args.mode !== "ugc_composite_generation" && args.hasSourceImage) {
    lines.push(
      "- The first attached image is the approved/source generated image. Treat it as the primary composition and visual-style reference."
    );
  }
  if (args.modelImageCount > 0) {
    if (args.hasWardrobeSwap) {
      // Wardrobe-swap mode: preserve the PERSON, never the OUTFIT.
      lines.push(
        "- The attached human reference images exist ONLY to identify the person. Use them for face, hair color, skin tone, body proportions, and overall personal identity."
      );
      lines.push(
        "- Do NOT copy, preserve, or carry over anything else from the human reference images — not the clothing, not the jewelry, not the accessories, not the makeup styling, not the background. Those elements should be considered absent."
      );
      lines.push(
        "- In particular, whatever outfit, top, jacket, or pattern she is wearing in the reference photos must NOT appear in the final image. It is being replaced by the product."
      );
    } else {
      // Default mode: full identity + features.
      lines.push(
        "- The attached human reference images define the same real model who must appear in the final image."
      );
      lines.push(
        "- Preserve the model's identity, facial structure, age appearance, skin tone, hair, and visible distinctive features as faithfully as possible."
      );
    }
  }
  if (args.productImageCount > 0) {
    lines.push(
      "- The attached product reference images define the exact product that must appear in the final image."
    );
    lines.push(
      "- Preserve the product's real-world form, proportions, dominant colors, packaging structure, surface material, logo placement, and key visible design details as faithfully as possible."
    );
    lines.push(
      "- Do not invent a different product. Do not redesign it. Do not replace it with a visually similar alternative."
    );
    if (args.hasWardrobeSwap) {
      // When the product is wearable, this line preempts the most common
      // failure: showing the product in isolation alongside the model
      // instead of on her body.
      lines.push(
        "- The product is wearable apparel. It must appear ON the model's body in the final image — not held in her hand, not on a hanger, not on a foam board, not on a separate display surface."
      );
    }
  }
  return lines.join("\n");
}
