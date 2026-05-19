"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/supabase/server";
import { runGeneration } from "@/lib/services/image-generation-service";
import { runProductReproduction } from "@/lib/services/scaling/product-reproduction-workflow";
import {
  ALL_CREATION_MODES,
  ALL_PRODUCT_REPRODUCTION_STYLES,
  ALL_QUALITY_PRIORITIES,
} from "@/lib/services/generation/payload-schema";
import type { PhotographyControls } from "@/types";

// ============================================================================
// createFromStudio
// Single-shot creation surface action — fast-path equivalent of New Project +
// Generate. Used by /studio.
//
// Flow:
//   1. Validate input (mode-aware).
//   2. Insert a new projects row stamped with the chosen creation_mode +
//      quality_priority + subject_mode + style_mode.
//   3. Kick off the right workflow (Mode A: product reproduction;
//      Mode B: UGC composite) synchronously inside this request.
//   4. Return the new projectId + generatedImageIds and revalidate /studio
//      so the inline gallery re-renders with the new image. The browser
//      stays on /studio — no redirect — preserving the chat-style flow.
// ============================================================================

const studioInputSchema = z.object({
  creationMode: z.enum(ALL_CREATION_MODES as unknown as [string, ...string[]]),
  productId: z.string().uuid(),
  modelId: z.string().uuid().optional().nullable(),
  scenePrompt: z.string().min(8).max(2000),
  qualityPriority: z
    .enum(ALL_QUALITY_PRIORITIES as unknown as [string, ...string[]])
    .optional()
    .default("auto"),
  stylePreset: z
    .enum(ALL_PRODUCT_REPRODUCTION_STYLES as unknown as [string, ...string[]])
    .optional(),
  aspectRatio: z.enum(["1:1", "4:5", "9:16", "16:9"]).optional().default("4:5"),
});

export type StudioInput = z.infer<typeof studioInputSchema>;

export type StudioActionResult =
  | { ok: false; message: string }
  | { ok: true; projectId: string; generatedImageIds: string[] }
  | null;

// Default photography controls — same shape Mode B uses, lightly tuned for
// "fast path." User can refine later on the project page.
function defaultControls(aspectRatio: "1:1" | "4:5" | "9:16" | "16:9"): PhotographyControls {
  return {
    shotType: "candid_lifestyle",
    cameraAngle: "eye_level",
    lensType: "smartphone_portrait",
    framing: "medium_close_up",
    lighting: "soft_window_light",
    authenticityLevel: "natural_influencer",
    productProminence: "balanced",
    outputAspectRatio: aspectRatio,
    numberOfVariations: 1,
  };
}

function projectTitleFromScene(scene: string): string {
  const trimmed = scene.trim().slice(0, 60);
  return trimmed.length === 0
    ? `Studio shot · ${new Date().toLocaleDateString()}`
    : trimmed;
}

export async function createFromStudioAction(
  _prev: StudioActionResult,
  formData: FormData
): Promise<StudioActionResult> {
  try {
    const parsed = studioInputSchema.parse({
      creationMode: formData.get("creationMode"),
      productId: formData.get("productId"),
      modelId: formData.get("modelId") || null,
      scenePrompt: formData.get("scenePrompt"),
      qualityPriority: formData.get("qualityPriority") || "auto",
      stylePreset: formData.get("stylePreset") || undefined,
      aspectRatio: formData.get("aspectRatio") || "4:5",
    });

    if (parsed.creationMode === "ugc_model_product" && !parsed.modelId) {
      return { ok: false, message: "Pick a model for UGC mode." };
    }

    const { supabase, user } = await requireUser();
    const isProductOnly = parsed.creationMode === "product_reproduction";

    const { data: project, error: projectErr } = await supabase
      .from("projects")
      .insert({
        user_id: user.id,
        title: projectTitleFromScene(parsed.scenePrompt),
        description: null,
        selected_model_id: isProductOnly ? null : parsed.modelId,
        selected_product_id: parsed.productId,
        target_channel: "general",
        creation_mode: parsed.creationMode,
        quality_priority: parsed.qualityPriority,
        subject_mode: isProductOnly ? "product_only" : "product_with_model",
        style_mode: isProductOnly ? "studio" : "ugc",
        output_scope: "single_image",
        selected_platforms_json: [],
      })
      .select("id")
      .single();
    if (projectErr || !project) {
      return {
        ok: false,
        message: `Failed to create project: ${projectErr?.message ?? "unknown"}`,
      };
    }
    const createdProjectId = project.id as string;

    // Branch on creation mode. Both workflows run synchronously.
    let generatedImageIds: string[] = [];
    if (isProductOnly) {
      const result = await runProductReproduction({
        userId: user.id,
        projectId: createdProjectId,
        productId: parsed.productId,
        styles: [parsed.stylePreset ?? "studio_white_background"] as Parameters<
          typeof runProductReproduction
        >[0]["styles"],
        selectedPlatforms: [],
        selectedRatios: [parsed.aspectRatio],
        generateAllFormats: false,
        scope: "single_image",
        qualityPriority: parsed.qualityPriority as Parameters<
          typeof runProductReproduction
        >[0]["qualityPriority"],
        intentNotes: parsed.scenePrompt,
      });
      if (result.status === "failed") {
        return {
          ok: false,
          message: result.errorMessage ?? "Generation failed",
        };
      }
      generatedImageIds = result.generatedImageIds;
    } else {
      const result = await runGeneration({
        userId: user.id,
        projectId: createdProjectId,
        modelId: parsed.modelId!,
        productId: parsed.productId,
        scenePrompt: parsed.scenePrompt,
        controls: defaultControls(parsed.aspectRatio),
        subjectMode: "product_with_model",
        styleMode: "ugc",
      });
      if (result.status === "failed") {
        return {
          ok: false,
          message: result.errorMessage ?? "Generation failed",
        };
      }
      generatedImageIds = result.generatedImageIds;
    }

    // Re-render /studio so the new image shows up in the inline gallery
    // without a hard redirect away from the chat surface.
    revalidatePath("/studio");
    return { ok: true, projectId: createdProjectId, generatedImageIds };
  } catch (err) {
    if (err instanceof z.ZodError) {
      return {
        ok: false,
        message: err.issues.map((i) => i.message).join(", "),
      };
    }
    return {
      ok: false,
      message: err instanceof Error ? err.message : "Unknown error",
    };
  }
}
