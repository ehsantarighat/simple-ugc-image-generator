// ============================================================================
// output-format-block.ts
// CRITICAL anti-collage instruction. Goes at the very top of every prompt
// because image-edit models with multiple reference inputs (model + product
// + variants) often default to "lay out everything I was given" — producing
// a side-by-side panel of inputs instead of a synthesized composition.
//
// Placing this instruction first (where attention is highest) and using
// strong forbidding language ("DO NOT", "never") is the most reliable way
// to suppress collage outputs across providers (gpt-image-2, FLUX Pro
// Kontext, Nano Banana, etc.). Don't move it lower in the prompt.
// ============================================================================

export function buildOutputFormatBlock(): string {
  return [
    "OUTPUT FORMAT — CRITICAL:",
    "- Produce ONE single photographic image as the final output.",
    "- DO NOT produce a collage, grid, mood board, lookbook, side-by-side comparison, before/after layout, reference panel, or any composition that shows multiple separate frames inside one image.",
    "- DO NOT include any inset, thumbnail, watermark, frame, or text label that references the input images.",
    "- The reference images are inputs to be SYNTHESIZED into one new photograph, not displayed.",
    "- The final image must depict a single coherent scene at a single moment in time.",
  ].join("\n");
}
