// ============================================================================
// Unit tests for the GPT Image 2 generation engine.
// Covers spec section 23 — the 10 required tests, no mocks of the API.
// ============================================================================

import { describe, expect, it } from "vitest";

import {
  ASPECT_RATIO_SIZE_MAP,
  aspectRatioToSize,
  isValidGptImage2Background,
  isValidGptImage2Size,
} from "@/lib/services/generation/aspect-ratio-size-map";
import { buildStructuredPayload } from "@/lib/services/generation/build-structured-payload";
import { buildGenerationPrompt } from "@/lib/services/generation/build-generation-prompt";
import { buildRefinementPrompt } from "@/lib/services/generation/build-refinement-prompt";
import { buildImageEditRequest } from "@/lib/services/generation/build-image-edit-request";
import type { PhotographyControls } from "@/types";

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

const DEFAULT_CONTROLS: PhotographyControls = {
  shotType: "candid_lifestyle",
  cameraAngle: "eye_level",
  lensType: "smartphone_portrait",
  framing: "medium_close_up",
  lighting: "soft_window_light",
  authenticityLevel: "natural_influencer",
  productProminence: "balanced",
  outputAspectRatio: "4:5",
  numberOfVariations: 4,
};

const SAMPLE_SCENE =
  "Morning routine in a softly lit bathroom, holding the serum bottle near her cheek, smiling at the mirror.";

function buildSamplePayload(overrides?: { controls?: Partial<PhotographyControls> }) {
  return buildStructuredPayload({
    mode: "ugc_composite_generation",
    scenePrompt: SAMPLE_SCENE,
    controls: { ...DEFAULT_CONTROLS, ...overrides?.controls },
    model: { name: "Maya", description: "Brunette, mid-20s, lifestyle creator." },
    product: {
      name: "Glow Serum 30ml",
      brandName: "NorthStar",
      category: "skincare",
      description: "Lightweight vitamin C serum in a glass dropper bottle.",
      preservationNotes: "Keep the gold cap. Logo always faces camera.",
    },
  });
}

// ----------------------------------------------------------------------------
// 1. Aspect ratio → size mapping
// ----------------------------------------------------------------------------
describe("aspect ratio size mapping", () => {
  it("maps every supported ratio to a known size", () => {
    expect(aspectRatioToSize("1:1")).toBe("1024x1024");
    expect(aspectRatioToSize("4:5")).toBe("1024x1280");
    expect(aspectRatioToSize("9:16")).toBe("1024x1824");
    expect(aspectRatioToSize("16:9")).toBe("1824x1024");
  });
});

// ----------------------------------------------------------------------------
// 2. Prompt contains user scene input
// ----------------------------------------------------------------------------
describe("generation prompt contains user scene", () => {
  it("includes the verbatim user scene description", () => {
    const payload = buildSamplePayload();
    const prompt = buildGenerationPrompt({
      payload,
      modelImageCount: 3,
      productImageCount: 3,
    });
    expect(prompt).toContain(SAMPLE_SCENE);
  });
});

// ----------------------------------------------------------------------------
// 3. Prompt contains model preservation instructions
// ----------------------------------------------------------------------------
describe("generation prompt contains model preservation", () => {
  it("emits a model preservation block with identity language", () => {
    const payload = buildSamplePayload();
    const prompt = buildGenerationPrompt({
      payload,
      modelImageCount: 3,
      productImageCount: 3,
    });
    expect(prompt).toMatch(/MODEL PRESERVATION/i);
    expect(prompt).toMatch(/identity|facial structure|skin tone/i);
  });
});

// ----------------------------------------------------------------------------
// 4. Prompt contains product preservation instructions
// ----------------------------------------------------------------------------
describe("generation prompt contains product preservation", () => {
  it("emits a product preservation block with logo / packaging language", () => {
    const payload = buildSamplePayload();
    const prompt = buildGenerationPrompt({
      payload,
      modelImageCount: 3,
      productImageCount: 3,
    });
    expect(prompt).toMatch(/PRODUCT PRESERVATION/i);
    expect(prompt).toMatch(/packaging|logo|colors/i);
    expect(prompt).toContain("Glow Serum 30ml");
  });
});

// ----------------------------------------------------------------------------
// 5. Prompt changes when authenticity level changes
// ----------------------------------------------------------------------------
describe("authenticity level swap changes prompt", () => {
  it("emits different authenticity phrasing for different levels", () => {
    const natural = buildGenerationPrompt({
      payload: buildSamplePayload({ controls: { authenticityLevel: "natural_influencer" } }),
      modelImageCount: 3,
      productImageCount: 3,
    });
    const raw = buildGenerationPrompt({
      payload: buildSamplePayload({ controls: { authenticityLevel: "raw_everyday_user" } }),
      modelImageCount: 3,
      productImageCount: 3,
    });
    expect(natural).not.toEqual(raw);
    expect(natural).toMatch(/authentic influencer content/i);
    expect(raw).toMatch(/raw everyday user-created feel/i);
  });
});

// ----------------------------------------------------------------------------
// 6. Refinement prompt preserves original image by default
// ----------------------------------------------------------------------------
describe("refinement prompt preserves the original by default", () => {
  it("includes preservation priority language and source-image instruction", () => {
    const payload = buildSamplePayload();
    const prompt = buildRefinementPrompt({
      payload,
      refinementRequest: "Make the bottle face the camera a little more.",
      modelImageCount: 3,
      productImageCount: 3,
      hasSourceImage: true,
    });
    expect(prompt).toMatch(/PRESERVATION PRIORITY/i);
    expect(prompt).toMatch(/Keep the same model identity/i);
    expect(prompt).toMatch(/Keep the same product identity/i);
    expect(prompt).toMatch(/source generated image|primary composition/i);
  });
});

// ----------------------------------------------------------------------------
// 7. Mirror selfie prompts include reflection caution
// ----------------------------------------------------------------------------
describe("mirror selfie prompts include reflection caution", () => {
  it("adds reflection-specific negative constraints when shotType=mirror_selfie", () => {
    const payload = buildSamplePayload({
      controls: { shotType: "mirror_selfie" },
    });
    const prompt = buildGenerationPrompt({
      payload,
      modelImageCount: 3,
      productImageCount: 3,
    });
    expect(prompt).toMatch(/impossible reflection/i);
    expect(prompt).toMatch(/duplicated limbs in the reflection/i);
  });
});

// ----------------------------------------------------------------------------
// 8. Product-in-hand prompts include hand/product realism instruction
// ----------------------------------------------------------------------------
describe("product-in-hand prompts include hand/product realism", () => {
  it("includes interaction-specific language when product is in hand", () => {
    const payload = buildStructuredPayload({
      mode: "ugc_composite_generation",
      scenePrompt: "She is holding the bottle in her hand near the mirror.",
      controls: { ...DEFAULT_CONTROLS, shotType: "product_in_hand" },
      model: { name: "Maya" },
      product: { name: "Serum", brandName: null, category: null, description: null, preservationNotes: null },
    });
    const prompt = buildGenerationPrompt({
      payload,
      modelImageCount: 2,
      productImageCount: 2,
    });
    expect(prompt).toMatch(/naturally held in the model's hand/i);
    expect(prompt).toMatch(/fused or duplicated fingers/i);
  });
});

// ----------------------------------------------------------------------------
// 9. Invalid background "transparent" is rejected for GPT Image 2
// ----------------------------------------------------------------------------
describe("transparent background is rejected for GPT Image 2", () => {
  it("isValidGptImage2Background rejects 'transparent'", () => {
    expect(isValidGptImage2Background("transparent")).toBe(false);
    expect(isValidGptImage2Background("auto")).toBe(true);
    expect(isValidGptImage2Background("opaque")).toBe(true);
  });

  it("buildImageEditRequest throws when background is 'transparent'", () => {
    const payload = buildSamplePayload();
    expect(() =>
      buildImageEditRequest({
        model: "gpt-image-2",
        prompt: "test",
        images: [new File([new Uint8Array([0])], "x.png", { type: "image/png" })],
        output: {
          ...payload.output,
          // Intentionally bypass the type system to simulate a bad caller.
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          background: "transparent" as any,
        },
      })
    ).toThrow(/background/i);
  });
});

// ----------------------------------------------------------------------------
// 10. Output size values are valid and divisible by 16
// ----------------------------------------------------------------------------
describe("output size values are valid and divisible by 16", () => {
  it("every aspect ratio in the map produces a valid GPT Image 2 size", () => {
    for (const ratio of Object.keys(ASPECT_RATIO_SIZE_MAP) as Array<
      keyof typeof ASPECT_RATIO_SIZE_MAP
    >) {
      const size = ASPECT_RATIO_SIZE_MAP[ratio];
      expect(isValidGptImage2Size(size)).toBe(true);
      const [w, h] = size.split("x").map(Number);
      expect(w % 16).toBe(0);
      expect(h % 16).toBe(0);
    }
  });

  it("invalid sizes are rejected", () => {
    expect(isValidGptImage2Size("1023x1024")).toBe(false); // not divisible by 16
    expect(isValidGptImage2Size("not-a-size")).toBe(false);
    expect(isValidGptImage2Size("100x100")).toBe(false); // too small
  });
});
