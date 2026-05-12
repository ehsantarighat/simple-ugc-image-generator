export type AspectRatio = "1:1" | "4:5" | "9:16" | "16:9";
export type UgcTier = "raw" | "polished" | "premium";
export type Quality = "low" | "medium" | "high";

export interface GenerationMetadata {
  model: string;
  aspect_ratio: AspectRatio;
  quality: Quality;
  ugc_tier: UgcTier;
}

export interface GenerationSuccess {
  success: true;
  image_base64: string;
  mime_type: string;
  used_prompt: string;
  metadata: GenerationMetadata;
}

export interface GenerationFailure {
  success: false;
  error: string;
}

export type GenerationResult = GenerationSuccess | GenerationFailure;

export interface GenerateParams {
  modelImage: File;
  productImage: File;
  scene: string;
  aspectRatio: AspectRatio;
  ugcTier: UgcTier;
  quality: Quality;
  usage?: string;
}

const API_BASE = ""; // same-origin in production, proxied in dev via vite.

export async function generateImage(
  params: GenerateParams,
  signal?: AbortSignal,
): Promise<GenerationResult> {
  const form = new FormData();
  form.append("model_image", params.modelImage);
  form.append("product_image", params.productImage);
  form.append("scene", params.scene);
  form.append("aspect_ratio", params.aspectRatio);
  form.append("ugc_tier", params.ugcTier);
  form.append("quality", params.quality);
  if (params.usage) form.append("usage", params.usage);

  let response: Response;
  try {
    response = await fetch(`${API_BASE}/api/generate`, {
      method: "POST",
      body: form,
      signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    return { success: false, error: "Network error contacting the server." };
  }

  try {
    const data = (await response.json()) as GenerationResult;
    if (!response.ok && (data as GenerationFailure).error === undefined) {
      return {
        success: false,
        error: `Request failed with status ${response.status}.`,
      };
    }
    return data;
  } catch {
    return {
      success: false,
      error: `Unexpected non-JSON response (status ${response.status}).`,
    };
  }
}

export async function checkHealth(): Promise<boolean> {
  try {
    const r = await fetch(`${API_BASE}/api/health`);
    if (!r.ok) return false;
    const data = (await r.json()) as { status?: string };
    return data.status === "ok";
  } catch {
    return false;
  }
}
