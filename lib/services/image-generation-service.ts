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

export interface RunGenerationArgs {
  userId: string;
  projectId: string;
  modelId: string;
  productId: string;
  scenePrompt: string;
  controls: PhotographyControls;
}

export interface RunGenerationResult {
  generationRequestId: string;
  status: GenerationStatus;
  generatedImageIds: string[];
  errorMessage?: string;
}

// ----------------------------------------------------------------------------
// Mode A — ugc_composite_generation
//
// Orchestrates the pipeline. The actual prompt and request shape are built by
// pure functions in lib/services/generation/. This function only sequences
// DB writes, storage uploads, and the single OpenAI call.
// ----------------------------------------------------------------------------
export async function runGeneration(
  args: RunGenerationArgs
): Promise<RunGenerationResult> {
  const env = serverEnv();
  const svc = getSupabaseServiceClient();

  // 1. Load model + product + reference image rows -------------------------
  const [{ data: model, error: modelErr }, { data: product, error: productErr }] =
    await Promise.all([
      svc
        .from("models")
        .select("id, name, description, model_images(storage_path, sort_order)")
        .eq("id", args.modelId)
        .eq("user_id", args.userId)
        .single(),
      svc
        .from("products")
        .select(
          "id, name, brand_name, category, description, preservation_rules_json, product_images(storage_path, sort_order)"
        )
        .eq("id", args.productId)
        .eq("user_id", args.userId)
        .single(),
    ]);
  if (modelErr || !model) throw new Error("Model not found or not owned by user");
  if (productErr || !product) throw new Error("Product not found or not owned by user");

  type ImgRow = { storage_path: string; sort_order: number };
  const modelImages = selectModelReferences((model.model_images ?? []) as ImgRow[]);
  const productImages = selectProductReferences((product.product_images ?? []) as ImgRow[]);
  if (modelImages.length === 0) throw new Error("Model has no reference images");
  if (productImages.length === 0) throw new Error("Product has no reference images");

  // 2. Build structured payload + prompt -----------------------------------
  const preservationNotes =
    typeof product.preservation_rules_json === "object" &&
    product.preservation_rules_json !== null &&
    "notes" in product.preservation_rules_json
      ? ((product.preservation_rules_json as { notes?: string }).notes ?? null)
      : null;

  const payload = buildStructuredPayload({
    mode: "ugc_composite_generation",
    scenePrompt: args.scenePrompt,
    controls: args.controls,
    model: { name: model.name, description: model.description },
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

  // 3. Persist a `generating` request row ---------------------------------
  const { data: requestRow, error: insertErr } = await svc
    .from("generation_requests")
    .insert({
      project_id: args.projectId,
      user_id: args.userId,
      model_id: args.modelId,
      product_id: args.productId,
      raw_scene_prompt: args.scenePrompt,
      structured_payload_json: payload,
      controls_json: args.controls,
      status: "generating" as GenerationStatus,
    })
    .select("id")
    .single();
  if (insertErr || !requestRow) {
    throw new Error(`Failed to create generation request: ${insertErr?.message}`);
  }
  const requestId = requestRow.id as string;

  // 4. Fetch reference bytes, call OpenAI, persist outputs ----------------
  try {
    const refModel = await Promise.all(
      modelImages.map(async (i, idx) => {
        const blob = await downloadAsset(i.storage_path);
        return toFile(Buffer.from(await blob.arrayBuffer()), `model-${idx}.jpg`, {
          type: "image/jpeg",
        });
      })
    );
    const refProduct = await Promise.all(
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
            mode: payload.mode,
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
