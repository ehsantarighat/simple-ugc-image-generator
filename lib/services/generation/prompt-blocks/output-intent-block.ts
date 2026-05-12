import type { GenerationMode } from "@/lib/services/generation/payload-schema";

const INTENT_TEXT: Record<GenerationMode, string> = {
  ugc_composite_generation: [
    "FINAL OUTPUT INTENT:",
    "Produce a commercially usable, realistic product lifestyle image that could plausibly be posted by an influencer, creator, or brand as authentic UGC-style content.",
  ].join("\n"),
  image_refinement: [
    "FINAL OUTPUT INTENT:",
    "Produce a controlled, high-fidelity revision of the selected image that satisfies the user's request while preserving the approved visual foundation.",
  ].join("\n"),
  approved_style_variation: [
    "FINAL OUTPUT INTENT:",
    "Produce a natural variation that retains the approved image's realism, identity, product fidelity, and overall composition language.",
  ].join("\n"),
  product_only_studio_generation: [
    "FINAL OUTPUT INTENT:",
    "Produce a commercial-grade product-only studio photograph suitable for ecommerce, catalog, or brand asset use.",
  ].join("\n"),
  product_only_lifestyle_generation: [
    "FINAL OUTPUT INTENT:",
    "Produce a believable product-only lifestyle image that feels naturally photographed in a real environment.",
  ].join("\n"),
  product_model_studio_generation: [
    "FINAL OUTPUT INTENT:",
    "Produce a polished product-with-model studio photograph suitable for premium brand campaigns and editorial.",
  ].join("\n"),
  pack_anchor_generation: [
    "FINAL OUTPUT INTENT:",
    "Produce a strong anchor image that will serve as the visual foundation for further ratio and concept variations in this content pack.",
  ].join("\n"),
  pack_variation_generation: [
    "FINAL OUTPUT INTENT:",
    "Produce a ratio-correct re-shoot of the anchor image suitable for the target platform.",
  ].join("\n"),
};

export function buildOutputIntentBlock(mode: GenerationMode): string {
  return INTENT_TEXT[mode];
}
