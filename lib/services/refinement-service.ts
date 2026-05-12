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
import { buildRefinementPrompt } from "@/lib/services/generation/build-refinement-prompt";
import { callOpenAIImageEdit } from "@/lib/services/generation/openai-image-edit";
import {
  selectModelReferences,
  selectProductReferences,
} from "@/lib/services/generation/reference-image-selection";
import type { GenerationStatus, PhotographyControls } from "@/types";

export interface RunRefinementArgs {
  userId: string;
  sourceImageId: string;
  refinementPrompt: string;
}

export interface RunRefinementResult {
  revisionRequestId: string;
  status: GenerationStatus;
  generatedImageIds: string[];
  errorMessage?: string;
}

// ----------------------------------------------------------------------------
// Mode B — image_refinement.
//
// Re-runs the pipeline with the source image as the first reference, plus a
// reduced set of original model/product refs, and an intent-aware prompt.
// Refined outputs are stored as child generated_images rows with
// parent_image_id pointing back to the source.
// ----------------------------------------------------------------------------
export async function runRefinement(
  args: RunRefinementArgs
): Promise<RunRefinementResult> {
  const env = serverEnv();
  const svc = getSupabaseServiceClient();

  // Pull source image + parent request --------------------------------------
  const { data: source, error: sourceErr } = await svc
    .from("generated_images")
    .select(
      `id, storage_path, project_id, generation_request_id,
       request:generation_requests(id, model_id, product_id, controls_json, raw_scene_prompt)`
    )
    .eq("id", args.sourceImageId)
    .eq("user_id", args.userId)
    .single();
  if (sourceErr || !source) throw new Error("Source image not found.");
  const reqRow = Array.isArray(source.request) ? source.request[0] : source.request;
  if (!reqRow) throw new Error("Source request missing.");

  const controls = reqRow.controls_json as PhotographyControls;

  // Pull model + product + their references --------------------------------
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
  // Use a tighter cap on references for refinement (3 each) so the source
  // image dominates the visual anchor — per spec section 13.
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

  // Pull project context so we keep subject/style/scope consistent on refinement.
  const { data: project } = await svc
    .from("projects")
    .select("subject_mode, style_mode, output_scope")
    .eq("id", source.project_id)
    .eq("user_id", args.userId)
    .single();

  const payload = buildStructuredPayload({
    mode: "image_refinement",
    scenePrompt: reqRow.raw_scene_prompt,
    controls,
    subjectMode: (project?.subject_mode ?? "product_with_model") as
      | "product_only"
      | "product_with_model",
    styleMode: (project?.style_mode ?? "ugc") as
      | "studio"
      | "lifestyle"
      | "ugc"
      | "hybrid",
    outputScope: (project?.output_scope ?? "single_image") as
      | "single_image"
      | "few_variations"
      | "multi_format_pack"
      | "multi_concept_pack"
      | "full_campaign_pack",
    model: { name: model.name, description: model.description },
    product: {
      name: product.name,
      brandName: product.brand_name,
      category: product.category,
      description: product.description,
      preservationNotes,
    },
    refinementInstruction: args.refinementPrompt,
  });

  const prompt = buildRefinementPrompt({
    payload,
    refinementRequest: args.refinementPrompt,
    hasSourceImage: true,
    modelImageCount: modelImages.length,
    productImageCount: productImages.length,
  });

  // Persist a revision_requests row ----------------------------------------
  const { data: revRow, error: revErr } = await svc
    .from("revision_requests")
    .insert({
      source_generated_image_id: source.id,
      generation_request_id: reqRow.id,
      user_id: args.userId,
      refinement_prompt: args.refinementPrompt,
      structured_payload_json: payload,
      status: "generating" as GenerationStatus,
    })
    .select("id")
    .single();
  if (revErr || !revRow) {
    throw new Error(`Failed to create revision request: ${revErr?.message}`);
  }
  const revisionRequestId = revRow.id as string;

  try {
    // Source image + model + product refs, in that order.
    const sourceBlob = await downloadAsset(source.storage_path);
    const sourceFile = await toFile(
      Buffer.from(await sourceBlob.arrayBuffer()),
      "previous-output.png",
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

    // Refinements default to 1 output to keep iteration tight.
    const output = { ...payload.output, numberOfVariations: 1 };

    const allRefs: Uploadable[] = [sourceFile, ...refModel, ...refProduct];
    const { images: pngBuffers } = await callOpenAIImageEdit({
      model: env.OPENAI_IMAGE_MODEL,
      prompt,
      images: allRefs,
      output,
    });

    const insertedIds: string[] = [];
    for (let i = 0; i < pngBuffers.length; i++) {
      const filename = `${Date.now()}-${i}.png`;
      const storagePath = buildStoragePath(
        "revisions",
        args.userId,
        [source.project_id, revisionRequestId],
        filename
      );
      await uploadServerBytes(storagePath, pngBuffers[i], "image/png");

      const { data: row } = await svc
        .from("generated_images")
        .insert({
          generation_request_id: reqRow.id,
          project_id: source.project_id,
          user_id: args.userId,
          parent_image_id: source.id,
          storage_path: storagePath,
          prompt_used: prompt,
          metadata_json: {
            size: output.size,
            model: env.OPENAI_IMAGE_MODEL,
            mode: "image_refinement",
            refinement_prompt: args.refinementPrompt,
            revision_request_id: revisionRequestId,
          },
        })
        .select("id")
        .single();
      if (row) insertedIds.push(row.id as string);
    }

    await svc
      .from("revision_requests")
      .update({ status: "completed" as GenerationStatus })
      .eq("id", revisionRequestId);

    return {
      revisionRequestId,
      status: "completed",
      generatedImageIds: insertedIds,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await svc
      .from("revision_requests")
      .update({ status: "failed" as GenerationStatus, error_message: msg })
      .eq("id", revisionRequestId);
    return {
      revisionRequestId,
      status: "failed",
      generatedImageIds: [],
      errorMessage: msg,
    };
  }
}
