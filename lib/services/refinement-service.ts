import "server-only";

import { toFile } from "openai/uploads";
import { getOpenAIClient } from "@/lib/openai/client";
import { serverEnv } from "@/lib/env";
import { getSupabaseServiceClient } from "@/lib/supabase/service";
import {
  buildStoragePath,
  downloadAsset,
  uploadServerBytes,
} from "@/lib/supabase/storage";
import {
  buildStructuredPayload,
  renderPromptFromPayload,
  aspectRatioToImageSize,
} from "@/lib/services/generation-payload-builder";
import type { GenerationStatus, PhotographyControls } from "@/types";

export interface RunRefinementArgs {
  userId: string;
  sourceImageId: string; // generated_images.id
  refinementPrompt: string;
}

export interface RunRefinementResult {
  revisionRequestId: string;
  status: GenerationStatus;
  generatedImageIds: string[];
  errorMessage?: string;
}

// Takes a previously generated image and a free-form refinement instruction.
// Re-runs generation with:
//   - the original prompt as base context
//   - the source image PLUS the original model/product refs
//   - the refinement instruction layered on top
//
// Each refined output is stored as a new `generated_images` row with
// parent_image_id pointing to the source. We also record a `revision_requests`
// row for analytics and history.
export async function runRefinement(
  args: RunRefinementArgs
): Promise<RunRefinementResult> {
  const env = serverEnv();
  const svc = getSupabaseServiceClient();

  // Pull the source image + its parent request + project/model/product
  const { data: source, error: sourceErr } = await svc
    .from("generated_images")
    .select(
      `id, storage_path, prompt_used, project_id, generation_request_id,
       request:generation_requests(id, model_id, product_id, controls_json, raw_scene_prompt)`
    )
    .eq("id", args.sourceImageId)
    .eq("user_id", args.userId)
    .single();

  if (sourceErr || !source) throw new Error("Source image not found.");
  const reqRow = Array.isArray(source.request) ? source.request[0] : source.request;
  if (!reqRow) throw new Error("Source request missing.");

  const controls = reqRow.controls_json as PhotographyControls;

  // Pull product + model and their reference images.
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
  const modelImages = ((model.model_images ?? []) as ImgRow[]).sort(
    (a, b) => a.sort_order - b.sort_order
  );
  const productImages = ((product.product_images ?? []) as ImgRow[]).sort(
    (a, b) => a.sort_order - b.sort_order
  );

  const preservationNotes =
    typeof product.preservation_rules_json === "object" &&
    product.preservation_rules_json !== null &&
    "notes" in product.preservation_rules_json
      ? ((product.preservation_rules_json as { notes?: string }).notes ?? null)
      : null;

  // Build a payload using the original scene plus the refinement prompt
  // appended as an explicit revision directive.
  const refinedScene = `${reqRow.raw_scene_prompt}\n\nRevision: ${args.refinementPrompt}`;
  const payload = buildStructuredPayload({
    scenePrompt: refinedScene,
    controls,
    model: { name: model.name, description: model.description },
    product: {
      name: product.name,
      brand_name: product.brand_name,
      category: product.category,
      description: product.description,
      preservation_notes: preservationNotes,
    },
  });
  const prompt =
    renderPromptFromPayload(payload) +
    `\n\nApply this revision while keeping the same model identity and product fidelity: "${args.refinementPrompt}". Use the previous output as the visual anchor — keep what worked, change what was asked.`;

  // Persist revision_requests row in `generating`.
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
  if (revErr || !revRow) throw new Error(`Failed to create revision request: ${revErr?.message}`);
  const revisionRequestId = revRow.id as string;

  try {
    // Source + 3 model refs + 3 product refs.
    const sourceBlob = await downloadAsset(source.storage_path);
    const sourceFile = await toFile(
      Buffer.from(await sourceBlob.arrayBuffer()),
      "previous-output.png",
      { type: "image/png" }
    );
    const refModel = await Promise.all(
      modelImages.slice(0, 3).map(async (i, idx) => {
        const blob = await downloadAsset(i.storage_path);
        return toFile(Buffer.from(await blob.arrayBuffer()), `model-${idx}.jpg`, {
          type: "image/jpeg",
        });
      })
    );
    const refProduct = await Promise.all(
      productImages.slice(0, 3).map(async (i, idx) => {
        const blob = await downloadAsset(i.storage_path);
        return toFile(Buffer.from(await blob.arrayBuffer()), `product-${idx}.jpg`, {
          type: "image/jpeg",
        });
      })
    );

    const size = aspectRatioToImageSize(controls.outputAspectRatio);
    const client = getOpenAIClient();
    const generation = await client.images.edit({
      model: env.OPENAI_IMAGE_MODEL,
      image: [sourceFile, ...refModel, ...refProduct],
      prompt,
      size,
      // Refinements default to 1 variation to keep iteration tight.
      n: 1,
    });

    if (!generation.data || generation.data.length === 0) {
      throw new Error("OpenAI returned no images");
    }

    const insertedIds: string[] = [];
    for (let i = 0; i < generation.data.length; i++) {
      const b64 = generation.data[i].b64_json;
      if (!b64) continue;
      const bytes = Buffer.from(b64, "base64");
      const filename = `${Date.now()}-${i}.png`;
      const storagePath = buildStoragePath(
        "revisions",
        args.userId,
        [source.project_id, revisionRequestId],
        filename
      );
      await uploadServerBytes(storagePath, bytes, "image/png");

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
            size,
            model: env.OPENAI_IMAGE_MODEL,
            kind: "refinement",
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
