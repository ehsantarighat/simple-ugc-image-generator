// ============================================================================
// ratio-variant-block.ts
// Spec section 17. Used for ratio_variant_generation — re-shoots an anchor
// into a new aspect ratio with the right composition (not a crop).
// This is the higher-fidelity sibling of ratio-reframe-block (which is used
// inside pack_variation flows). Either works; this one emits the canonical
// section header from the spec.
// ============================================================================

import type {
  OutputAspectRatio,
  PlatformTarget,
} from "@/lib/services/generation/payload-schema";

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

export function buildRatioVariantBlock(args: {
  targetRatio: OutputAspectRatio;
  targetPlatform?: PlatformTarget;
}): string {
  return [
    "TARGET OUTPUT:",
    `- Required aspect ratio: ${args.targetRatio}`,
    `- Intended platform or usage: ${args.targetPlatform ? PLATFORM_LABEL[args.targetPlatform] : "general"}`,
    "",
    "PRESERVE:",
    "- the same product identity",
    "- the same model identity when applicable",
    "- the same creative concept",
    "- the same scene mood and content intent",
    "- the same realism standard",
    "",
    "ADAPT:",
    "- composition and framing as needed for the target ratio",
    "- subject placement for the destination format",
    "- negative space only where useful for the selected format",
    "",
    "DO NOT:",
    "- make a naive crop-only version if quality suffers",
    "- change the core product identity",
    "- change the model's identity",
    "- redesign the scene unnecessarily",
    "- introduce new inconsistencies",
  ].join("\n");
}
