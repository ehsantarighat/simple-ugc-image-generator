// ============================================================================
// qwen-image-edit-provider.ts
// Qwen Image Edit (Plus / Max) adapter — Alibaba Cloud Model Studio.
// Specialized for image-editing workflows with reference preservation.
//
// API: DashScope multimodal generation endpoint.
//   POST {QWEN_BASE_URL}/services/aigc/multimodal-generation/generation
//   body: { model, input: { messages: [{ role: user, content: [image..., text] }] } }
//
// The Plus variant is the default; Max is selected when qualityPriority is
// "premium".
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
  id: "qwen-image-edit",
  family: "qwen",
  qualityTier: "standard",
  capabilities: {
    supportsMultiImageReference: true,
    supportsImageEditing: true,
    supportsHighResolution: true,
    maxReferenceImages: 4,
    notes:
      "Alibaba Qwen Image Edit Plus/Max — strong editing fidelity, multi-image reference, ideal for refinement and small-change workflows.",
  },
};

function canHandle(_args: ImageGenerationCallArgs): boolean {
  return !!process.env.QWEN_API_KEY;
}

async function generate(
  args: ImageGenerationCallArgs
): Promise<ImageGenerationCallResult> {
  const env = serverEnv();
  if (!env.QWEN_API_KEY) throw new Error("QWEN_API_KEY not set");

  const model =
    args.qualityPriority === "premium"
      ? env.QWEN_IMAGE_EDIT_MODEL_MAX
      : env.QWEN_IMAGE_EDIT_MODEL_PLUS;

  // Build a multimodal "messages" payload: each reference becomes an
  // {image: dataUri} content block, followed by the prompt as text.
  const imageDataUris = await Promise.all(
    args.references
      .slice(0, info.capabilities.maxReferenceImages)
      .map((ref) => uploadableToDataUri(ref, "image/jpeg"))
  );
  const content: Array<Record<string, string>> = [
    ...imageDataUris.map((uri) => ({ image: uri })),
    { text: args.prompt },
  ];

  const body = {
    model,
    input: {
      messages: [
        {
          role: "user",
          content,
        },
      ],
    },
    parameters: {
      n: args.output.numberOfVariations,
      // DashScope's image-generation parameters want width*height with an
      // asterisk separator, NOT widthxheight like the rest of the platform.
      size: args.output.size.replace("x", "*"),
      result_format: "b64",
    },
  };

  const res = await fetch(
    `${env.QWEN_BASE_URL}/services/aigc/multimodal-generation/generation`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.QWEN_API_KEY}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Qwen ${res.status}: ${text || res.statusText}`);
  }
  // Qwen's response shape: { output: { choices: [{ message: { content: [{ image: "url-or-b64" }] } }] } }
  const result = (await res.json()) as {
    output?: {
      choices?: Array<{
        message?: {
          content?: Array<{ image?: string; image_url?: string }>;
        };
      }>;
    };
  };
  const images: Buffer[] = [];
  for (const choice of result.output?.choices ?? []) {
    for (const item of choice.message?.content ?? []) {
      const ref = item.image ?? item.image_url;
      if (!ref) continue;
      if (ref.startsWith("data:")) {
        const b64 = ref.split(",")[1];
        if (b64) images.push(Buffer.from(b64, "base64"));
      } else if (ref.startsWith("http")) {
        const r = await fetch(ref);
        if (r.ok) images.push(Buffer.from(await r.arrayBuffer()));
      } else {
        // Treat as raw base64
        images.push(Buffer.from(ref, "base64"));
      }
    }
  }
  if (images.length === 0) throw new Error("Qwen returned no decodable images");
  return { images, providerId: model };
}

export const qwenImageEditProvider: ImageProvider = {
  info,
  canHandle,
  generate,
};
