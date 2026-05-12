import type { GenerationMode } from "@/lib/services/generation/payload-schema";

export function buildOutputIntentBlock(mode: GenerationMode): string {
  switch (mode) {
    case "ugc_composite_generation":
      return [
        "FINAL OUTPUT INTENT:",
        "Produce a commercially usable, realistic product lifestyle image that could plausibly be posted by an influencer, creator, or brand as authentic UGC-style content.",
      ].join("\n");
    case "image_refinement":
      return [
        "FINAL OUTPUT INTENT:",
        "Produce a controlled, high-fidelity revision of the selected image that satisfies the user's request while preserving the approved visual foundation.",
      ].join("\n");
    case "approved_style_variation":
      return [
        "FINAL OUTPUT INTENT:",
        "Produce a natural variation that retains the approved image's realism, identity, product fidelity, and overall composition language.",
      ].join("\n");
  }
}
