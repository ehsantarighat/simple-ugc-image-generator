import type { GenerationMode } from "@/lib/services/generation/payload-schema";

export function buildTaskBlock(mode: GenerationMode): string {
  switch (mode) {
    case "ugc_composite_generation":
      return [
        "Create a final hyper-realistic influencer-style product photograph.",
        "",
        "This is not a concept sketch, not an illustration, and not a CGI render. The result must look like a real photograph captured in a believable everyday environment.",
      ].join("\n");
    case "image_refinement":
      return [
        "Create a refined version of the selected generated image.",
        "",
        "The selected generated image is the primary composition reference. Preserve its overall scene, model identity, product identity, layout, and visual direction unless the user's refinement request explicitly changes them.",
      ].join("\n");
    case "approved_style_variation":
      return [
        "Create a closely related visual variation based on the approved reference image.",
        "",
        "The approved generated image defines the desired realism level, mood, visual style, and general composition language.",
      ].join("\n");
  }
}
