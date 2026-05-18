// ============================================================================
// seedream-provider.ts
// Seedream adapter (BytePlus ModelArk). Strong commercial generation
// quality, supports multi-image reference for product + model workflows.
//
// API: BytePlus ModelArk OpenAI-compatible image API
//   POST {SEEDREAM_BASE_URL}/images/generations
//   body: { model, prompt, image: [b64...], size, response_format }
//
// The "model" is the ARK endpoint id you create in the console for the
// Seedream catalog entry (SEEDREAM_MODEL_HIGH_QUALITY by default).
// ============================================================================

import "server-only";

import { serverEnv } from "@/lib/env";
import { uploadableToDataUri } from "@/lib/services/providers/provider-utils";
import type {
  ImageGenerationCallArgs,
  ImageGenerationCallResult,
  ImageProvider,
  ImageProviderInfo,
} from "@/lib/services/providers/image-provider-interface";

const info: ImageProviderInfo = {
  id: "seedream-4-5",
  family: "seedream",
  qualityTier: "premium",
  capabilities: {
    supportsMultiImageReference: true,
    supportsImageEditing: true,
    supportsHighResolution: true,
    maxReferenceImages: 10,
    notes:
      "BytePlus Seedream 4.5 — high-quality commercial image generation with multi-image reference support.",
  },
};

function canHandle(_args: ImageGenerationCallArgs): boolean {
  return !!process.env.SEEDREAM_API_KEY;
}

async function generate(
  args: ImageGenerationCallArgs
): Promise<ImageGenerationCallResult> {
  const env = serverEnv();
  if (!env.SEEDREAM_API_KEY) throw new Error("SEEDREAM_API_KEY not set");

  // Convert references to base64 data URIs — Seedream accepts them inline.
  const imageDataUris = await Promise.all(
    args.references
      .slice(0, info.capabilities.maxReferenceImages)
      .map((ref) => uploadableToDataUri(ref, "image/jpeg"))
  );

  const useLite = args.qualityPriority === "economy";
  const model = useLite ? env.SEEDREAM_MODEL_LITE : env.SEEDREAM_MODEL_HIGH_QUALITY;

  const body: Record<string, unknown> = {
    model,
    prompt: args.prompt,
    size: args.output.size,
    n: args.output.numberOfVariations,
    response_format: "b64_json",
  };
  if (imageDataUris.length === 1) {
    body.image = imageDataUris[0];
  } else if (imageDataUris.length > 1) {
    body.image = imageDataUris;
  }

  const res = await fetch(`${env.SEEDREAM_BASE_URL}/images/generations`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.SEEDREAM_API_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Seedream ${res.status}: ${text || res.statusText}`);
  }
  const result = (await res.json()) as {
    data?: { b64_json?: string; url?: string }[];
  };
  const images: Buffer[] = [];
  for (const item of result.data ?? []) {
    if (item.b64_json) {
      images.push(Buffer.from(item.b64_json, "base64"));
    } else if (item.url) {
      const r = await fetch(item.url);
      if (r.ok) images.push(Buffer.from(await r.arrayBuffer()));
    }
  }
  if (images.length === 0) throw new Error("Seedream returned no decodable images");
  return { images, providerId: model };
}

export const seedreamProvider: ImageProvider = {
  info,
  canHandle,
  generate,
};
