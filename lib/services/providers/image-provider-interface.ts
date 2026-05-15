// ============================================================================
// image-provider-interface.ts
// Pluggable image-provider contract. Adapters for OpenAI (GPT Image 2),
// Seedream, Qwen, FLUX, Gemini, etc. all implement this same shape so the
// generation pipeline can swap providers without changing call sites.
// ============================================================================

import "server-only";

import type { Uploadable } from "openai/uploads";
import type {
  OutputSpecification,
  QualityPriority,
} from "@/lib/services/generation/payload-schema";

export interface ImageProviderCapabilities {
  supportsMultiImageReference: boolean;
  supportsImageEditing: boolean;
  supportsHighResolution: boolean;
  maxReferenceImages: number;
  notes?: string;
}

export interface ImageProviderInfo {
  id: string; // canonical id e.g. 'gpt-image-2'
  family: string; // 'openai' | 'seedream' | 'qwen' | 'flux' | 'gemini'
  qualityTier: "economy" | "standard" | "premium";
  capabilities: ImageProviderCapabilities;
}

export interface ImageGenerationCallArgs {
  prompt: string;
  references: Uploadable[];
  output: OutputSpecification;
  qualityPriority?: QualityPriority;
  // Optional adapter-specific overrides (e.g., raw model id alias).
  adapterOptions?: Record<string, unknown>;
}

export interface ImageGenerationCallResult {
  // base64 PNGs decoded into Buffers; one per requested variation.
  images: Buffer[];
  providerId: string;
  rawProviderMeta?: Record<string, unknown>;
}

export interface ImageProvider {
  info: ImageProviderInfo;
  // Returns true if this provider can plausibly handle the request given
  // current capabilities and the requested output. Used by the registry.
  canHandle(args: ImageGenerationCallArgs): boolean;
  // Performs the actual call. Throws on transport/API failure.
  generate(args: ImageGenerationCallArgs): Promise<ImageGenerationCallResult>;
}
