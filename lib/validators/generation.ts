import { z } from "zod";
import {
  ASPECT_RATIOS,
  AUTHENTICITY_LEVELS,
  CAMERA_ANGLES,
  FRAMINGS,
  LENS_TYPES,
  LIGHTINGS,
  PRODUCT_PROMINENCES,
  SHOT_TYPES,
} from "@/types";

export const photographyControlsSchema = z.object({
  shotType: z.enum(SHOT_TYPES),
  cameraAngle: z.enum(CAMERA_ANGLES),
  lensType: z.enum(LENS_TYPES),
  framing: z.enum(FRAMINGS),
  lighting: z.enum(LIGHTINGS),
  authenticityLevel: z.enum(AUTHENTICITY_LEVELS),
  productProminence: z.enum(PRODUCT_PROMINENCES),
  outputAspectRatio: z.enum(ASPECT_RATIOS),
  numberOfVariations: z.coerce.number().int().min(1).max(4),
});

export const generationStartSchema = z.object({
  projectId: z.string().uuid(),
  modelId: z.string().uuid(),
  productId: z.string().uuid(),
  scenePrompt: z.string().min(8, "Describe the scene in a sentence or two.").max(800),
  controls: photographyControlsSchema,
});

export const refinementStartSchema = z.object({
  sourceImageId: z.string().uuid(),
  refinementPrompt: z.string().min(3).max(500),
});

export const variationStartSchema = z.object({
  approvedImageId: z.string().uuid(),
  variationRequest: z.string().max(500).optional().nullable(),
  count: z.coerce.number().int().min(1).max(4).optional(),
});

export const targetChannelSchema = z.enum([
  "instagram",
  "tiktok",
  "amazon",
  "shopify",
  "youtube",
  "general",
]);

export const projectCreateSchema = z.object({
  title: z.string().min(1, "Give the project a title.").max(80),
  description: z.string().max(400).optional().nullable(),
  selected_model_id: z.string().uuid().optional().nullable(),
  selected_product_id: z.string().uuid().optional().nullable(),
  target_channel: targetChannelSchema.default("general"),
});

export const projectUpdateSchema = projectCreateSchema.extend({
  id: z.string().uuid(),
});

export type PhotographyControlsInput = z.infer<typeof photographyControlsSchema>;
export type GenerationStartInput = z.infer<typeof generationStartSchema>;
export type RefinementStartInput = z.infer<typeof refinementStartSchema>;
export type VariationStartInput = z.infer<typeof variationStartSchema>;
