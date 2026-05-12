import type { GenerationMode } from "@/lib/services/generation/payload-schema";

// Tells GPT Image 2 how to interpret the attached reference images. Order
// inside the request matters: source image (if any) first, then model refs,
// then product refs.
export function buildReferenceBlock(args: {
  mode: GenerationMode;
  hasSourceImage: boolean;
  modelImageCount: number;
  productImageCount: number;
}): string {
  const lines: string[] = ["REFERENCE IMAGE USAGE:"];
  if (args.mode !== "ugc_composite_generation" && args.hasSourceImage) {
    lines.push(
      "- The first attached image is the approved/source generated image. Treat it as the primary composition and visual-style reference."
    );
  }
  if (args.modelImageCount > 0) {
    lines.push(
      "- The attached human reference images define the same real model who must appear in the final image."
    );
    lines.push(
      "- Preserve the model's identity, facial structure, age appearance, skin tone, hair, and visible distinctive features as faithfully as possible."
    );
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
  }
  return lines.join("\n");
}
