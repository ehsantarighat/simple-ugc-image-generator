import "server-only";

// ----------------------------------------------------------------------------
// Quality review service.
// Spec section 19. Schema-ready. Real implementation is deferred.
//
// When implemented, this should send the generated image + the original
// model/product reference images + the structured request to a vision-capable
// model, ask it to score realism/identity/fidelity/adherence/usability and
// emit JSON conforming to GeneratedImageReview. The result lands in
// generated_images.review_json.
// ----------------------------------------------------------------------------

export interface GeneratedImageReview {
  realismScore: number; // 1-5
  modelIdentityScore: number; // 1-5
  productFidelityScore: number; // 1-5
  promptAdherenceScore: number; // 1-5
  commercialUsabilityScore: number; // 1-5
  majorIssues: string[];
  minorIssues: string[];
  recommendedAction:
    | "accept"
    | "regenerate"
    | "refine_product"
    | "refine_model"
    | "refine_hands"
    | "refine_scene";
}

export async function reviewGeneratedImage(_args: {
  userId: string;
  generatedImageId: string;
}): Promise<GeneratedImageReview | null> {
  return null;
}
