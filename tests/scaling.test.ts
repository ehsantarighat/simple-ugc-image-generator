// ============================================================================
// Tests for the content-scaling addendum:
//   - ratio planner (platform → ratios)
//   - shot planner + estimator
//   - subject mode (product_only drops model preservation language)
//   - style mode produces distinct prompt fragments
//   - pack variation prompt includes ratio reframe instruction
// ============================================================================

import { describe, expect, it } from "vitest";

import {
  planRatiosForPlatforms,
  primaryPlatformForRatio,
} from "@/lib/services/scaling/ratio-planner-service";
import {
  estimatePackOutputs,
  planShots,
} from "@/lib/services/scaling/shot-planner-service";
import { buildPackPlan } from "@/lib/services/scaling/content-scaling-engine";
import { buildStructuredPayload } from "@/lib/services/generation/build-structured-payload";
import { buildGenerationPrompt } from "@/lib/services/generation/build-generation-prompt";
import { buildPackVariationPrompt } from "@/lib/services/generation/build-pack-variation-prompt";
import type { PhotographyControls } from "@/types";

const SAMPLE_CONTROLS: PhotographyControls = {
  shotType: "candid_lifestyle",
  cameraAngle: "eye_level",
  lensType: "smartphone_portrait",
  framing: "medium_close_up",
  lighting: "soft_window_light",
  authenticityLevel: "natural_influencer",
  productProminence: "balanced",
  outputAspectRatio: "4:5",
  numberOfVariations: 1,
};

describe("ratio-planner-service", () => {
  it("maps Instagram feed and story to distinct ratios", () => {
    const plan = planRatiosForPlatforms(["instagram_feed", "instagram_story"]);
    const ratios = plan.map((r) => r.ratio);
    expect(ratios).toContain("4:5");
    expect(ratios).toContain("9:16");
  });

  it("deduplicates when multiple platforms share a ratio", () => {
    const plan = planRatiosForPlatforms(["instagram_story", "tiktok"]);
    // Both want 9:16.
    expect(plan.length).toBe(1);
    expect(plan[0].ratio).toBe("9:16");
    expect(plan[0].platforms.sort()).toEqual(["instagram_story", "tiktok"]);
  });

  it("defaults to a single 1:1 when nothing is selected", () => {
    const plan = planRatiosForPlatforms([]);
    expect(plan).toEqual([{ ratio: "1:1", platforms: [] }]);
  });

  it("primaryPlatformForRatio picks a platform whose primary ratio matches", () => {
    const p = primaryPlatformForRatio("9:16", ["instagram_feed", "tiktok"]);
    expect(p).toBe("tiktok");
  });
});

describe("shot-planner-service", () => {
  it("produces 1 concept for single_image scope", () => {
    const plan = planShots({
      projectId: "p1",
      scope: "single_image",
      subjectMode: "product_with_model",
      styleMode: "ugc",
      conceptDescription: "morning routine in bathroom holding the serum",
      selectedPlatforms: ["instagram_feed"],
    });
    expect(plan.concepts.length).toBe(1);
  });

  it("produces multiple concepts for multi_concept_pack scope", () => {
    const plan = planShots({
      projectId: "p1",
      scope: "multi_concept_pack",
      subjectMode: "product_only",
      styleMode: "studio",
      conceptDescription: "premium product on white",
      selectedPlatforms: ["product_page"],
    });
    expect(plan.concepts.length).toBeGreaterThanOrEqual(2);
  });

  it("respects requestedConceptCount when supplied", () => {
    const plan = planShots({
      projectId: "p1",
      scope: "multi_concept_pack",
      subjectMode: "product_with_model",
      styleMode: "lifestyle",
      conceptDescription: "cafe and desk and bathroom",
      selectedPlatforms: ["instagram_feed"],
      requestedConceptCount: 4,
    });
    expect(plan.concepts.length).toBe(4);
  });
});

describe("plan estimator", () => {
  it("multiplies concepts × ratios × variations", () => {
    const plan = planShots({
      projectId: "p1",
      scope: "multi_concept_pack",
      subjectMode: "product_with_model",
      styleMode: "ugc",
      conceptDescription: "bathroom + cafe",
      selectedPlatforms: ["instagram_feed", "instagram_story"],
      requestedConceptCount: 3,
    });
    const ratios = planRatiosForPlatforms([
      "instagram_feed",
      "instagram_story",
    ]).map((r) => r.ratio);
    const estimate = estimatePackOutputs({ shotPlan: plan, ratios });
    expect(estimate).toBe(3 * ratios.length);
  });
});

describe("buildPackPlan", () => {
  it("returns plan with packType matching scope", () => {
    const p = buildPackPlan({
      projectId: "p1",
      scope: "multi_format_pack",
      subjectMode: "product_only",
      styleMode: "studio",
      conceptDescription: "premium isolated product",
      selectedPlatforms: ["product_page", "website_banner"],
    });
    expect(p.packType).toBe("multi_format");
    expect(p.shotPlan.concepts.length).toBeGreaterThan(0);
    expect(p.ratios).toContain("1:1");
    expect(p.ratios).toContain("16:9");
  });
});

describe("subject mode in generation prompt", () => {
  it("omits MODEL PRESERVATION language when product_only", () => {
    const payload = buildStructuredPayload({
      mode: "product_only_lifestyle_generation",
      scenePrompt: "Product on a bathroom shelf with soft window light.",
      controls: SAMPLE_CONTROLS,
      subjectMode: "product_only",
      styleMode: "lifestyle",
      outputScope: "single_image",
      model: null,
      product: {
        name: "Glow Serum",
        brandName: "NorthStar",
        category: "skincare",
        description: null,
        preservationNotes: null,
      },
    });
    const prompt = buildGenerationPrompt({
      payload,
      modelImageCount: 0,
      productImageCount: 3,
    });
    expect(prompt).not.toMatch(/MODEL PRESERVATION/);
    expect(prompt).toMatch(/SUBJECT MODE — PRODUCT ONLY/);
    expect(prompt).toMatch(/No human model appears/);
  });

  it("keeps MODEL PRESERVATION language when product_with_model", () => {
    const payload = buildStructuredPayload({
      mode: "ugc_composite_generation",
      scenePrompt: "Holding the serum in front of the bathroom mirror.",
      controls: SAMPLE_CONTROLS,
      subjectMode: "product_with_model",
      styleMode: "ugc",
      outputScope: "single_image",
      model: { name: "Maya", description: "Brunette, mid-20s" },
      product: {
        name: "Glow Serum",
        brandName: "NorthStar",
        category: "skincare",
        description: null,
        preservationNotes: null,
      },
    });
    const prompt = buildGenerationPrompt({
      payload,
      modelImageCount: 3,
      productImageCount: 3,
    });
    expect(prompt).toMatch(/MODEL PRESERVATION/);
    expect(prompt).toMatch(/SUBJECT MODE — PRODUCT WITH MODEL/);
  });
});

describe("style mode in generation prompt", () => {
  it("emits distinct fragments for studio vs ugc", () => {
    const baseArgs = {
      scenePrompt: "On a clean surface.",
      controls: SAMPLE_CONTROLS,
      subjectMode: "product_only" as const,
      outputScope: "single_image" as const,
      model: null,
      product: {
        name: "Product",
        brandName: null,
        category: null,
        description: null,
        preservationNotes: null,
      },
    };
    const studio = buildGenerationPrompt({
      payload: buildStructuredPayload({
        ...baseArgs,
        mode: "product_only_studio_generation",
        styleMode: "studio",
      }),
      modelImageCount: 0,
      productImageCount: 2,
    });
    const ugc = buildGenerationPrompt({
      payload: buildStructuredPayload({
        ...baseArgs,
        mode: "product_only_lifestyle_generation",
        styleMode: "ugc",
      }),
      modelImageCount: 0,
      productImageCount: 2,
    });
    expect(studio).toMatch(/STYLE MODE — STUDIO/);
    expect(ugc).toMatch(/STYLE MODE — UGC \/ INFLUENCER/);
    expect(studio).not.toEqual(ugc);
  });
});

describe("pack variation prompt", () => {
  it("includes ratio reframe instruction and the target ratio", () => {
    const payload = buildStructuredPayload({
      mode: "pack_variation_generation",
      scenePrompt: "Product on a bathroom shelf.",
      controls: { ...SAMPLE_CONTROLS, outputAspectRatio: "4:5" },
      subjectMode: "product_only",
      styleMode: "lifestyle",
      outputScope: "multi_format_pack",
      model: null,
      product: {
        name: "Product",
        brandName: null,
        category: null,
        description: null,
        preservationNotes: null,
      },
      targetAspectRatioOverride: "9:16",
      targetPlatform: "instagram_story",
    });
    const prompt = buildPackVariationPrompt({
      payload,
      modelImageCount: 0,
      productImageCount: 2,
    });
    expect(prompt).toMatch(/RATIO \/ PLATFORM ADAPTATION/);
    expect(prompt).toMatch(/9:16 aspect ratio/);
    expect(prompt).toMatch(/Do NOT simply crop/);
    expect(prompt).toMatch(/Instagram story/);
  });
});
