// ============================================================================
// provider-registry.ts
// Returns an ImageProvider for a given request.
//
// ACTIVE adapters today:
//   - gpt-image-2              (OpenAI native, premium)
//   - fal-flux-kontext-multi   (FLUX Pro Kontext via fal.ai, premium, multi-ref)
//   - fal-nano-banana-edit     (Gemini Flash Image via fal.ai, standard, multi-ref)
//   - fal-recraft-v3           (Recraft V3 via fal.ai, premium, single-ref)
//   - fal-seedream-v4-edit     (ByteDance Seedream V4 via fal.ai, premium)
//   - fal-ideogram-v3          (Ideogram V3 via fal.ai, premium, text/logo)
//   - recraft-v3 (native)      (Recraft native API, premium) — verified by /test
//   - gemini-flash-image (native) (Google AI Studio, standard) — verified by /test
//
// DISABLED native adapters (contract still wrong, fal versions cover them):
//   - seedreamProvider (BytePlus ARK — needs valid per-account model id)
//   - qwenImageEditProvider (multimodal-generation only describes, not edits)
//
// Each adapter's canHandle() reads its API key from process.env directly,
// so the registry naturally degrades to whatever's actually wired up. If
// FAL_KEY isn't set, the fal adapters all opt out and gpt-image-2 carries
// the load. If FAL_KEY is set, the registry can route by quality priority
// + reference count + tier preference.
// ============================================================================

import "server-only";

import { gptImage2Provider } from "@/lib/services/providers/adapters/gpt-image-2-provider";
import {
  falFluxKontextMulti,
  falNanoBananaEdit,
  falRecraftV3,
  falSeedreamV4Edit,
  falIdeogramV3,
} from "@/lib/services/providers/adapters/fal-provider";
// Native adapters confirmed working by /test bench → moved into rotation.
import { recraftProvider } from "@/lib/services/providers/adapters/recraft-provider";
import { geminiProvider } from "@/lib/services/providers/adapters/gemini-provider";
// Native adapters that still 404 / use the wrong endpoint — kept importable
// but out of rotation.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { seedreamProvider } from "@/lib/services/providers/adapters/seedream-provider";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { qwenImageEditProvider } from "@/lib/services/providers/adapters/qwen-image-edit-provider";
import type { QualityPriority } from "@/lib/services/generation/payload-schema";
import type {
  ImageGenerationCallArgs,
  ImageProvider,
} from "@/lib/services/providers/image-provider-interface";

const PROVIDERS: ImageProvider[] = [
  gptImage2Provider,
  falFluxKontextMulti,
  falNanoBananaEdit,
  falRecraftV3,
  falSeedreamV4Edit,
  falIdeogramV3,
  // Native adapters confirmed working by /test bench.
  recraftProvider,
  geminiProvider,
];

export interface SelectProviderArgs {
  qualityPriority?: QualityPriority;
  preferredProviderId?: string;
  call: ImageGenerationCallArgs;
}

export interface SelectedProvider {
  provider: ImageProvider;
  reason: string;
  fallback?: ImageProvider;
}

function tierRank(t: ImageProvider["info"]["qualityTier"]): number {
  switch (t) {
    case "premium":
      return 2;
    case "standard":
      return 1;
    case "economy":
      return 0;
  }
}

// Apply qualityPriority preference + capability filter. Returns the
// eligible providers sorted from most-preferred to least-preferred.
function rankEligible(
  call: ImageGenerationCallArgs,
  qualityPriority: QualityPriority
): ImageProvider[] {
  const refCount = call.references.length;
  const eligible = PROVIDERS.filter((p) => {
    if (!p.canHandle(call)) return false;
    if (refCount > p.info.capabilities.maxReferenceImages) return false;
    return true;
  });
  const desired: Array<ImageProvider["info"]["qualityTier"]> =
    qualityPriority === "economy"
      ? ["economy", "standard", "premium"]
      : qualityPriority === "balanced"
        ? ["standard", "premium", "economy"]
        : // "premium" and "auto" both prefer premium first
          ["premium", "standard", "economy"];
  return [...eligible].sort((a, b) => {
    const ai = desired.indexOf(a.info.qualityTier);
    const bi = desired.indexOf(b.info.qualityTier);
    return ai - bi || tierRank(b.info.qualityTier) - tierRank(a.info.qualityTier);
  });
}

export function selectProvider(args: SelectProviderArgs): SelectedProvider {
  // 1. Explicit preference wins if it can handle the call.
  if (args.preferredProviderId) {
    const found = PROVIDERS.find(
      (p) => p.info.id === args.preferredProviderId && p.canHandle(args.call)
    );
    if (found) {
      return { provider: found, reason: `explicit preference: ${found.info.id}` };
    }
  }
  const ranked = rankEligible(args.call, args.qualityPriority ?? "auto");
  if (ranked.length === 0) {
    throw new Error("No image provider can handle this request");
  }
  return {
    provider: ranked[0],
    reason: `quality_priority=${args.qualityPriority ?? "auto"} → ${ranked[0].info.id} (tier=${ranked[0].info.qualityTier})`,
    fallback: ranked[1],
  };
}

export function listProviders(): ImageProvider[] {
  return [...PROVIDERS];
}

export function listAvailableProviders(): ImageProvider[] {
  // Stub-friendly probe — one reference image so providers that require
  // at least one (like GPT Image 2's edit endpoint) aren't filtered out.
  const stubRef = {} as unknown as ImageGenerationCallArgs["references"][number];
  const dummy: ImageGenerationCallArgs = {
    prompt: "",
    references: [stubRef],
    output: {
      aspectRatio: "1:1",
      size: "1024x1024",
      quality: "high",
      outputFormat: "png",
      numberOfVariations: 1,
      background: "auto",
    },
  };
  return PROVIDERS.filter((p) => {
    try {
      return p.canHandle(dummy);
    } catch {
      return false;
    }
  });
}
