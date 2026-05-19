// ============================================================================
// fal-provider.ts
// One adapter factory that wraps any fal.ai-hosted image model in our
// ImageProvider interface. Lets us register multiple "providers" (FLUX
// Kontext, Nano Banana Edit, Recraft, etc.) that all route through the
// fal.ai aggregator with a single API key.
//
// Auth: the fal SDK auto-reads FAL_KEY from process.env. We call
// fal.config() once per request to set the credentials (cheap + idempotent),
// so adapters work even if FAL_KEY arrived after the module loaded.
// ============================================================================

import "server-only";

import { fal } from "@fal-ai/client";
import { uploadableToDataUri } from "@/lib/services/providers/provider-utils";
import type {
  ImageGenerationCallArgs,
  ImageGenerationCallResult,
  ImageProvider,
  ImageProviderInfo,
} from "@/lib/services/providers/image-provider-interface";

export interface FalModelConfig {
  /** Public id we expose through our registry (and store in DB). */
  id: string;
  /** Full fal model path, e.g. "fal-ai/flux-pro/kontext/multi". */
  falModelPath: string;
  family: string;
  qualityTier: "economy" | "standard" | "premium";
  maxReferenceImages: number;
  notes?: string;
  /**
   * Some fal models take `image_url` (single ref), others `image_urls`
   * (multi ref), others use different shapes entirely. Each model config
   * provides its own input builder so the adapter stays generic.
   */
  buildInput: (args: ImageGenerationCallArgs, imageUrls: string[]) => Record<string, unknown>;
}

// fal's subscribe() response is typed as `Result<unknown>` from their SDK;
// the actual data shape depends on the model. We narrow at the call site.
type FalImageItem = { url?: string; b64_json?: string; content_type?: string };
type FalImageResponse = { images?: FalImageItem[]; image?: FalImageItem };

export function createFalProvider(config: FalModelConfig): ImageProvider {
  const info: ImageProviderInfo = {
    id: config.id,
    family: config.family,
    qualityTier: config.qualityTier,
    capabilities: {
      supportsMultiImageReference: config.maxReferenceImages > 1,
      supportsImageEditing: true,
      supportsHighResolution: true,
      maxReferenceImages: config.maxReferenceImages,
      notes:
        config.notes ?? `Routed via fal.ai → ${config.falModelPath}`,
    },
  };

  function canHandle(args: ImageGenerationCallArgs): boolean {
    if (!process.env.FAL_KEY) return false;
    if (args.references.length === 0) return false;
    if (args.references.length > config.maxReferenceImages) return false;
    return true;
  }

  async function generate(
    args: ImageGenerationCallArgs
  ): Promise<ImageGenerationCallResult> {
    if (!process.env.FAL_KEY) throw new Error("FAL_KEY not set");

    // Configure fal credentials per call. The SDK caches internally.
    fal.config({ credentials: process.env.FAL_KEY });

    // Convert references to inline data URIs — fal accepts URLs or data URIs.
    const imageUrls = await Promise.all(
      args.references
        .slice(0, config.maxReferenceImages)
        .map((ref) => uploadableToDataUri(ref, "image/jpeg"))
    );

    const input = config.buildInput(args, imageUrls);

    // subscribe() polls under the hood until the job completes (or fails).
    // Default timeout inside the SDK is generous; our route handler enforces
    // its own per-provider timeout (test bench: 180s; workflows: handled by
    // their own catch / detached error reporting).
    const response = await fal.subscribe(config.falModelPath, {
      input,
      logs: false,
    });

    // fal returns the model-specific payload under `data`. Most image models
    // populate `data.images: [{url}]`; a few use `data.image: {url}`.
    const data = (response as { data?: FalImageResponse }).data ?? {};
    const candidates: FalImageItem[] = data.images
      ? data.images
      : data.image
        ? [data.image]
        : [];

    const images: Buffer[] = [];
    for (const item of candidates) {
      if (item.b64_json) {
        images.push(Buffer.from(item.b64_json, "base64"));
        continue;
      }
      if (item.url) {
        const r = await fetch(item.url);
        if (r.ok) {
          images.push(Buffer.from(await r.arrayBuffer()));
        }
      }
    }
    if (images.length === 0) {
      throw new Error(`${config.id}: fal returned no decodable images`);
    }
    return {
      images,
      providerId: config.id,
      rawProviderMeta: { model: config.falModelPath },
    };
  }

  return { info, canHandle, generate };
}

// ============================================================================
// Curated model registrations
// ----------------------------------------------------------------------------
// All of these support image-to-image (i.e. take reference images), which is
// what our Mode A / Mode B / refinement workflows always send.
// ============================================================================

// FLUX Pro Kontext Multi — best general-purpose image editing with multiple
// reference images. Premium tier, multi-ref. Most flexible for UGC composites.
export const falFluxKontextMulti = createFalProvider({
  id: "fal-flux-kontext-multi",
  falModelPath: "fal-ai/flux-pro/kontext/multi",
  family: "flux-via-fal",
  qualityTier: "premium",
  maxReferenceImages: 6,
  notes: "FLUX Pro Kontext (multi-reference) — premium UGC composites.",
  buildInput: (args, imageUrls) => ({
    prompt: args.prompt,
    image_urls: imageUrls,
    num_images: args.output.numberOfVariations,
    aspect_ratio: args.output.aspectRatio,
    output_format: "png",
  }),
});

// Nano Banana Edit (Gemini Flash Image via fal) — fast, strong with multiple
// references, standard tier. Great default for "I want results quickly."
export const falNanoBananaEdit = createFalProvider({
  id: "fal-nano-banana-edit",
  falModelPath: "fal-ai/nano-banana/edit",
  family: "gemini-via-fal",
  qualityTier: "standard",
  maxReferenceImages: 4,
  notes: "Gemini Flash Image (Nano Banana) — fast multi-reference edit.",
  buildInput: (args, imageUrls) => ({
    prompt: args.prompt,
    image_urls: imageUrls,
    num_images: args.output.numberOfVariations,
    output_format: "png",
  }),
});

// Recraft V3 image-to-image (via fal) — purpose-built for product photography
// and brand imagery. Single-reference, premium tier.
export const falRecraftV3 = createFalProvider({
  id: "fal-recraft-v3",
  falModelPath: "fal-ai/recraft/v3/image-to-image",
  family: "recraft-via-fal",
  qualityTier: "premium",
  maxReferenceImages: 1,
  notes: "Recraft V3 image-to-image — premium product photography.",
  buildInput: (args, imageUrls) => ({
    prompt: args.prompt,
    image_url: imageUrls[0],
    style: "realistic_image",
    strength: 0.7,
  }),
});

// Seedream V4 Edit (via fal). Cleaner adapter than calling BytePlus ARK
// directly — no per-account endpoint id headaches.
export const falSeedreamV4Edit = createFalProvider({
  id: "fal-seedream-v4-edit",
  falModelPath: "fal-ai/bytedance/seedream/v4/edit",
  family: "seedream-via-fal",
  qualityTier: "premium",
  maxReferenceImages: 4,
  notes: "ByteDance Seedream V4 image edit — premium commercial.",
  buildInput: (args, imageUrls) => ({
    prompt: args.prompt,
    image_urls: imageUrls,
    num_images: args.output.numberOfVariations,
    image_size: args.output.aspectRatio === "1:1" ? "square_hd"
      : args.output.aspectRatio === "4:5" ? "portrait_4_3"
      : args.output.aspectRatio === "9:16" ? "portrait_16_9"
      : "landscape_16_9",
  }),
});

// Ideogram V3 — best-in-class for product+text and logo rendering.
export const falIdeogramV3 = createFalProvider({
  id: "fal-ideogram-v3",
  falModelPath: "fal-ai/ideogram/v3",
  family: "ideogram-via-fal",
  qualityTier: "premium",
  maxReferenceImages: 1,
  notes: "Ideogram V3 — strongest text/logo fidelity for product imagery.",
  buildInput: (args, imageUrls) => ({
    prompt: args.prompt,
    image_url: imageUrls[0],
    rendering_speed: "BALANCED",
    aspect_ratio: args.output.aspectRatio.replace(":", "_"),
  }),
});
