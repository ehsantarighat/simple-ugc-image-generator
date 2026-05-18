// ============================================================================
// recraft-provider.ts
// Recraft V3 adapter. Purpose-built for product photography and brand
// imagery, with strong text/logo rendering. Replaces the FLUX/BFL slot.
//
// API: https://www.recraft.ai/docs
// - POST /v1/images/generations (text→image)
// - POST /v1/images/imageToImage (multipart, with image + strength)
//
// We use the imageToImage endpoint when references are present (almost
// always for us), passing the first product reference as the source.
// ============================================================================

import "server-only";

import { serverEnv } from "@/lib/env";
import { uploadableToBuffer } from "@/lib/services/providers/provider-utils";
import type {
  ImageGenerationCallArgs,
  ImageGenerationCallResult,
  ImageProvider,
  ImageProviderInfo,
} from "@/lib/services/providers/image-provider-interface";

const info: ImageProviderInfo = {
  id: "recraft-v3",
  family: "recraft",
  qualityTier: "premium",
  capabilities: {
    supportsMultiImageReference: false, // Recraft accepts one source image
    supportsImageEditing: true,
    supportsHighResolution: true,
    maxReferenceImages: 1,
    notes:
      "Recraft V3 — strong for product photography, brand imagery, and text/logo fidelity. Uses a single source image for image-to-image.",
  },
};

function canHandle(_args: ImageGenerationCallArgs): boolean {
  // Direct process.env read — keeps canHandle side-effect-free so it works
  // in test envs that haven't validated the full serverEnv schema.
  return !!process.env.RECRAFT_API_KEY;
}

function recraftSizeOf(target: string): string {
  // Recraft accepts a fixed set of sizes; map our canonical strings to its set.
  // Closest matches for our 4 ratios:
  switch (target) {
    case "1024x1024":
      return "1024x1024";
    case "1024x1280":
      return "1024x1365"; // closest portrait
    case "1024x1824":
      return "1024x1707"; // closest 9:16
    case "1824x1024":
      return "1820x1024"; // closest 16:9
    default:
      return "1024x1024";
  }
}

async function generate(
  args: ImageGenerationCallArgs
): Promise<ImageGenerationCallResult> {
  const env = serverEnv();
  if (!env.RECRAFT_API_KEY) throw new Error("RECRAFT_API_KEY not set");

  const size = recraftSizeOf(args.output.size);
  const useImageToImage = args.references.length > 0;
  const url = useImageToImage
    ? `${env.RECRAFT_BASE_URL}/images/imageToImage`
    : `${env.RECRAFT_BASE_URL}/images/generations`;

  let res: Response;
  if (useImageToImage) {
    const form = new FormData();
    const sourceBuf = await uploadableToBuffer(args.references[0]);
    form.append("image", new Blob([new Uint8Array(sourceBuf)], { type: "image/jpeg" }));
    form.append("prompt", args.prompt);
    form.append("model", env.RECRAFT_MODEL);
    form.append("size", size);
    form.append("strength", "0.5");
    form.append("response_format", "b64_json");
    form.append("n", String(args.output.numberOfVariations));
    res = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${env.RECRAFT_API_KEY}` },
      body: form,
    });
  } else {
    res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RECRAFT_API_KEY}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        prompt: args.prompt,
        model: env.RECRAFT_MODEL,
        size,
        response_format: "b64_json",
        n: args.output.numberOfVariations,
      }),
    });
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Recraft ${res.status}: ${text || res.statusText}`);
  }
  const body = (await res.json()) as {
    data?: { b64_json?: string; url?: string }[];
  };
  const images: Buffer[] = [];
  for (const item of body.data ?? []) {
    if (item.b64_json) {
      images.push(Buffer.from(item.b64_json, "base64"));
    } else if (item.url) {
      const r = await fetch(item.url);
      if (r.ok) images.push(Buffer.from(await r.arrayBuffer()));
    }
  }
  if (images.length === 0) throw new Error("Recraft returned no decodable images");
  return { images, providerId: info.id };
}

export const recraftProvider: ImageProvider = {
  info,
  canHandle,
  generate,
};
