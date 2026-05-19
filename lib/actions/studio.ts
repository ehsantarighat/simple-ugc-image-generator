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
// Fast-path creation surface action used by /studio. CRITICAL DESIGN:
//
// The OpenAI image-edit call takes 30–90 seconds. Hosting proxies (Railway's,
// Vercel's edge, most CDNs) commonly kill HTTP responses that don't return in
// time, producing 502s before our server-side code ever finishes. To avoid
// that class of failure, we:
//
//   1. Synchronously do the cheap work — validate input, insert the projects
//      row — and return projectId in <1 second.
//   2. Kick off the actual generation as a DETACHED Promise. Railway (and
//      similar long-lived Node hosts) keep the Node process alive between
//      requests, so the workflow continues to run after the HTTP response is
//      already on the wire.
//   3. The client polls /studio (via router.refresh) until the new image
//      lands in the gallery query, then stops.
//
// This pattern is not safe on serverless platforms that freeze the function
// when the response is sent (Lambda, Vercel Functions). It IS safe on
// Railway, Render, Fly, and any long-lived Node host. If we ever move to
// serverless, replace this with a real queue + worker.
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
  | { ok: true; projectId: string; queued: true }
  | null;

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
    const userId = user.id;

    // Detach the workflow. We DO NOT await it. Node's event loop keeps it
    // alive after we return; Railway keeps the process alive between
    // requests. Errors are written to generation_requests.error_message by
    // the workflow itself, and surfaced to the gallery via revalidatePath.
    if (isProductOnly) {
      void runProductReproduction({
        userId,
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
      })
        .then(() => {
          revalidatePath("/studio");
        })
        .catch((err: unknown) => {
          // eslint-disable-next-line no-console
          console.error("[studio] background reproduction failed:", err);
          revalidatePath("/studio");
        });
    } else {
      void runGeneration({
        userId,
        projectId: createdProjectId,
        modelId: parsed.modelId!,
        productId: parsed.productId,
        scenePrompt: parsed.scenePrompt,
        controls: defaultControls(parsed.aspectRatio),
        subjectMode: "product_with_model",
        styleMode: "ugc",
      })
        .then(() => {
          revalidatePath("/studio");
        })
        .catch((err: unknown) => {
          // eslint-disable-next-line no-console
          console.error("[studio] background generation failed:", err);
          revalidatePath("/studio");
        });
    }

    return { ok: true, projectId: createdProjectId, queued: true };
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
