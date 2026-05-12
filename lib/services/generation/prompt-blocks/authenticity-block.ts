import type { PhotographySpecification } from "@/lib/services/generation/payload-schema";
import { AUTHENTICITY_PROMPT_MAP } from "@/lib/services/generation/control-mappings";

export function buildAuthenticityBlock(p: PhotographySpecification): string {
  return [
    "UGC AUTHENTICITY:",
    `- Desired content feel: ${AUTHENTICITY_PROMPT_MAP[p.authenticityLevel]}`,
    "- The image should feel like real influencer or creator content, not a sterile studio ad.",
    "- Preserve natural environmental imperfections where appropriate.",
    "- Use subtle, believable asymmetry in framing and pose if it supports realism.",
    "- The model should look alive and naturally present in the moment, not mannequin-like.",
  ].join("\n");
}
