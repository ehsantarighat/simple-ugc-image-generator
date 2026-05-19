// ============================================================================
// pack-generation-service.ts
// Spec sections 6 / 8 / 9 / 18.
//
// Orchestrates pack generation:
//   1. For each planned concept, generate an anchor (mode = pack_anchor_generation).
//   2. Once the anchor lands, expand into ratio_variants for each requested ratio
//      OTHER than the anchor's own ratio (mode = pack_variation_generation).
//   3. Persist content_pack_outputs rows linking concepts → outputs.
// ============================================================================

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
import { buildGenerationPrompt } from "@/lib/services/generation/build-generation-prompt";
import { buildPackVariationPrompt } from "@/lib/services/generation/build-pack-variation-prompt";
import { callOpenAIImageEdit } from "@/lib/services/generation/openai-image-edit";
import { calculateCost } from "@/lib/services/billing/pricing-table";
import {
  selectModelReferences,
  selectProductReferences,
} from "@/lib/services/generation/reference-image-selection";
import {
  planRatiosForPlatforms,
  primaryPlatformForRatio,
} from "@/lib/services/scaling/ratio-planner-service";
import { selectAnchorForRequest } from "@/lib/services/scaling/anchor-selection-service";
import type {
  GenerationStatus,
  PhotographyControls,
} from "@/types";
import type {
  OutputAspectRatio,
  PlatformTarget,
  StructuredGenerationPayload,
  StyleMode,
  SubjectMode,
} from "@/lib/services/generation/payload-schema";
import type { PlannedConcept, ShotPlan } from "@/lib/services/scaling/shot-planner-service";

export interface RunPackArgs {
  userId: string;
  projectId: string;
  contentPackId: string;
  modelId: string | null;
  productId: string;
  subjectMode: SubjectMode;
  styleMode: StyleMode;
  selectedPlatforms: PlatformTarget[];
  shotPlan: ShotPlan;
}

export interface RunPackResult {
  contentPackId: string;
  status: GenerationStatus;
  anchorImageIds: string[];
  variantImageIds: string[];
  errorMessage?: string;
}

interface ImgRow {
  storage_path: string;
  sort_order: number;
}

export async function runPack(args: RunPackArgs): Promise<RunPackResult> {
  const env = serverEnv();
  const svc = getSupabaseServiceClient();

  await svc
    .from("content_packs")
    .update({ status: "generating" })
    .eq("id", args.contentPackId)
    .eq("user_id", args.userId);

  // Load reference rows once, reuse across all concepts.
  let model: { id: string; name: string; description: string | null } | null = null;
  let modelImages: ImgRow[] = [];
  if (args.subjectMode === "product_with_model") {
    if (!args.modelId) {
      return failPack(args.contentPackId, args.userId, "modelId required for product_with_model");
    }
    const { data, error } = await svc
      .from("models")
      .select("id, name, description, model_images(storage_path, sort_order)")
      .eq("id", args.modelId)
      .eq("user_id", args.userId)
      .single();
    if (error || !data) return failPack(args.contentPackId, args.userId, "Model not found");
    model = { id: data.id, name: data.name, description: data.description };
    modelImages = selectModelReferences((data.model_images ?? []) as ImgRow[]);
    if (modelImages.length === 0) {
      return failPack(args.contentPackId, args.userId, "Model has no reference images");
    }
  }

  const { data: product, error: productErr } = await svc
    .from("products")
    .select(
      "id, name, brand_name, category, description, preservation_rules_json, product_images(storage_path, sort_order)"
    )
    .eq("id", args.productId)
    .eq("user_id", args.userId)
    .single();
  if (productErr || !product) {
    return failPack(args.contentPackId, args.userId, "Product not found");
  }
  const productImages = selectProductReferences(
    (product.product_images ?? []) as ImgRow[]
  );
  if (productImages.length === 0) {
    return failPack(args.contentPackId, args.userId, "Product has no reference images");
  }

  const preservationNotes =
    typeof product.preservation_rules_json === "object" &&
    product.preservation_rules_json !== null &&
    "notes" in product.preservation_rules_json
      ? ((product.preservation_rules_json as { notes?: string }).notes ?? null)
      : null;

  // Pre-fetch reference bytes once. We'll reuse for every concept + ratio.
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

  const ratioPlan = planRatiosForPlatforms(args.selectedPlatforms);
  const ratios: OutputAspectRatio[] = ratioPlan.map((r) => r.ratio);
  const anchorRatio: OutputAspectRatio = ratios[0] ?? "1:1";

  const anchorImageIds: string[] = [];
  const variantImageIds: string[] = [];

  for (const concept of args.shotPlan.concepts) {
    // Insert concept row, then generate anchor.
    const { data: conceptRow, error: conceptErr } = await svc
      .from("content_pack_concepts")
      .insert({
        content_pack_id: args.contentPackId,
        project_id: args.projectId,
        user_id: args.userId,
        title: concept.title,
        concept_prompt: concept.scenePrompt,
        scene_type: concept.sceneType,
        style_mode: concept.styleMode,
        subject_mode: concept.subjectMode,
        recommended_controls_json: concept.recommendedControls,
        status: "anchor_generating",
      })
      .select("id")
      .single();
    if (conceptErr || !conceptRow) continue;
    const conceptId = conceptRow.id as string;

    // Anchor
    const anchor = await generateAnchor({
      env: env.OPENAI_IMAGE_MODEL,
      svc,
      userId: args.userId,
      projectId: args.projectId,
      contentPackId: args.contentPackId,
      conceptId,
      modelId: model?.id ?? null,
      productId: args.productId,
      concept,
      anchorRatio,
      subjectMode: args.subjectMode,
      styleMode: args.styleMode,
      model,
      product,
      preservationNotes,
      modelImages,
      productImages,
      refModel,
      refProduct,
    });

    if (!anchor) {
      await svc
        .from("content_pack_concepts")
        .update({ status: "failed", error_message: "Anchor generation failed" })
        .eq("id", conceptId);
      continue;
    }
    anchorImageIds.push(anchor.generatedImageId);
    await svc
      .from("content_pack_concepts")
      .update({
        status: "anchor_ready",
        anchor_image_id: anchor.generatedImageId,
      })
      .eq("id", conceptId);

    // Variants: every requested ratio that isn't the anchor's ratio.
    for (const r of ratios) {
      if (r === anchorRatio) {
        // Anchor itself counts as the output for this ratio.
        await recordOutput(svc, {
          contentPackId: args.contentPackId,
          conceptId,
          userId: args.userId,
          generatedImageId: anchor.generatedImageId,
          role: "anchor",
          targetAspectRatio: r,
          targetPlatform: primaryPlatformForRatio(r, args.selectedPlatforms) ?? null,
        });
        continue;
      }
      const variantId = await generateRatioVariant({
        env: env.OPENAI_IMAGE_MODEL,
        svc,
        userId: args.userId,
        projectId: args.projectId,
        contentPackId: args.contentPackId,
        conceptId,
        modelId: model?.id ?? null,
        productId: args.productId,
        concept,
        ratio: r,
        platform: primaryPlatformForRatio(r, args.selectedPlatforms),
        subjectMode: args.subjectMode,
        styleMode: args.styleMode,
        model,
        product,
        preservationNotes,
        modelImages,
        productImages,
        refModel,
        refProduct,
        anchorStoragePath: anchor.storagePath,
      });
      if (variantId) variantImageIds.push(variantId);
    }

    await svc.from("content_pack_concepts").update({ status: "expanded" }).eq("id", conceptId);
  }

  await svc
    .from("content_packs")
    .update({ status: "completed" })
    .eq("id", args.contentPackId);

  return {
    contentPackId: args.contentPackId,
    status: "completed",
    anchorImageIds,
    variantImageIds,
  };
}

async function failPack(
  contentPackId: string,
  userId: string,
  message: string
): Promise<RunPackResult> {
  const svc = getSupabaseServiceClient();
  await svc
    .from("content_packs")
    .update({ status: "failed", error_message: message })
    .eq("id", contentPackId)
    .eq("user_id", userId);
  return {
    contentPackId,
    status: "failed",
    anchorImageIds: [],
    variantImageIds: [],
    errorMessage: message,
  };
}

async function generateAnchor(args: {
  env: string;
  svc: ReturnType<typeof getSupabaseServiceClient>;
  userId: string;
  projectId: string;
  contentPackId: string;
  conceptId: string;
  modelId: string | null;
  productId: string;
  concept: PlannedConcept;
  anchorRatio: OutputAspectRatio;
  subjectMode: SubjectMode;
  styleMode: StyleMode;
  model: { name: string; description: string | null } | null;
  product: {
    name: string;
    brand_name: string | null;
    category: string | null;
    description: string | null;
  };
  preservationNotes: string | null;
  modelImages: ImgRow[];
  productImages: ImgRow[];
  refModel: Uploadable[];
  refProduct: Uploadable[];
}): Promise<{ generatedImageId: string; storagePath: string } | null> {
  const controls: PhotographyControls = {
    ...args.concept.recommendedControls,
    outputAspectRatio: args.anchorRatio,
    numberOfVariations: 1,
  };
  const payload: StructuredGenerationPayload = buildStructuredPayload({
    mode: "pack_anchor_generation",
    scenePrompt: args.concept.scenePrompt,
    controls,
    subjectMode: args.subjectMode,
    styleMode: args.styleMode,
    outputScope: "multi_format_pack",
    model: args.model ? { name: args.model.name, description: args.model.description } : null,
    product: {
      name: args.product.name,
      brandName: args.product.brand_name,
      category: args.product.category,
      description: args.product.description,
      preservationNotes: args.preservationNotes,
    },
  });
  const prompt = buildGenerationPrompt({
    payload,
    modelImageCount: args.modelImages.length,
    productImageCount: args.productImages.length,
  });

  const { data: requestRow } = await args.svc
    .from("generation_requests")
    .insert({
      project_id: args.projectId,
      user_id: args.userId,
      model_id: args.modelId,
      product_id: args.productId,
      raw_scene_prompt: args.concept.scenePrompt,
      structured_payload_json: payload,
      controls_json: controls,
      generation_mode: "pack_anchor_generation",
      pack_id: args.contentPackId,
      concept_id: args.conceptId,
      target_aspect_ratio: args.anchorRatio,
      status: "generating",
    })
    .select("id")
    .single();
  if (!requestRow) return null;
  const requestId = requestRow.id as string;

  try {
    const allRefs: Uploadable[] = [...args.refModel, ...args.refProduct];
    const { images: pngBuffers, providerId, routingReason } = await callOpenAIImageEdit({
      model: args.env,
      prompt,
      images: allRefs,
      output: payload.output,
    });
    if (pngBuffers.length === 0) throw new Error("no images");

    const filename = `${Date.now()}-anchor.png`;
    const storagePath = buildStoragePath(
      "generated",
      args.userId,
      [args.projectId, requestId],
      filename
    );
    await uploadServerBytes(storagePath, pngBuffers[0], "image/png");

    const cost = calculateCost({
      providerId: providerId ?? null,
      size: payload.output.size,
      quality: payload.output.quality,
      numberOfImages: 1,
    });

    const { data: img } = await args.svc
      .from("generated_images")
      .insert({
        generation_request_id: requestId,
        project_id: args.projectId,
        user_id: args.userId,
        storage_path: storagePath,
        prompt_used: prompt,
        provider_used: providerId ?? null,
        provider_cost_tenth_cents: cost.costTenthCents,
        billed_cost_tenth_cents: cost.costTenthCents,
        price_table_version: cost.priceTableVersion,
        cost_attribution: cost.known ? "billed" : "unknown",
        metadata_json: {
          size: payload.output.size,
          quality: payload.output.quality,
          model: args.env,
          provider: providerId,
          generation_mode: "pack_anchor_generation",
          pack_id: args.contentPackId,
          concept_id: args.conceptId,
          target_aspect_ratio: args.anchorRatio,
        },
      })
      .select("id")
      .single();

    await args.svc
      .from("generation_requests")
      .update({
        status: "completed",
        provider_selected: providerId ?? null,
        routing_reason: routingReason ?? null,
        total_cost_tenth_cents: cost.costTenthCents,
      })
      .eq("id", requestId);

    if (!img) return null;
    const generatedImageId = img.id as string;

    await recordOutput(args.svc, {
      contentPackId: args.contentPackId,
      conceptId: args.conceptId,
      userId: args.userId,
      generatedImageId,
      role: "anchor",
      targetAspectRatio: args.anchorRatio,
      targetPlatform: null,
    });

    // Also link the anchor on the request row for traceability.
    await args.svc
      .from("generation_requests")
      .update({ anchor_image_id: generatedImageId })
      .eq("id", requestId);

    return { generatedImageId, storagePath };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await args.svc
      .from("generation_requests")
      .update({ status: "failed", error_message: msg })
      .eq("id", requestId);
    return null;
  }
}

async function generateRatioVariant(args: {
  env: string;
  svc: ReturnType<typeof getSupabaseServiceClient>;
  userId: string;
  projectId: string;
  contentPackId: string;
  conceptId: string;
  modelId: string | null;
  productId: string;
  concept: PlannedConcept;
  ratio: OutputAspectRatio;
  platform?: PlatformTarget;
  subjectMode: SubjectMode;
  styleMode: StyleMode;
  model: { name: string; description: string | null } | null;
  product: {
    name: string;
    brand_name: string | null;
    category: string | null;
    description: string | null;
  };
  preservationNotes: string | null;
  modelImages: ImgRow[];
  productImages: ImgRow[];
  refModel: Uploadable[];
  refProduct: Uploadable[];
  anchorStoragePath: string;
}): Promise<string | null> {
  const controls: PhotographyControls = {
    ...args.concept.recommendedControls,
    outputAspectRatio: args.ratio,
    numberOfVariations: 1,
  };
  const payload: StructuredGenerationPayload = buildStructuredPayload({
    mode: "pack_variation_generation",
    scenePrompt: args.concept.scenePrompt,
    controls,
    subjectMode: args.subjectMode,
    styleMode: args.styleMode,
    outputScope: "multi_format_pack",
    model: args.model ? { name: args.model.name, description: args.model.description } : null,
    product: {
      name: args.product.name,
      brandName: args.product.brand_name,
      category: args.product.category,
      description: args.product.description,
      preservationNotes: args.preservationNotes,
    },
    targetAspectRatioOverride: args.ratio,
    targetPlatform: args.platform,
  });
  const prompt = buildPackVariationPrompt({
    payload,
    modelImageCount: args.modelImages.length,
    productImageCount: args.productImages.length,
  });

  const { data: requestRow } = await args.svc
    .from("generation_requests")
    .insert({
      project_id: args.projectId,
      user_id: args.userId,
      model_id: args.modelId,
      product_id: args.productId,
      raw_scene_prompt: args.concept.scenePrompt,
      structured_payload_json: payload,
      controls_json: controls,
      generation_mode: "pack_variation_generation",
      pack_id: args.contentPackId,
      concept_id: args.conceptId,
      target_aspect_ratio: args.ratio,
      target_platform: args.platform ?? null,
      status: "generating",
    })
    .select("id")
    .single();
  if (!requestRow) return null;
  const requestId = requestRow.id as string;

  try {
    const anchorBlob = await downloadAsset(args.anchorStoragePath);
    const anchorFile = await toFile(
      Buffer.from(await anchorBlob.arrayBuffer()),
      "anchor.png",
      { type: "image/png" }
    );
    // Anchor first, then a slimmer set of references.
    const allRefs: Uploadable[] = [
      anchorFile,
      ...args.refModel.slice(0, 2),
      ...args.refProduct.slice(0, 2),
    ];
    const { images: pngBuffers, providerId, routingReason } = await callOpenAIImageEdit({
      model: args.env,
      prompt,
      images: allRefs,
      output: payload.output,
    });
    if (pngBuffers.length === 0) throw new Error("no images");

    const filename = `${Date.now()}-${args.ratio.replace(":", "x")}.png`;
    const storagePath = buildStoragePath(
      "revisions",
      args.userId,
      [args.projectId, requestId],
      filename
    );
    await uploadServerBytes(storagePath, pngBuffers[0], "image/png");

    const cost = calculateCost({
      providerId: providerId ?? null,
      size: payload.output.size,
      quality: payload.output.quality,
      numberOfImages: 1,
    });

    const { data: img } = await args.svc
      .from("generated_images")
      .insert({
        generation_request_id: requestId,
        project_id: args.projectId,
        user_id: args.userId,
        storage_path: storagePath,
        prompt_used: prompt,
        provider_used: providerId ?? null,
        provider_cost_tenth_cents: cost.costTenthCents,
        billed_cost_tenth_cents: cost.costTenthCents,
        price_table_version: cost.priceTableVersion,
        cost_attribution: cost.known ? "billed" : "unknown",
        metadata_json: {
          size: payload.output.size,
          quality: payload.output.quality,
          model: args.env,
          provider: providerId,
          generation_mode: "pack_variation_generation",
          pack_id: args.contentPackId,
          concept_id: args.conceptId,
          target_aspect_ratio: args.ratio,
          target_platform: args.platform ?? null,
        },
      })
      .select("id")
      .single();
    await args.svc
      .from("generation_requests")
      .update({
        status: "completed",
        provider_selected: providerId ?? null,
        routing_reason: routingReason ?? null,
        total_cost_tenth_cents: cost.costTenthCents,
      })
      .eq("id", requestId);

    if (!img) return null;
    const generatedImageId = img.id as string;

    await recordOutput(args.svc, {
      contentPackId: args.contentPackId,
      conceptId: args.conceptId,
      userId: args.userId,
      generatedImageId,
      role: "ratio_variant",
      targetAspectRatio: args.ratio,
      targetPlatform: args.platform ?? null,
    });

    return generatedImageId;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await args.svc
      .from("generation_requests")
      .update({ status: "failed", error_message: msg })
      .eq("id", requestId);
    return null;
  }
}

async function recordOutput(
  svc: ReturnType<typeof getSupabaseServiceClient>,
  args: {
    contentPackId: string;
    conceptId: string;
    userId: string;
    generatedImageId: string;
    role: "anchor" | "variation" | "ratio_variant" | "final";
    targetAspectRatio: string | null;
    targetPlatform: PlatformTarget | null;
  }
) {
  await svc.from("content_pack_outputs").insert({
    content_pack_id: args.contentPackId,
    content_pack_concept_id: args.conceptId,
    generated_image_id: args.generatedImageId,
    user_id: args.userId,
    role: args.role,
    target_aspect_ratio: args.targetAspectRatio,
    target_platform: args.targetPlatform,
  });
}

// Anchor-selection re-export so callers can reuse this logic from a queue worker later.
export { selectAnchorForRequest };
