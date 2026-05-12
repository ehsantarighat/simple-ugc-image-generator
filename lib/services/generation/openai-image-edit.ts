// ============================================================================
// openai-image-edit.ts
// Thin adapter around openai.images.edit. Isolates the SDK call from the
// orchestrator services so the provider can be swapped without touching them.
// ============================================================================

import "server-only";

import type { Uploadable } from "openai/uploads";
import { getOpenAIClient } from "@/lib/openai/client";
import { buildImageEditRequest } from "@/lib/services/generation/build-image-edit-request";
import type { OutputSpecification } from "@/lib/services/generation/payload-schema";

export interface ImageEditCallArgs {
  model: string;
  prompt: string;
  images: Uploadable[];
  output: OutputSpecification;
  moderation?: "auto" | "low";
}

export interface ImageEditResult {
  // base64 PNG bytes for each returned candidate
  images: Buffer[];
}

export async function callOpenAIImageEdit(args: ImageEditCallArgs): Promise<ImageEditResult> {
  const request = buildImageEditRequest({
    model: args.model,
    prompt: args.prompt,
    images: args.images,
    output: args.output,
    moderation: args.moderation,
  });

  const client = getOpenAIClient();
  // OpenAI SDK types accept the broader image-edit param shape; we keep ours
  // typed to GPT Image 2's contract.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const response = await client.images.edit(request as any);

  if (!response.data || response.data.length === 0) {
    throw new Error("OpenAI returned no images");
  }
  const out: Buffer[] = [];
  for (const item of response.data) {
    if (!item.b64_json) continue;
    out.push(Buffer.from(item.b64_json, "base64"));
  }
  if (out.length === 0) throw new Error("OpenAI returned no decodable images");
  return { images: out };
}
