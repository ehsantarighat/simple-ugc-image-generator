// ============================================================================
// build-product-reproduction-prompt.ts
// Composes the canonical product-reproduction prompt (spec section 15).
// Mode A — uses the product references only; no model identity language.
// ============================================================================

import type {
  OutputAspectRatio,
  PlatformTarget,
  StructuredGenerationPayload,
} from "@/lib/services/generation/payload-schema";
import { buildTaskBlock } from "@/lib/services/generation/prompt-blocks/task-block";
import { buildReferenceBlock } from "@/lib/services/generation/prompt-blocks/reference-block";
import { buildProductPreservationBlock } from "@/lib/services/generation/prompt-blocks/product-preservation-block";
import { buildProductReproductionStyleBlock } from "@/lib/services/generation/prompt-blocks/product-reproduction-style-block";
import { buildRealismBlock, buildCompositionPriorityBlock } from "@/lib/services/generation/prompt-blocks/realism-block";
import { buildNegativeConstraintBlock } from "@/lib/services/generation/prompt-blocks/negative-constraints-block";
import { buildOutputIntentBlock } from "@/lib/services/generation/prompt-blocks/output-intent-block";

const PLATFORM_LABEL: Record<PlatformTarget, string> = {
  instagram_feed: "Instagram feed",
  instagram_story: "Instagram story / reels",
  tiktok: "TikTok",
  meta_ads: "Meta ads",
  product_page: "Product detail page",
  marketplace_listing: "Marketplace listing",
  website_banner: "Website hero / banner",
  landing_page: "Landing page",
  email_banner: "Email banner",
  other: "Custom",
};

function targetFormatBlock(
  ratio: OutputAspectRatio,
  platform?: PlatformTarget
): string {
  return [
    "TARGET FORMAT / COMPOSITION:",
    `- Target aspect ratio: ${ratio}`,
    `- Intended platform or usage: ${platform ? PLATFORM_LABEL[platform] : "general"}`,
    "- Compose the image appropriately for that destination, not as a naive crop.",
  ].join("\n");
}

export interface BuildProductReproductionPromptArgs {
  payload: StructuredGenerationPayload;
  productImageCount: number;
}

export function buildProductReproductionPrompt(
  args: BuildProductReproductionPromptArgs
): string {
  const { payload } = args;
  if (
    payload.mode !== "product_reproduction_generation" &&
    payload.mode !== "ratio_variant_generation"
  ) {
    throw new Error(
      `buildProductReproductionPrompt called with mode "${payload.mode}". Expected product_reproduction_generation or ratio_variant_generation.`
    );
  }
  if (!payload.stylePreset) {
    throw new Error("product_reproduction_generation requires a stylePreset");
  }

  const sections: string[] = [];
  sections.push(buildTaskBlock(payload.mode));
  sections.push("");
  sections.push(
    buildReferenceBlock({
      mode: payload.mode,
      hasSourceImage: false,
      modelImageCount: 0,
      productImageCount: args.productImageCount,
    })
  );
  sections.push("");
  sections.push(
    buildProductPreservationBlock({
      rules: payload.productPreservation,
      product: payload.product,
    })
  );
  sections.push("");
  sections.push(buildProductReproductionStyleBlock(payload.stylePreset));
  sections.push("");
  sections.push(targetFormatBlock(payload.output.aspectRatio, payload.targetPlatform));
  sections.push("");
  sections.push(buildRealismBlock());
  sections.push("");
  sections.push(buildCompositionPriorityBlock());
  sections.push("");
  sections.push(
    buildNegativeConstraintBlock({
      flags: payload.negativeConstraints,
      productCategory: payload.product.inferredCategory,
      productInteraction: "unspecified",
      shotType: payload.photography.shotType,
    })
  );
  sections.push("");
  sections.push(buildOutputIntentBlock(payload.mode));
  return sections.join("\n");
}
