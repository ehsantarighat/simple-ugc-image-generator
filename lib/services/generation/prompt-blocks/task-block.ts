import type { GenerationMode } from "@/lib/services/generation/payload-schema";

const TASK_TEXT: Record<GenerationMode, string> = {
  ugc_composite_generation: [
    "Create a final hyper-realistic influencer-style product photograph.",
    "",
    "This is not a concept sketch, not an illustration, and not a CGI render. The result must look like a real photograph captured in a believable everyday environment.",
  ].join("\n"),
  image_refinement: [
    "Create a refined version of the selected generated image.",
    "",
    "The selected generated image is the primary composition reference. Preserve its overall scene, model identity, product identity, layout, and visual direction unless the user's refinement request explicitly changes them.",
  ].join("\n"),
  approved_style_variation: [
    "Create a closely related visual variation based on the approved reference image.",
    "",
    "The approved generated image defines the desired realism level, mood, visual style, and general composition language.",
  ].join("\n"),
  product_only_studio_generation: [
    "Create a final hyper-realistic studio-style product photograph featuring only the product.",
    "",
    "This should look like a clean, intentionally composed commercial product shot taken in a real studio. No human model is present.",
  ].join("\n"),
  product_only_lifestyle_generation: [
    "Create a final hyper-realistic lifestyle product photograph featuring only the product within a believable real environment.",
    "",
    "No human model is present in this image. The product sits naturally inside a real-world scene.",
  ].join("\n"),
  product_model_studio_generation: [
    "Create a final hyper-realistic studio-style product photograph that includes the model interacting with the product in a polished, controlled setup.",
  ].join("\n"),
  pack_anchor_generation: [
    "Create a strong anchor photograph for this content concept.",
    "",
    "This anchor image will serve as the canonical visual reference for additional ratio and composition variations later. Treat it as the hero shot of the concept.",
  ].join("\n"),
  pack_variation_generation: [
    "Re-shoot the approved anchor image for a new aspect ratio and/or platform without changing the subject or product.",
  ].join("\n"),
};

export function buildTaskBlock(mode: GenerationMode): string {
  return TASK_TEXT[mode];
}
