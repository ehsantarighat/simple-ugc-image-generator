// ============================================================================
// gemini-provider.ts
// Google Gemini Flash Image / Pro Image adapter. Fast, strong for reference-
// heavy multi-image composition.
//
// API: Google Generative Language v1beta
//   POST {GEMINI_BASE_URL}/models/{model}:generateContent?key={KEY}
//   body: { contents: [{ role: user, parts: [ {inlineData:{...}}, {text:"..."} ] }] }
//
// Image output appears in response candidates[0].content.parts[].inlineData
// as base64 PNG.
// ============================================================================

import "server-only";

import { serverEnv } from "@/lib/env";
import { uploadableToBase64 } from "@/lib/services/providers/provider-utils";
import type {
  ImageGenerationCallArgs,
  ImageGenerationCallResult,
  ImageProvider,
  ImageProviderInfo,
} from "@/lib/services/providers/image-provider-interface";

const info: ImageProviderInfo = {
  id: "gemini-flash-image",
  family: "gemini",
  qualityTier: "standard",
  capabilities: {
    supportsMultiImageReference: true,
    supportsImageEditing: true,
    supportsHighResolution: false,
    maxReferenceImages: 6,
    notes:
      "Gemini 2.5 Flash Image — fast, strong reference-heavy composition. Pro variant escalates on premium.",
  },
};

function canHandle(_args: ImageGenerationCallArgs): boolean {
  return !!process.env.GEMINI_API_KEY;
}

async function generate(
  args: ImageGenerationCallArgs
): Promise<ImageGenerationCallResult> {
  const env = serverEnv();
  if (!env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not set");

  const model =
    args.qualityPriority === "premium"
      ? env.GEMINI_IMAGE_MODEL_PRO
      : env.GEMINI_IMAGE_MODEL_FLASH;

  // Parts: each reference image first, then the text prompt last.
  const referenceParts = await Promise.all(
    args.references
      .slice(0, info.capabilities.maxReferenceImages)
      .map(async (ref) => ({
        inlineData: {
          mimeType: "image/jpeg",
          data: await uploadableToBase64(ref),
        },
      }))
  );
  const parts = [...referenceParts, { text: args.prompt }];

  const body = {
    contents: [{ role: "user", parts }],
    // generationConfig: candidate count + response modalities (text+image).
    generationConfig: {
      candidateCount: Math.max(1, Math.min(4, args.output.numberOfVariations)),
      responseModalities: ["IMAGE"],
    },
  };

  const url = `${env.GEMINI_BASE_URL}/models/${model}:generateContent?key=${env.GEMINI_API_KEY}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Gemini ${res.status}: ${text || res.statusText}`);
  }
  type Part = { inlineData?: { mimeType?: string; data?: string } };
  type Candidate = { content?: { parts?: Part[] } };
  const result = (await res.json()) as { candidates?: Candidate[] };
  const images: Buffer[] = [];
  for (const c of result.candidates ?? []) {
    for (const p of c.content?.parts ?? []) {
      const b64 = p.inlineData?.data;
      if (b64) images.push(Buffer.from(b64, "base64"));
    }
  }
  if (images.length === 0) throw new Error("Gemini returned no decodable images");
  return { images, providerId: model };
}

export const geminiProvider: ImageProvider = {
  info,
  canHandle,
  generate,
};
