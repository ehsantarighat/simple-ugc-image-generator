// ============================================================================
// ratio-reframe-block.ts
// Used for pack_variation_generation jobs that re-shoot a concept anchor
// into a different aspect ratio. The point is NOT to crop — we ask the model
// to re-compose with the right framing for the target ratio while keeping the
// anchor's identity, product, and visual tone.
// ============================================================================

import type {
  OutputAspectRatio,
  PlatformTarget,
} from "@/lib/services/generation/payload-schema";

const RATIO_HINTS: Record<OutputAspectRatio, string> = {
  "1:1": "tight, balanced square framing — keep the product and subject centered, with clean negative space on the sides",
  "4:5": "vertical social-feed framing that favors upper-body / product-forward composition",
  "9:16": "tall vertical framing optimized for full-bleed mobile (story/reels/TikTok) — give vertical room above and below the subject",
  "16:9": "wide horizontal framing that adds environmental context to the left and right of the subject",
};

const PLATFORM_HINTS: Partial<Record<PlatformTarget, string>> = {
  instagram_feed: "Instagram feed-friendly composition",
  instagram_story: "Instagram story / full-bleed vertical composition",
  tiktok: "TikTok vertical composition",
  meta_ads: "ad-friendly composition with room for overlay text",
  product_page: "ecommerce product-detail-page composition with the product clearly hero",
  marketplace_listing: "marketplace-listing composition: clear product silhouette, minimal background clutter",
  website_banner: "wide hero-banner composition with strong horizontal flow",
  landing_page: "landing-page hero composition with breathing room on the sides",
  email_banner: "email-banner composition optimized for short, wide reading width",
  other: "",
};

export function buildRatioReframeBlock(args: {
  targetRatio: OutputAspectRatio;
  targetPlatform?: PlatformTarget;
}): string {
  const lines: string[] = [
    "RATIO / PLATFORM ADAPTATION:",
    `- Re-compose this scene for a ${args.targetRatio} aspect ratio.`,
    `- ${RATIO_HINTS[args.targetRatio]}.`,
    "- Use the attached anchor image as the canonical reference for identity, product, lighting, mood, and visual style.",
    "- Do NOT simply crop the anchor. Re-frame the composition so it feels naturally shot for this aspect ratio.",
    "- Preserve the same model identity (if present), the same product, and the same overall environment.",
  ];
  const ph = args.targetPlatform ? PLATFORM_HINTS[args.targetPlatform] : "";
  if (ph) {
    lines.push(`- Optimize for: ${ph}.`);
  }
  return lines.join("\n");
}
