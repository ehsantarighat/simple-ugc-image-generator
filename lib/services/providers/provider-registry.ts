// ============================================================================
// provider-registry.ts
// Returns an ImageProvider for a given request. Today there's only one
// (GPT Image 2). Adding Seedream/Qwen/FLUX/Gemini = drop their adapter in
// and add it to the list below. The selection signal is qualityPriority
// today; richer routing (scene complexity, product-fidelity sensitivity,
// stage) can layer on top later.
// ============================================================================

import "server-only";

import { gptImage2Provider } from "@/lib/services/providers/adapters/gpt-image-2-provider";
import type { QualityPriority } from "@/lib/services/generation/payload-schema";
import type {
  ImageGenerationCallArgs,
  ImageProvider,
} from "@/lib/services/providers/image-provider-interface";

const PROVIDERS: ImageProvider[] = [gptImage2Provider];

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

  // 2. Filter to providers that can handle this call.
  const eligible = PROVIDERS.filter((p) => p.canHandle(args.call));
  if (eligible.length === 0) {
    throw new Error("No image provider can handle this request");
  }

  // 3. Rank by quality priority. Today this is trivial — premium maps to
  //    premium-tier providers, economy maps to economy-tier when present.
  const tierOrder: Record<QualityPriority, string[]> = {
    premium: ["premium", "standard", "economy"],
    balanced: ["standard", "premium", "economy"],
    economy: ["economy", "standard", "premium"],
    auto: ["premium", "standard", "economy"],
  };
  const order = tierOrder[args.qualityPriority ?? "auto"];
  const ranked = [...eligible].sort(
    (a, b) =>
      order.indexOf(a.info.qualityTier) - order.indexOf(b.info.qualityTier)
  );

  const provider = ranked[0];
  const fallback = ranked[1];
  return {
    provider,
    reason: `quality_priority=${args.qualityPriority ?? "auto"} → tier=${provider.info.qualityTier}`,
    fallback,
  };
}

export function listProviders(): ImageProvider[] {
  return [...PROVIDERS];
}
