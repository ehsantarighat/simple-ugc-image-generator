// ============================================================================
// gpt-image-2-provider.ts
// Adapter that wraps the existing OpenAI images.edit call behind the
// ImageProvider interface. Swap-ready: any other adapter (Seedream/Qwen/
// FLUX/Gemini) can be added to provider-registry.ts without touching the
// pipeline code in image-generation-service / pack-generation-service.
// ============================================================================

import "server-only";

import { getOpenAIClient } from "@/lib/openai/client";
import { buildImageEditRequest } from "@/lib/services/generation/build-image-edit-request";
import { serverEnv } from "@/lib/env";
import type {
  ImageGenerationCallArgs,
  ImageGenerationCallResult,
  ImageProvider,
  ImageProviderInfo,
} from "@/lib/services/providers/image-provider-interface";

const info: ImageProviderInfo = {
  id: "gpt-image-2",
  family: "openai",
  qualityTier: "premium",
  capabilities: {
    supportsMultiImageReference: true,
    supportsImageEditing: true,
    supportsHighResolution: true,
    maxReferenceImages: 16,
    notes:
      "OpenAI gpt-image-2 via images.edit. Falls back to gpt-image-1 when OPENAI_IMAGE_MODEL is set to it.",
  },
};

function canHandle(args: ImageGenerationCallArgs): boolean {
  if (args.references.length === 0) return false;
  if (args.references.length > 16) return false;
  return true;
}

async function generate(
  args: ImageGenerationCallArgs
): Promise<ImageGenerationCallResult> {
  const env = serverEnv();
  const request = buildImageEditRequest({
    model: env.OPENAI_IMAGE_MODEL,
    prompt: args.prompt,
    images: args.references,
    output: args.output,
    moderation: "auto",
  });
  const client = getOpenAIClient();
  // The SDK's edit() signature is broader than our typed contract.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const response = await client.images.edit(request as any);
  if (!response.data || response.data.length === 0) {
    throw new Error("OpenAI returned no images");
  }
  const images: Buffer[] = [];
  for (const item of response.data) {
    if (!item.b64_json) continue;
    images.push(Buffer.from(item.b64_json, "base64"));
  }
  if (images.length === 0) {
    throw new Error("OpenAI returned no decodable images");
  }
  return {
    images,
    providerId: info.id,
    rawProviderMeta: { model: env.OPENAI_IMAGE_MODEL },
  };
}

export const gptImage2Provider: ImageProvider = {
  info,
  canHandle,
  generate,
};
