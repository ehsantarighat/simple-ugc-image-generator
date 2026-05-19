// ============================================================================
// product-reproduction-workflow.ts
// Mode A orchestrator. For each (style × ratio) in the plan, build a
// product-reproduction payload + prompt, route through the provider
// registry, persist generated_images and a generation_requests row.
//
// Anchor strategy: for the first cell of each style we generate fresh; for
// the remaining ratios in the same style we treat the first output as the
// anchor and re-shoot via ratio_variant_generation (preserves consistency,
// halves random drift across the ratio set).
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
import { buildProductReproductionPrompt } from "@/lib/services/generation/build-product-reproduction-prompt";
import { callOpenAIImageEdit } from "@/lib/services/generation/openai-image-edit";
import { calculateCost } from "@/lib/services/billing/pricing-table";
import { selectProductReferences } from "@/lib/services/generation/reference-image-selection";
import { buildReproductionPlan } from "@/lib/services/scaling/product-reproduction-planner-service";
import type {
  OutputAspectRatio,
  PlatformTarget,
  ProductReproductionStyle,
  QualityPriority,
} from "@/lib/services/generation/payload-schema";
import type {
  GenerationStatus,
  PhotographyControls,
} from "@/types";

export interface RunReproductionArgs {
  userId: string;
  projectId: string;
  productId: string;
  styles: ProductReproductionStyle[];
  selectedPlatforms: PlatformTarget[];
  selectedRatios?: OutputAspectRatio[];
  generateAllFormats?: boolean;
  scope: "single_image" | "few_variations" | "multi_format_pack" | "multi_concept_pack" | "full_campaign_pack";
  qualityPriority?: QualityPriority;
  intentNotes?: string;
}

export interface RunReproductionResult {
  status: GenerationStatus;
  generatedImageIds: string[];
  errorMessage?: string;
  estimatedCallCount: number;
}

// Default photography controls for product-only — these don't drive much in
// reproduction mode but the payload schema requires them.
const DEFAULT_CONTROLS: PhotographyControls = {
  shotType: "close_up_interaction",
  cameraAngle: "eye_level",
  lensType: "50mm",
  framing: "close_up",
  lighting: "soft_window_light",
  authenticityLevel: "branded_clean_ugc",
  productProminence: "hero",
  outputAspectRatio: "1:1",
  numberOfVariations: 1,
};

export async function runProductReproduction(
  args: RunReproductionArgs
): Promise<RunReproductionResult> {
  const env = serverEnv();
  const svc = getSupabaseServiceClient();

  // Load product + references once.
  const { data: product, error: productErr } = await svc
    .from("products")
    .select(
      "id, name, brand_name, category, description, preservation_rules_json, product_images(storage_path, sort_order)"
    )
    .eq("id", args.productId)
    .eq("user_id", args.userId)
    .single();
  if (productErr || !product) {
    return {
      status: "failed",
      generatedImageIds: [],
      estimatedCallCount: 0,
      errorMessage: "Product not found or not owned by user",
    };
  }
  type ImgRow = { storage_path: string; sort_order: number };
  const productImages = selectProductReferences(
    (product.product_images ?? []) as ImgRow[]
  );
  if (productImages.length === 0) {
    return {
      status: "failed",
      generatedImageIds: [],
      estimatedCallCount: 0,
      errorMessage: "Product has no reference images",
    };
  }
  const preservationNotes =
    typeof product.preservation_rules_json === "object" &&
    product.preservation_rules_json !== null &&
    "notes" in product.preservation_rules_json
      ? ((product.preservation_rules_json as { notes?: string }).notes ?? null)
      : null;

  // Build the plan.
  const plan = buildReproductionPlan({
    projectId: args.projectId,
    scope: args.scope,
    styles: args.styles,
    selectedPlatforms: args.selectedPlatforms,
    selectedRatios: args.selectedRatios,
    generateAllFormats: args.generateAllFormats,
  });

  // Pre-fetch product reference bytes.
  const refProduct: Uploadable[] = await Promise.all(
    productImages.map(async (i, idx) => {
      const blob = await downloadAsset(i.storage_path);
      return toFile(Buffer.from(await blob.arrayBuffer()), `product-${idx}.jpg`, {
        type: "image/jpeg",
      });
    })
  );

  const generatedImageIds: string[] = [];
  // Capture the first per-output failure so we can bubble it up — currently
  // the workflow swallows them as "Generation failed" with no detail.
  let firstError: string | null = null;
  // Track an anchor per style so subsequent ratios of the same style can
  // re-shoot from the anchor instead of drifting.
  const anchorByStyle = new Map<
    ProductReproductionStyle,
    { id: string; storagePath: string }
  >();

  for (const out of plan.outputs) {
    const isAnchor = !anchorByStyle.has(out.style);
    const mode = isAnchor ? "product_reproduction_generation" : "ratio_variant_generation";

    const payload = buildStructuredPayload({
      mode,
      scenePrompt: args.intentNotes ?? "",
      controls: { ...DEFAULT_CONTROLS, outputAspectRatio: out.ratio },
      subjectMode: "product_only",
      styleMode: "studio",
      outputScope: args.scope,
      model: null,
      product: {
        name: product.name,
        brandName: product.brand_name,
        category: product.category,
        description: product.description,
        preservationNotes,
      },
      targetAspectRatioOverride: out.ratio,
      targetPlatform: out.platform,
    });
    payload.creationMode = "product_reproduction";
    payload.qualityPriority = args.qualityPriority ?? "auto";
    payload.stylePreset = out.style;

    const prompt = buildProductReproductionPrompt({
      payload,
      productImageCount: productImages.length,
    });

    const { data: requestRow } = await svc
      .from("generation_requests")
      .insert({
        project_id: args.projectId,
        user_id: args.userId,
        model_id: null,
        product_id: args.productId,
        raw_scene_prompt: args.intentNotes ?? "",
        structured_payload_json: payload,
        controls_json: payload.photography,
        generation_mode: mode,
        generation_stage: isAnchor ? "anchor" : "ratio_variant",
        style_preset: out.style,
        target_platform: out.platform ?? null,
        target_aspect_ratio: out.ratio,
        final_prompt_used: prompt,
        status: "generating" as GenerationStatus,
      })
      .select("id")
      .single();
    if (!requestRow) continue;
    const requestId = requestRow.id as string;

    try {
      // For ratio_variant from anchor, prepend the anchor file as the source.
      const references: Uploadable[] = [...refProduct];
      if (!isAnchor) {
        const anchor = anchorByStyle.get(out.style)!;
        const blob = await downloadAsset(anchor.storagePath);
        const anchorFile = await toFile(
          Buffer.from(await blob.arrayBuffer()),
          "anchor.png",
          { type: "image/png" }
        );
        references.unshift(anchorFile);
      }

      const { images: pngBuffers, providerId, routingReason } =
        await callOpenAIImageEdit({
          model: env.OPENAI_IMAGE_MODEL,
          prompt,
          images: references,
          output: payload.output,
          qualityPriority: args.qualityPriority,
        });
      if (pngBuffers.length === 0) throw new Error("no images");

      const filename = `${Date.now()}-${out.style}-${out.ratio.replace(":", "x")}.png`;
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

      const { data: imgRow } = await svc
        .from("generated_images")
        .insert({
          generation_request_id: requestId,
          project_id: args.projectId,
          user_id: args.userId,
          parent_image_id: isAnchor ? null : anchorByStyle.get(out.style)?.id ?? null,
          storage_path: storagePath,
          prompt_used: prompt,
          image_role: isAnchor ? "anchor" : "ratio_variant",
          provider_used: providerId ?? null,
          provider_cost_tenth_cents: cost.costTenthCents,
          billed_cost_tenth_cents: cost.costTenthCents,
          price_table_version: cost.priceTableVersion,
          cost_attribution: cost.known ? "billed" : "unknown",
          metadata_json: {
            size: payload.output.size,
            quality: payload.output.quality,
            model: env.OPENAI_IMAGE_MODEL,
            provider: providerId,
            creation_mode: "product_reproduction",
            generation_mode: mode,
            style_preset: out.style,
            target_aspect_ratio: out.ratio,
            target_platform: out.platform ?? null,
          },
        })
        .select("id")
        .single();
      await svc
        .from("generation_requests")
        .update({
          status: "completed",
          provider_selected: providerId ?? null,
          routing_reason: routingReason ?? null,
          total_cost_tenth_cents: cost.costTenthCents,
        })
        .eq("id", requestId);
      if (imgRow) {
        generatedImageIds.push(imgRow.id as string);
        if (isAnchor) {
          anchorByStyle.set(out.style, {
            id: imgRow.id as string,
            storagePath,
          });
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!firstError) firstError = msg;
      await svc
        .from("generation_requests")
        .update({ status: "failed", error_message: msg })
        .eq("id", requestId);
    }
  }

  return {
    status: generatedImageIds.length > 0 ? "completed" : "failed",
    generatedImageIds,
    estimatedCallCount: plan.estimatedCallCount,
    errorMessage:
      generatedImageIds.length === 0 && firstError
        ? firstError
        : undefined,
  };
}
