import "server-only";

import { toFile, type Uploadable } from "openai/uploads";
import { serverEnv } from "@/lib/env";
import { getSupabaseServiceClient } from "@/lib/supabase/service";
import {
  buildStoragePath,
  downloadAsset,
  uploadServerBytes,
} from "@/lib/supabase/storage";
import { buildStructuredPayload } from "@/lib/services/generation/build-structured-payload";
import { buildVariationPrompt } from "@/lib/services/generation/build-variation-prompt";
import { callOpenAIImageEdit } from "@/lib/services/generation/openai-image-edit";
import {
  selectModelReferences,
  selectProductReferences,
} from "@/lib/services/generation/reference-image-selection";
import type { GenerationStatus, PhotographyControls } from "@/types";

export interface RunVariationArgs {
  userId: string;
  approvedImageId: string; // generated_images.id of the user-approved output
  variationRequest?: string | null;
  count?: number; // 1-4, default 3
}

export interface RunVariationResult {
  generatedImageIds: string[];
  status: GenerationStatus;
  errorMessage?: string;
}

// ----------------------------------------------------------------------------
// Mode C — approved_style_variation.
//
// Takes an approved generated image and produces N visually-consistent
// variations. Outputs are stored as child generated_images rows linked to
// the approved image via parent_image_id.
// ----------------------------------------------------------------------------
export async function runVariation(args: RunVariationArgs): Promise<RunVariationResult> {
  const env = serverEnv();
  const svc = getSupabaseServiceClient();
  const desiredCount = Math.max(1, Math.min(4, args.count ?? 3));

  const { data: approved, error: approvedErr } = await svc
    .from("generated_images")
    .select(
      `id, storage_path, project_id, generation_request_id,
       request:generation_requests(id, model_id, product_id, controls_json, raw_scene_prompt)`
    )
    .eq("id", args.approvedImageId)
    .eq("user_id", args.userId)
    .single();
  if (approvedErr || !approved) throw new Error("Approved image not found.");
  const reqRow = Array.isArray(approved.request) ? approved.request[0] : approved.request;
  if (!reqRow) throw new Error("Approved image is missing its parent request.");

  const controls = reqRow.controls_json as PhotographyControls;
  const [{ data: model }, { data: product }] = await Promise.all([
    svc
      .from("models")
      .select("id, name, description, model_images(storage_path, sort_order)")
      .eq("id", reqRow.model_id)
      .eq("user_id", args.userId)
      .single(),
    svc
      .from("products")
      .select(
        "id, name, brand_name, category, description, preservation_rules_json, product_images(storage_path, sort_order)"
      )
      .eq("id", reqRow.product_id)
      .eq("user_id", args.userId)
      .single(),
  ]);
  if (!model || !product) throw new Error("Source model or product missing.");

  type ImgRow = { storage_path: string; sort_order: number };
  const modelImages = selectModelReferences((model.model_images ?? []) as ImgRow[], 3);
  const productImages = selectProductReferences(
    (product.product_images ?? []) as ImgRow[],
    3
  );

  const preservationNotes =
    typeof product.preservation_rules_json === "object" &&
    product.preservation_rules_json !== null &&
    "notes" in product.preservation_rules_json
      ? ((product.preservation_rules_json as { notes?: string }).notes ?? null)
      : null;

  const payload = buildStructuredPayload({
    mode: "approved_style_variation",
    scenePrompt: reqRow.raw_scene_prompt,
    controls,
    model: { name: model.name, description: model.description },
    product: {
      name: product.name,
      brandName: product.brand_name,
      category: product.category,
      description: product.description,
      preservationNotes,
    },
    approvedImageNotes: args.variationRequest ?? undefined,
  });

  const prompt = buildVariationPrompt({
    payload,
    variationRequest: args.variationRequest,
    modelImageCount: modelImages.length,
    productImageCount: productImages.length,
  });

  try {
    const sourceBlob = await downloadAsset(approved.storage_path);
    const sourceFile = await toFile(
      Buffer.from(await sourceBlob.arrayBuffer()),
      "approved.png",
      { type: "image/png" }
    );
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
    const allRefs: Uploadable[] = [sourceFile, ...refModel, ...refProduct];

    const output = { ...payload.output, numberOfVariations: desiredCount };
    const { images: pngBuffers } = await callOpenAIImageEdit({
      model: env.OPENAI_IMAGE_MODEL,
      prompt,
      images: allRefs,
      output,
    });

    const insertedIds: string[] = [];
    for (let i = 0; i < pngBuffers.length; i++) {
      const filename = `${Date.now()}-var-${i}.png`;
      const storagePath = buildStoragePath(
        "revisions",
        args.userId,
        [approved.project_id, reqRow.id],
        filename
      );
      await uploadServerBytes(storagePath, pngBuffers[i], "image/png");

      const { data: row } = await svc
        .from("generated_images")
        .insert({
          generation_request_id: reqRow.id,
          project_id: approved.project_id,
          user_id: args.userId,
          parent_image_id: approved.id,
          storage_path: storagePath,
          prompt_used: prompt,
          metadata_json: {
            size: output.size,
            model: env.OPENAI_IMAGE_MODEL,
            mode: "approved_style_variation",
            variation_index: i,
            variation_request: args.variationRequest ?? null,
          },
        })
        .select("id")
        .single();
      if (row) insertedIds.push(row.id as string);
    }

    return {
      generatedImageIds: insertedIds,
      status: "completed",
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      generatedImageIds: [],
      status: "failed",
      errorMessage: msg,
    };
  }
}
