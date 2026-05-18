// ============================================================================
// Tests for the multi-provider registry behavior.
// We don't make real network calls — these exercise selectProvider's
// capability + qualityPriority ranking under different env configurations.
// ============================================================================

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  listAvailableProviders,
  listProviders,
  selectProvider,
} from "@/lib/services/providers/provider-registry";
import type { ImageGenerationCallArgs } from "@/lib/services/providers/image-provider-interface";

function makeStubRef(n: number) {
  return Array.from({ length: n }, () => ({})) as unknown as ImageGenerationCallArgs["references"];
}

function baseCall(refs = 2): ImageGenerationCallArgs {
  return {
    prompt: "anything",
    references: makeStubRef(refs),
    output: {
      aspectRatio: "1:1",
      size: "1024x1024",
      quality: "high",
      outputFormat: "png",
      numberOfVariations: 1,
      background: "auto",
    },
  };
}

describe("provider-registry: registration", () => {
  it("registers all 5 adapters", () => {
    const ids = listProviders().map((p) => p.info.id);
    expect(ids).toContain("gpt-image-2");
    expect(ids).toContain("seedream-4-5");
    expect(ids).toContain("recraft-v3");
    expect(ids).toContain("qwen-image-edit");
    expect(ids).toContain("gemini-flash-image");
    expect(ids.length).toBe(5);
  });
});

describe("provider-registry: selection", () => {
  // We need GPT Image 2 always to be eligible — its canHandle ignores env.
  // For Seedream/Recraft/Qwen/Gemini, set/unset their env keys per test.
  const ORIGINAL = { ...process.env };
  beforeEach(() => {
    process.env = { ...ORIGINAL };
    delete process.env.SEEDREAM_API_KEY;
    delete process.env.RECRAFT_API_KEY;
    delete process.env.QWEN_API_KEY;
    delete process.env.GEMINI_API_KEY;
  });
  afterEach(() => {
    process.env = ORIGINAL;
  });

  it("falls back to GPT Image 2 when no other key is configured", () => {
    const sel = selectProvider({ qualityPriority: "premium", call: baseCall() });
    expect(sel.provider.info.id).toBe("gpt-image-2");
  });

  it("only counts providers as available when their key is set", () => {
    expect(listAvailableProviders().map((p) => p.info.id)).toEqual(["gpt-image-2"]);
    process.env.SEEDREAM_API_KEY = "stub";
    expect(listAvailableProviders().map((p) => p.info.id).sort()).toEqual([
      "gpt-image-2",
      "seedream-4-5",
    ]);
  });

  it("respects explicit preferredProviderId when configured", () => {
    process.env.SEEDREAM_API_KEY = "stub";
    const sel = selectProvider({
      preferredProviderId: "seedream-4-5",
      qualityPriority: "auto",
      call: baseCall(),
    });
    expect(sel.provider.info.id).toBe("seedream-4-5");
    expect(sel.reason).toMatch(/explicit preference/);
  });

  it("filters out providers that can't handle the reference count", () => {
    // Recraft only accepts 1 reference; with 5 refs it should be filtered.
    process.env.RECRAFT_API_KEY = "stub";
    const sel = selectProvider({
      qualityPriority: "premium",
      preferredProviderId: "recraft-v3",
      call: baseCall(5),
    });
    // Preferred can't handle → fall back to general ranking, GPT Image 2 wins.
    expect(sel.provider.info.id).toBe("gpt-image-2");
  });

  it("includes a fallback option when more than one provider is eligible", () => {
    process.env.SEEDREAM_API_KEY = "stub";
    const sel = selectProvider({ qualityPriority: "premium", call: baseCall() });
    expect(sel.fallback).toBeDefined();
    // Both gpt-image-2 and seedream-4-5 are premium tier; one is primary,
    // the other becomes fallback.
    const ids = [sel.provider.info.id, sel.fallback!.info.id].sort();
    expect(ids).toContain("gpt-image-2");
    expect(ids).toContain("seedream-4-5");
  });
});

describe("provider capabilities", () => {
  it("Recraft accepts at most 1 reference image", () => {
    const recraft = listProviders().find((p) => p.info.id === "recraft-v3")!;
    expect(recraft.info.capabilities.maxReferenceImages).toBe(1);
  });

  it("Seedream supports multi-image reference up to 10", () => {
    const seedream = listProviders().find((p) => p.info.id === "seedream-4-5")!;
    expect(seedream.info.capabilities.maxReferenceImages).toBeGreaterThanOrEqual(10);
  });

  it("Gemini supports multi-image reference up to 6", () => {
    const gemini = listProviders().find((p) => p.info.id === "gemini-flash-image")!;
    expect(gemini.info.capabilities.maxReferenceImages).toBeGreaterThanOrEqual(6);
  });
});
