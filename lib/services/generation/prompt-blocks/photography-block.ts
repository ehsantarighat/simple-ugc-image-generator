import type { PhotographySpecification } from "@/lib/services/generation/payload-schema";
import {
  CAMERA_ANGLE_PROMPT_MAP,
  FRAMING_PROMPT_MAP,
  LENS_PROMPT_MAP,
  LIGHTING_PROMPT_MAP,
  PRODUCT_PROMINENCE_PROMPT_MAP,
  SHOT_TYPE_PROMPT_MAP,
} from "@/lib/services/generation/control-mappings";

export function buildPhotographyBlock(p: PhotographySpecification): string {
  return [
    "PHOTOGRAPHY DIRECTION:",
    `- Shot type: ${SHOT_TYPE_PROMPT_MAP[p.shotType]}`,
    `- Camera angle: ${CAMERA_ANGLE_PROMPT_MAP[p.cameraAngle]}`,
    `- Lens / camera feel: ${LENS_PROMPT_MAP[p.lensType]}`,
    `- Framing: ${FRAMING_PROMPT_MAP[p.framing]}`,
    `- Lighting: ${LIGHTING_PROMPT_MAP[p.lighting]}`,
    `- Product prominence: ${PRODUCT_PROMINENCE_PROMPT_MAP[p.productProminence]}`,
  ].join("\n");
}
