// ============================================================================
// Tests for Mode A — Product Reproduction:
//   - planner produces outputs for each style × ratio
//   - planner respects generateAllFormats
//   - planner clamps single_image / few_variations scope
//   - product-reproduction prompt includes the style body and target ratio
//   - product-reproduction prompt omits MODEL PRESERVATION
//   - provider registry picks GPT Image 2 today
// ============================================================================

import { describe, expect, it } from "vitest";

import { buildReproductionPlan } from "@/lib/services/scaling/product-reproduction-planner-service";
import { buildStructuredPayload } from "@/lib/services/generation/build-structured-payload";
import { buildProductReproductionPrompt } from "@/lib/services/generation/build-product-reproduction-prompt";
import { selectProvider } from "@/lib/services/providers/provider-registry";
import type { PhotographyControls } from "@/types";

const SAMPLE_CONTROLS: PhotographyControls = {
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

describe("product-reproduction planner", () => {
  it("produces one output per style × ratio", () => {
    const plan = buildReproductionPlan({
      projectId: "p1",
      scope: "multi_format_pack",
      styles: ["studio_white_background", "flat_lay"],
      selectedPlatforms: ["instagram_feed", "instagram_story"],
    });
    // 2 styles × 2 ratios (from instagram_feed=4:5 + instagram_story=9:16)
    expect(plan.outputs.length).toBe(2 * 2);
    expect(plan.estimatedCallCount).toBe(4);
  });

  it("uses all 4 ratios when generateAllFormats is true", () => {
    const plan = buildReproductionPlan({
      projectId: "p1",
      scope: "multi_format_pack",
      styles: ["studio_white_background"],
      selectedPlatforms: [],
      generateAllFormats: true,
    });
    expect(plan.ratios.length).toBe(4);
    expect(plan.outputs.length).toBe(4);
  });

  it("clamps to 1 output for single_image scope", () => {
    const plan = buildReproductionPlan({
      projectId: "p1",
      scope: "single_image",
      styles: ["studio_white_background", "flat_lay", "catalog_premium"],
      selectedPlatforms: ["instagram_feed", "instagram_story"],
    });
    expect(plan.outputs.length).toBe(1);
  });

  it("falls back to 1:1 when nothing is selected", () => {
    const plan = buildReproductionPlan({
      projectId: "p1",
      scope: "few_variations",
      styles: ["studio_white_background"],
      selectedPlatforms: [],
    });
    expect(plan.ratios).toContain("1:1");
  });
});

describe("product-reproduction prompt", () => {
  it("includes the chosen style body and the target ratio", () => {
    const payload = buildStructuredPayload({
      mode: "product_reproduction_generation",
      scenePrompt: "Keep gold cap visible.",
      controls: SAMPLE_CONTROLS,
      subjectMode: "product_only",
      styleMode: "studio",
      outputScope: "multi_format_pack",
      model: null,
      product: {
        name: "Glow Serum",
        brandName: "NorthStar",
        category: "skincare",
        description: null,
        preservationNotes: null,
      },
    });
    payload.stylePreset = "studio_white_background";
    payload.creationMode = "product_reproduction";

    const prompt = buildProductReproductionPrompt({
      payload,
      productImageCount: 3,
    });
    expect(prompt).toMatch(/PRODUCT PRESENTATION STYLE/);
    expect(prompt).toMatch(/clean, professional white-background studio setup/);
    expect(prompt).toMatch(/Target aspect ratio: 1:1/);
    // Mode A has NO model preservation language.
    expect(prompt).not.toMatch(/MODEL PRESERVATION/);
  });

  it("emits different bodies for different style presets", () => {
    const base = buildStructuredPayload({
      mode: "product_reproduction_generation",
      scenePrompt: "",
      controls: SAMPLE_CONTROLS,
      subjectMode: "product_only",
      styleMode: "studio",
      outputScope: "multi_format_pack",
      model: null,
      product: {
        name: "X",
        brandName: null,
        category: null,
        description: null,
        preservationNotes: null,
      },
    });
    const flatLay = { ...base, stylePreset: "flat_lay" as const };
    const bathroom = { ...base, stylePreset: "bathroom_scene" as const };
    const a = buildProductReproductionPrompt({ payload: flatLay, productImageCount: 2 });
    const b = buildProductReproductionPrompt({ payload: bathroom, productImageCount: 2 });
    expect(a).toMatch(/top-down flat-lay/);
    expect(b).toMatch(/bathroom or skincare/);
    expect(a).not.toEqual(b);
  });
});

describe("provider registry", () => {
  it("selects GPT Image 2 for a normal call today", () => {
    // canHandle only inspects references.length — pass a single stub that
    // satisfies the structural Uploadable contract just enough for the check.
    const stubRef = {} as unknown as Parameters<typeof selectProvider>[0]["call"]["references"][number];
    const selected = selectProvider({
      qualityPriority: "premium",
      call: {
        prompt: "anything",
        references: [stubRef],
        output: {
          aspectRatio: "1:1",
          size: "1024x1024",
          quality: "high",
          outputFormat: "png",
          numberOfVariations: 1,
          background: "auto",
        },
      },
    });
    expect(selected.provider.info.id).toBe("gpt-image-2");
    expect(selected.reason).toMatch(/premium/);
  });
});
