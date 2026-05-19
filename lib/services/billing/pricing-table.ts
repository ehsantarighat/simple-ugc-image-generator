// ============================================================================
// pricing-table.ts
// Public list-price snapshots for every image provider we route through.
// Returns cost in TENTH-CENTS (1/1000 USD) per image — fine-grained enough to
// capture sub-cent prices like Gemini Flash Image's ~$0.039 without floating
// point drift, and matches the `provider_cost_tenth_cents integer` column in
// migration 0006.
//
// Snapshot date: 2026-05. Prices are conservative estimates based on each
// provider's public pricing page; treat them as ballpark. The
// `price_table_version` is stamped onto every generated_images row so future
// price changes don't retroactively rewrite history.
//
// Adding a new provider: add an entry to PRICE_FNS keyed by the registry
// provider id, returning total cost for `n` images of `size` (and `quality`
// where relevant).
// ============================================================================

import "server-only";

export const PRICE_TABLE_VERSION = "2026-05" as const;

export interface PriceInput {
  /** Provider id from `provider.info.id`, e.g. "gpt-image-2", "fal-flux-kontext-multi" */
  providerId: string | null | undefined;
  /** Output size, e.g. "1024x1024", "1536x1024" */
  size?: string | null;
  /** Output quality (mainly used by GPT Image 2: low/medium/high/auto) */
  quality?: string | null;
  /** Number of images generated. Caller multiplies up. */
  numberOfImages: number;
}

export interface PriceOutput {
  providerId: string | null;
  /** Cost in tenths-of-a-cent USD (1000 = $0.10) */
  costTenthCents: number;
  /** Snapshot identifier — stamp this on each generated_images row */
  priceTableVersion: typeof PRICE_TABLE_VERSION;
  /** True when we recognized the providerId; false when we fell back to 0. */
  known: boolean;
}

// Helpers -------------------------------------------------------------------
function megapixelsFor(size: string | null | undefined): number {
  if (!size) return 1; // assume ~1MP if unknown
  const m = size.match(/^(\d+)x(\d+)$/i);
  if (!m) return 1;
  const w = parseInt(m[1], 10);
  const h = parseInt(m[2], 10);
  if (!w || !h) return 1;
  return (w * h) / 1_000_000;
}

// Type for a per-call price function. Returns tenth-cents per image (NOT
// per call — the caller multiplies by numberOfImages).
type PriceFn = (size: string | null | undefined, quality: string | null | undefined) => number;

// Per-image pricing in tenth-cents (1/1000 USD). 1 cent = 10 tenth-cents.
//
// Sources:
// - OpenAI Image API:    https://platform.openai.com/docs/pricing#image-generation
// - fal.ai model pages:  https://fal.ai/models/<id> → "Pricing"
// - Recraft API:         https://www.recraft.ai/docs#image-generation-pricing
// - Google AI Studio:    https://ai.google.dev/pricing
const PRICE_FNS: Record<string, PriceFn> = {
  // ------------------------------------------------------------------------
  // OpenAI — GPT Image 2 (formerly gpt-image-1). Pricing is quality-tiered:
  //   low ≈ $0.011, medium ≈ $0.042, high ≈ $0.167 per 1024² image, with a
  //   modest size multiplier above 1MP. We use a conservative interpolation
  //   for sizes other than the documented anchors.
  // ------------------------------------------------------------------------
  "gpt-image-2": (size, quality) => {
    const mp = megapixelsFor(size);
    const tier = (quality ?? "high").toLowerCase();
    const base =
      tier === "low" ? 110 :
      tier === "medium" ? 420 :
      /* high or auto */ 1670;
    // 1.5MP and 2MP outputs are roughly 1.3× and 1.6× a 1MP image at the
    // same quality. We approximate with a linear scaler clamped at 2x.
    const scaler = Math.min(2, Math.max(1, mp));
    return Math.round(base * scaler);
  },

  // ------------------------------------------------------------------------
  // fal.ai-routed adapters. fal bills per megapixel for most image models;
  // the per-1MP figures below come from each model's fal.ai pricing page.
  // ------------------------------------------------------------------------

  // FLUX Pro Kontext (multi): ~$0.05 per image at standard size.
  "fal-flux-kontext-multi": (size) => Math.round(500 * megapixelsFor(size)),

  // Recraft V3 via fal: ~$0.04 per image.
  "fal-recraft-v3": (size) => Math.round(400 * megapixelsFor(size)),

  // ByteDance Seedream V4 Edit via fal: ~$0.03 per image.
  "fal-seedream-v4-edit": (size) => Math.round(300 * megapixelsFor(size)),

  // Ideogram V3 via fal: ~$0.05 per image, ratio-flat.
  "fal-ideogram-v3": () => 500,

  // Nano Banana (Gemini Flash Image) edit via fal: ~$0.039 per image.
  "fal-nano-banana-edit": () => 390,

  // ------------------------------------------------------------------------
  // Native (non-fal) adapters
  // ------------------------------------------------------------------------

  // Recraft V3 native: same as fal-routed (~$0.04 per image).
  "recraft-v3": (size) => Math.round(400 * megapixelsFor(size)),

  // Gemini Flash Image native: ~$0.039 per image (Google AI Studio).
  "gemini-flash-image": () => 390,
  // Pro tier (when added): ~$0.10
  "gemini-pro-image": () => 1000,

  // Disabled in registry but priced for completeness:
  "qwen-image-edit": () => 250,   // ~$0.025 per image (Alibaba Model Studio Plus)
  "seedream-4-5": (size) => Math.round(300 * megapixelsFor(size)),
};

// Provider ids may come back as the raw model string (e.g. fal returns
// "fal-ai/flux-pro/kontext/max/multi" not "fal-flux-kontext-multi"). Map
// known model strings back to registry ids.
const MODEL_ALIASES: Record<string, string> = {
  "fal-ai/flux-pro/kontext/max/multi": "fal-flux-kontext-multi",
  "fal-ai/flux-pro/kontext/multi": "fal-flux-kontext-multi",
  "fal-ai/nano-banana/edit": "fal-nano-banana-edit",
  "fal-ai/recraft/v3": "fal-recraft-v3",
  "fal-ai/recraft/v3/image-to-image": "fal-recraft-v3",
  "fal-ai/bytedance/seedream/v4/edit": "fal-seedream-v4-edit",
  "fal-ai/ideogram/v3": "fal-ideogram-v3",
  "gpt-image-1": "gpt-image-2",
  "recraftv3": "recraft-v3",
};

export function calculateCost(input: PriceInput): PriceOutput {
  if (!input.providerId) {
    return {
      providerId: null,
      costTenthCents: 0,
      priceTableVersion: PRICE_TABLE_VERSION,
      known: false,
    };
  }
  const canonical = MODEL_ALIASES[input.providerId] ?? input.providerId;
  const fn = PRICE_FNS[canonical];
  if (!fn) {
    return {
      providerId: canonical,
      costTenthCents: 0,
      priceTableVersion: PRICE_TABLE_VERSION,
      known: false,
    };
  }
  const perImage = fn(input.size, input.quality);
  return {
    providerId: canonical,
    costTenthCents: perImage * Math.max(1, input.numberOfImages),
    priceTableVersion: PRICE_TABLE_VERSION,
    known: true,
  };
}

// Convenience for the UI layer.
export function formatTenthCents(tenthCents: number): string {
  if (!Number.isFinite(tenthCents) || tenthCents <= 0) return "$0.00";
  const usd = tenthCents / 1000;
  if (usd < 0.01) return "<$0.01";
  if (usd < 1) return `$${usd.toFixed(2)}`;
  if (usd < 100) return `$${usd.toFixed(2)}`;
  return `$${usd.toFixed(0)}`;
}
