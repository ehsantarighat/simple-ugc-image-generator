// ============================================================================
// subject-mode-block.ts
// Spec section 11.3. Tells the model whether a human is in the frame.
// ============================================================================

import type { SubjectMode } from "@/lib/services/generation/payload-schema";

export function buildSubjectModeBlock(subject: SubjectMode): string {
  if (subject === "product_only") {
    return [
      "SUBJECT MODE — PRODUCT ONLY:",
      "- No human model appears in this image.",
      "- Focus on the product itself: form, material, scale, surface, packaging.",
      "- Avoid drawing in any face, hand, body, or human silhouette.",
      "- If a hand or body part feels implied by the prompt, instead replace it with a tasteful object interaction (a surface, a stand, a prop) that preserves the requested scene.",
      "- Compose like a product photographer would: deliberate angle, deliberate scale, deliberate negative space.",
    ].join("\n");
  }
  return [
    "SUBJECT MODE — PRODUCT WITH MODEL:",
    "- A real human model must appear in this image alongside the product.",
    "- Preserve the model's identity from the reference images.",
    "- The product and the person must interact realistically.",
  ].join("\n");
}
