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
import {
  ALL_OUTPUT_SCOPES,
  ALL_PLATFORM_TARGETS,
  ALL_STYLE_MODES,
  ALL_SUBJECT_MODES,
} from "@/lib/services/generation/payload-schema";

export const subjectModeSchema = z.enum(
  ALL_SUBJECT_MODES as unknown as [string, ...string[]]
);
export const styleModeSchema = z.enum(
  ALL_STYLE_MODES as unknown as [string, ...string[]]
);
export const outputScopeSchema = z.enum(
  ALL_OUTPUT_SCOPES as unknown as [string, ...string[]]
);
export const platformTargetSchema = z.enum(
  ALL_PLATFORM_TARGETS as unknown as [string, ...string[]]
);

export const packPlanSchema = z.object({
  projectId: z.string().uuid(),
  scope: outputScopeSchema,
  subjectMode: subjectModeSchema,
  styleMode: styleModeSchema,
  conceptDescription: z.string().min(8).max(2000),
  selectedPlatforms: z.array(platformTargetSchema).min(1).max(10),
  requestedConceptCount: z.coerce.number().int().min(1).max(6).optional(),
});

export const packRunSchema = packPlanSchema.extend({
  modelId: z.string().uuid().optional().nullable(),
  productId: z.string().uuid(),
  title: z.string().min(1).max(120).optional(),
  description: z.string().max(600).optional().nullable(),
});

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
  // modelId is optional now — required only when subjectMode === product_with_model.
  modelId: z.string().uuid().optional().nullable(),
  productId: z.string().uuid(),
  scenePrompt: z.string().min(8, "Describe the scene in a sentence or two.").max(800),
  controls: photographyControlsSchema,
  subjectMode: subjectModeSchema.optional().default("product_with_model"),
  styleMode: styleModeSchema.optional().default("ugc"),
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
  subject_mode: subjectModeSchema.optional().default("product_with_model"),
  style_mode: styleModeSchema.optional().default("ugc"),
  output_scope: outputScopeSchema.optional().default("single_image"),
  selected_platforms: z.array(platformTargetSchema).optional().default([]),
});

export const projectUpdateSchema = projectCreateSchema.extend({
  id: z.string().uuid(),
});

export type PhotographyControlsInput = z.infer<typeof photographyControlsSchema>;
export type GenerationStartInput = z.infer<typeof generationStartSchema>;
export type RefinementStartInput = z.infer<typeof refinementStartSchema>;
export type VariationStartInput = z.infer<typeof variationStartSchema>;
export type PackPlanInput = z.infer<typeof packPlanSchema>;
export type PackRunInput = z.infer<typeof packRunSchema>;
