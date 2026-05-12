import "server-only";

import { toFile } from "openai/uploads";
import { getOpenAIClient } from "@/lib/openai/client";
import { serverEnv } from "@/lib/env";
import { getSupabaseServiceClient } from "@/lib/supabase/service";
import {
  ASSETS_BUCKET,
  buildStoragePath,
  downloadAsset,
  uploadServerBytes,
} from "@/lib/supabase/storage";
import {
  buildStructuredPayload,
  renderPromptFromPayload,
  aspectRatioToImageSize,
} from "@/lib/services/generation-payload-builder";
import type {
  PhotographyControls,
  StructuredGenerationPayload,
  GenerationStatus,
} from "@/types";

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

// Loads model + product + their image rows, builds the payload, sends the
// request to GPT Image 2, uploads each output to storage, persists rows.
//
// Returns immediately with a request id once everything is queued. For MVP
// we run it inline (no queue). The status lifecycle is still respected so
// a worker can be added later without touching the public surface.
export async function runGeneration(
  args: RunGenerationArgs
): Promise<RunGenerationResult> {
  const env = serverEnv();
  const svc = getSupabaseServiceClient();

  // 1. Load model + product + reference image paths -------------------------
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
  const modelImages = (model.model_images ?? []) as ImgRow[];
  const productImages = (product.product_images ?? []) as ImgRow[];
  modelImages.sort((a, b) => a.sort_order - b.sort_order);
  productImages.sort((a, b) => a.sort_order - b.sort_order);

  if (modelImages.length === 0) throw new Error("Model has no reference images");
  if (productImages.length === 0) throw new Error("Product has no reference images");

  // 2. Build payload --------------------------------------------------------
  const preservationNotes =
    typeof product.preservation_rules_json === "object" &&
    product.preservation_rules_json !== null &&
    "notes" in product.preservation_rules_json
      ? ((product.preservation_rules_json as { notes?: string }).notes ?? null)
      : null;

  const payload: StructuredGenerationPayload = buildStructuredPayload({
    scenePrompt: args.scenePrompt,
    controls: args.controls,
    model: { name: model.name, description: model.description },
    product: {
      name: product.name,
      brand_name: product.brand_name,
      category: product.category,
      description: product.description,
      preservation_notes: preservationNotes,
    },
  });
  const prompt = renderPromptFromPayload(payload);

  // 3. Insert generation_requests row in `generating` state -----------------
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

  // 4. Fetch reference bytes from storage. We cap at 5 + 5 to keep the
  //    multipart payload reasonable.
  try {
    const refModel = await Promise.all(
      modelImages.slice(0, 5).map(async (i, idx) => {
        const blob = await downloadAsset(i.storage_path);
        return toFile(Buffer.from(await blob.arrayBuffer()), `model-${idx}.jpg`, {
          type: "image/jpeg",
        });
      })
    );
    const refProduct = await Promise.all(
      productImages.slice(0, 5).map(async (i, idx) => {
        const blob = await downloadAsset(i.storage_path);
        return toFile(Buffer.from(await blob.arrayBuffer()), `product-${idx}.jpg`, {
          type: "image/jpeg",
        });
      })
    );
    const allRefs = [...refModel, ...refProduct];
    const size = aspectRatioToImageSize(args.controls.outputAspectRatio);

    // 5. Call GPT Image 2 -------------------------------------------------
    const client = getOpenAIClient();
    const generation = await client.images.edit({
      model: env.OPENAI_IMAGE_MODEL,
      image: allRefs,
      prompt,
      size,
      n: Math.max(1, Math.min(4, args.controls.numberOfVariations)),
    });

    if (!generation.data || generation.data.length === 0) {
      throw new Error("OpenAI returned no images");
    }

    // 6. Persist each output --------------------------------------------
    const insertedIds: string[] = [];
    for (let i = 0; i < generation.data.length; i++) {
      const out = generation.data[i];
      const b64 = out.b64_json;
      if (!b64) continue;
      const bytes = Buffer.from(b64, "base64");
      const filename = `${Date.now()}-${i}.png`;
      const storagePath = buildStoragePath(
        "generated",
        args.userId,
        [args.projectId, requestId],
        filename
      );
      await uploadServerBytes(storagePath, bytes, "image/png");

      const { data: row, error: rowErr } = await svc
        .from("generated_images")
        .insert({
          generation_request_id: requestId,
          project_id: args.projectId,
          user_id: args.userId,
          storage_path: storagePath,
          prompt_used: prompt,
          metadata_json: {
            size,
            model: env.OPENAI_IMAGE_MODEL,
            variation_index: i,
          },
        })
        .select("id")
        .single();
      if (!rowErr && row) insertedIds.push(row.id as string);
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

// Used by the route handler to poll status from the client.
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

// Re-export for callers that need the bucket name.
export { ASSETS_BUCKET };
