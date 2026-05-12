import "server-only";

import type { QualityReview } from "@/types";

// MVP stub. Schema-ready for an AI-assisted review pass. Today, we just
// return null so the UI can show "no review yet" without blocking.
//
// To implement later:
//   - Take the generated image + source model + source product references
//   - Send to a vision-capable text model
//   - Ask for a JSON object scoring modelSimilarity, productFidelity, realism,
//     promptMatch (1-5 each) plus a short freeform `notes` field
//   - Persist into generated_images.review_json
export async function reviewGeneratedImage(_args: {
  userId: string;
  generatedImageId: string;
}): Promise<QualityReview | null> {
  return null;
}
