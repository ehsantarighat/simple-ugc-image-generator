// ============================================================================
// ratio-planner-service.ts
// Spec section 7.3. Deterministic mapping from platform → required ratios.
// No I/O. Pure function.
// ============================================================================

import type {
  OutputAspectRatio,
  PlatformTarget,
} from "@/lib/services/generation/payload-schema";

// Each platform may need 1+ ratios. Order = priority.
const PLATFORM_RATIO_MAP: Record<PlatformTarget, OutputAspectRatio[]> = {
  instagram_feed: ["4:5"],
  instagram_story: ["9:16"],
  tiktok: ["9:16"],
  meta_ads: ["1:1", "4:5"],
  product_page: ["1:1"],
  marketplace_listing: ["1:1"],
  website_banner: ["16:9"],
  landing_page: ["16:9"],
  email_banner: ["16:9"],
  other: ["1:1"],
};

export interface RatioPlanItem {
  ratio: OutputAspectRatio;
  platforms: PlatformTarget[];
}

// Returns a deduplicated, priority-ordered set of ratios for the chosen
// platforms, plus the list of platforms each ratio satisfies.
export function planRatiosForPlatforms(
  platforms: PlatformTarget[]
): RatioPlanItem[] {
  if (platforms.length === 0) {
    // Default to a single 1:1 if no platforms specified.
    return [{ ratio: "1:1", platforms: [] }];
  }
  const grouped = new Map<OutputAspectRatio, Set<PlatformTarget>>();
  for (const p of platforms) {
    const ratios = PLATFORM_RATIO_MAP[p];
    for (const r of ratios) {
      if (!grouped.has(r)) grouped.set(r, new Set());
      grouped.get(r)!.add(p);
    }
  }
  return [...grouped.entries()].map(([ratio, plats]) => ({
    ratio,
    platforms: [...plats],
  }));
}

// Reverse helper: for a given (ratio, platform-set) plan, return the best
// platform label to associate with this ratio output.
export function primaryPlatformForRatio(
  ratio: OutputAspectRatio,
  platforms: PlatformTarget[]
): PlatformTarget | undefined {
  // Pick the first platform whose preferred ratio list begins with this ratio.
  for (const p of platforms) {
    if (PLATFORM_RATIO_MAP[p][0] === ratio) return p;
  }
  return platforms[0];
}
