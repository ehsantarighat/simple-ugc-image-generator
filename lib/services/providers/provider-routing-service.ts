// ============================================================================
// provider-routing-service.ts
// Thin wrapper that combines selectProvider() + execute + persisted
// routing metadata. Returns the result plus the routing decision so callers
// can stamp it onto generation_requests rows.
// ============================================================================

import "server-only";

import { selectProvider } from "@/lib/services/providers/provider-registry";
import type {
  ImageGenerationCallArgs,
  ImageGenerationCallResult,
} from "@/lib/services/providers/image-provider-interface";
import type { QualityPriority } from "@/lib/services/generation/payload-schema";

export interface RouteAndGenerateArgs {
  call: ImageGenerationCallArgs;
  qualityPriority?: QualityPriority;
  preferredProviderId?: string;
}

export interface RouteAndGenerateResult {
  result: ImageGenerationCallResult;
  providerId: string;
  fallbackProviderId: string | null;
  routingReason: string;
}

export async function routeAndGenerate(
  args: RouteAndGenerateArgs
): Promise<RouteAndGenerateResult> {
  const selected = selectProvider({
    qualityPriority: args.qualityPriority,
    preferredProviderId: args.preferredProviderId,
    call: args.call,
  });
  try {
    const result = await selected.provider.generate(args.call);
    return {
      result,
      providerId: selected.provider.info.id,
      fallbackProviderId: selected.fallback?.info.id ?? null,
      routingReason: selected.reason,
    };
  } catch (primaryErr) {
    if (!selected.fallback) {
      throw primaryErr;
    }
    // Escalate to fallback once. Wider retry/escalation is future work.
    const result = await selected.fallback.generate(args.call);
    return {
      result,
      providerId: selected.fallback.info.id,
      fallbackProviderId: selected.provider.info.id,
      routingReason: `${selected.reason} + escalated from ${selected.provider.info.id} (${
        primaryErr instanceof Error ? primaryErr.message : "error"
      })`,
    };
  }
}
