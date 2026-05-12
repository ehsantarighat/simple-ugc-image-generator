import "server-only";

import { toFile, type Uploadable } from "openai/uploads";
import { serverEnv } from "@/lib/env";
import { getSupabaseServiceClient } from "@/lib/supabase/service";
import {
  ASSETS_BUCKET,
  buildStoragePath,
  downloadAsset,
  uploadServerBytes,
} from "@/lib/supabase/storage";
import { buildStructuredPayload } from "@/lib/services/generation/build-structured-payload";
import { buildGenerationPrompt } from "@/lib/services/generation/build-generation-prompt";
import { callOpenAIImageEdit } from "@/lib/services/generation/openai-image-edit";
import {
  selectModelReferences,
  selectProductReferences,
} from "@/lib/services/generation/reference-image-selection";
import type { PhotographyControls, GenerationStatus } from "@/types";
import type {
  GenerationMode,
  StyleMode,
  SubjectMode,
} from "@/lib/services/generation/payload-schema";

export interface RunGenerationArgs {
  userId: string;
  projectId: string;
  // modelId is required when subjectMode === product_with_model.
  modelId: string | null;
  productId: string;
  scenePrompt: string;
  controls: PhotographyControls;
  subjectMode: SubjectMode;
  styleMode: StyleMode;
  // Optional generation-mode override. If omitted, derived from subject+style.
  modeOverride?: GenerationMode;
  // For pack jobs.
  packId?: string;
  conceptId?: string;
}

export interface RunGenerationResult {
  generationRequestId: string;
  status: GenerationStatus;
  generatedImageIds: string[];
  errorMessage?: string;
}

// Pick the right top-level generation mode from subject + style choices.
export function deriveGenerationMode(args: {
  subjectMode: SubjectMode;
  styleMode: StyleMode;
}): GenerationMode {
  if (args.subjectMode === "product_only") {
    return args.styleMode === "studio"
      ? "product_only_studio_generation"
      : "product_only_lifestyle_generation";
  }
  // product_with_model
  if (args.styleMode === "studio") return "product_model_studio_generation";
  // lifestyle / ugc / hybrid with a model — keep the existing UGC composite path.
  return "ugc_composite_generation";
}

export async function runGeneration(
  args: RunGenerationArgs
): Promise<RunGenerationResult> {
  const env = serverEnv();
  const svc = getSupabaseServiceClient();

  const mode = args.modeOverride ?? deriveGenerationMode(args);

  // -- Load model (optional) + product + reference rows ---------------------
  type ImgRow = { storage_path: string; sort_order: number };
  let model: { id: string; name: string; description: string | null } | null = null;
  let modelImages: ImgRow[] = [];

  if (args.subjectMode === "product_with_model") {
    if (!args.modelId) {
      throw new Error("modelId is required when subjectMode === 'product_with_model'");
    }
    const { data, error } = await svc
      .from("models")
      .select("id, name, description, model_images(storage_path, sort_order)")
      .eq("id", args.modelId)
      .eq("user_id", args.userId)
      .single();
    if (error || !data) throw new Error("Model not found or not owned by user");
    model = { id: data.id, name: data.name, description: data.description };
    modelImages = selectModelReferences((data.model_images ?? []) as ImgRow[]);
    if (modelImages.length === 0) throw new Error("Model has no reference images");
  }

  const { data: product, error: productErr } = await svc
    .from("products")
    .select(
      "id, name, brand_name, category, description, preservation_rules_json, product_images(storage_path, sort_order)"
    )
    .eq("id", args.productId)
    .eq("user_id", args.userId)
    .single();
  if (productErr || !product) throw new Error("Product not found or not owned by user");
  const productImages = selectProductReferences(
    (product.product_images ?? []) as ImgRow[]
  );
  if (productImages.length === 0) throw new Error("Product has no reference images");

  const preservationNotes =
    typeof product.preservation_rules_json === "object" &&
    product.preservation_rules_json !== null &&
    "notes" in product.preservation_rules_json
      ? ((product.preservation_rules_json as { notes?: string }).notes ?? null)
      : null;

  // -- Look up project context (output scope) for the payload --------------
  const { data: project } = await svc
    .from("projects")
    .select("output_scope")
    .eq("id", args.projectId)
    .eq("user_id", args.userId)
    .single();
  const outputScope = (project?.output_scope ?? "single_image") as
    | "single_image"
    | "few_variations"
    | "multi_format_pack"
    | "multi_concept_pack"
    | "full_campaign_pack";

  // -- Build payload + prompt ----------------------------------------------
  const payload = buildStructuredPayload({
    mode,
    scenePrompt: args.scenePrompt,
    controls: args.controls,
    subjectMode: args.subjectMode,
    styleMode: args.styleMode,
    outputScope,
    model: model ? { name: model.name, description: model.description } : null,
    product: {
      name: product.name,
      brandName: product.brand_name,
      category: product.category,
      description: product.description,
      preservationNotes,
    },
  });
  const prompt = buildGenerationPrompt({
    payload,
    modelImageCount: modelImages.length,
    productImageCount: productImages.length,
  });

  // -- Persist a `generating` request row ----------------------------------
  const { data: requestRow, error: insertErr } = await svc
    .from("generation_requests")
    .insert({
      project_id: args.projectId,
      user_id: args.userId,
      model_id: model?.id ?? null,
      product_id: args.productId,
      raw_scene_prompt: args.scenePrompt,
      structured_payload_json: payload,
      controls_json: args.controls,
      generation_mode: mode,
      pack_id: args.packId ?? null,
      concept_id: args.conceptId ?? null,
      status: "generating" as GenerationStatus,
    })
    .select("id")
    .single();
  if (insertErr || !requestRow) {
    throw new Error(`Failed to create generation request: ${insertErr?.message}`);
  }
  const requestId = requestRow.id as string;

  try {
    const refModel: Uploadable[] = await Promise.all(
      modelImages.map(async (i, idx) => {
        const blob = await downloadAsset(i.storage_path);
        return toFile(Buffer.from(await blob.arrayBuffer()), `model-${idx}.jpg`, {
          type: "image/jpeg",
        });
      })
    );
    const refProduct: Uploadable[] = await Promise.all(
      productImages.map(async (i, idx) => {
        const blob = await downloadAsset(i.storage_path);
        return toFile(Buffer.from(await blob.arrayBuffer()), `product-${idx}.jpg`, {
          type: "image/jpeg",
        });
      })
    );
    const allRefs: Uploadable[] = [...refModel, ...refProduct];

    const { images: pngBuffers } = await callOpenAIImageEdit({
      model: env.OPENAI_IMAGE_MODEL,
      prompt,
      images: allRefs,
      output: payload.output,
    });

    const insertedIds: string[] = [];
    for (let i = 0; i < pngBuffers.length; i++) {
      const filename = `${Date.now()}-${i}.png`;
      const storagePath = buildStoragePath(
        "generated",
        args.userId,
        [args.projectId, requestId],
        filename
      );
      await uploadServerBytes(storagePath, pngBuffers[i], "image/png");

      const { data: row } = await svc
        .from("generated_images")
        .insert({
          generation_request_id: requestId,
          project_id: args.projectId,
          user_id: args.userId,
          storage_path: storagePath,
          prompt_used: prompt,
          metadata_json: {
            size: payload.output.size,
            model: env.OPENAI_IMAGE_MODEL,
            generation_mode: mode,
            subject_mode: args.subjectMode,
            style_mode: args.styleMode,
            output_scope: outputScope,
            variation_index: i,
            product_category: payload.product.inferredCategory,
            product_interaction: payload.scene.productInteraction,
          },
        })
        .select("id")
        .single();
      if (row) insertedIds.push(row.id as string);
    }

    await svc
      .from("generation_requests")
      .update({ status: "completed" as GenerationStatus })
      .eq("id", requestId);

    return {
      generationRequestId: requestId,
      status: "completed",
      generatedImageIds: insertedIds,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await svc
      .from("generation_requests")
      .update({ status: "failed" as GenerationStatus, error_message: msg })
      .eq("id", requestId);
    return {
      generationRequestId: requestId,
      status: "failed",
      generatedImageIds: [],
      errorMessage: msg,
    };
  }
}

export async function getGenerationRequestStatus(
  userId: string,
  generationRequestId: string
) {
  const svc = getSupabaseServiceClient();
  const { data, error } = await svc
    .from("generation_requests")
    .select("id, status, error_message")
    .eq("id", generationRequestId)
    .eq("user_id", userId)
    .single();
  if (error || !data) return null;
  return data;
}

export { ASSETS_BUCKET };
