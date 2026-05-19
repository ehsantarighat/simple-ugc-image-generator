import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { toFile, type Uploadable } from "openai/uploads";
import { requireUser } from "@/lib/supabase/server";
import { getSupabaseServiceClient } from "@/lib/supabase/service";
import {
  buildStoragePath,
  downloadAsset,
  uploadServerBytes,
} from "@/lib/supabase/storage";
import { selectProductReferences } from "@/lib/services/generation/reference-image-selection";

// Import every adapter directly — bypass the registry's enabled/disabled list
// so the test page can exercise providers that are currently commented out
// of production.
import { gptImage2Provider } from "@/lib/services/providers/adapters/gpt-image-2-provider";
import { seedreamProvider } from "@/lib/services/providers/adapters/seedream-provider";
import { recraftProvider } from "@/lib/services/providers/adapters/recraft-provider";
import { qwenImageEditProvider } from "@/lib/services/providers/adapters/qwen-image-edit-provider";
import { geminiProvider } from "@/lib/services/providers/adapters/gemini-provider";
import type { ImageProvider } from "@/lib/services/providers/image-provider-interface";

// Max execution time on Railway for this route. Per-provider hard timeout
// is enforced below so one slow adapter can't block the request.
export const maxDuration = 300;

const PROVIDERS: Record<string, ImageProvider> = {
  "gpt-image-2": gptImage2Provider,
  "seedream-4-5": seedreamProvider,
  "recraft-v3": recraftProvider,
  "qwen-image-edit": qwenImageEditProvider,
  "gemini-flash-image": geminiProvider,
};

const bodySchema = z.object({
  providerId: z.string().min(1),
  prompt: z.string().min(8).max(2000),
  productId: z.string().uuid(),
  modelId: z.string().uuid().optional().nullable(),
  aspectRatio: z.enum(["1:1", "4:5", "9:16", "16:9"]).optional().default("1:1"),
});

// Hard cap per provider. gpt-image-2 routinely takes 60–120s for image
// edits with multiple references; 180s gives slow-but-valid responses
// room to complete while still aborting truly hung connections before
// Railway's proxy (~300s) drops the request.
const PROVIDER_TIMEOUT_MS = 180_000;

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(
      () => reject(new Error(`${label} timed out after ${Math.round(ms / 1000)}s`)),
      ms
    );
    p.then((v) => {
      clearTimeout(t);
      resolve(v);
    }).catch((err) => {
      clearTimeout(t);
      reject(err);
    });
  });
}

export async function POST(req: NextRequest) {
  let user;
  try {
    ({ user } = await requireUser());
  } catch {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const provider = PROVIDERS[parsed.data.providerId];
  if (!provider) {
    return NextResponse.json({ error: `Unknown provider: ${parsed.data.providerId}` }, { status: 400 });
  }

  const start = Date.now();
  const svc = getSupabaseServiceClient();

  try {
    // Load product + (optional) model reference images.
    const { data: product, error: productErr } = await svc
      .from("products")
      .select(
        "id, name, product_images(storage_path, sort_order)"
      )
      .eq("id", parsed.data.productId)
      .eq("user_id", user.id)
      .single();
    if (productErr || !product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }
    type ImgRow = { storage_path: string; sort_order: number };
    const productImages = selectProductReferences(
      (product.product_images ?? []) as ImgRow[]
    );
    if (productImages.length === 0) {
      return NextResponse.json(
        { error: "Product has no reference images" },
        { status: 400 }
      );
    }
    const refProduct: Uploadable[] = await Promise.all(
      productImages.map(async (i, idx) => {
        const blob = await downloadAsset(i.storage_path);
        return toFile(Buffer.from(await blob.arrayBuffer()), `product-${idx}.jpg`, {
          type: "image/jpeg",
        });
      })
    );

    let refModel: Uploadable[] = [];
    if (parsed.data.modelId) {
      const { data: model } = await svc
        .from("models")
        .select("id, name, model_images(storage_path, sort_order)")
        .eq("id", parsed.data.modelId)
        .eq("user_id", user.id)
        .single();
      if (model) {
        const modelImages = (model.model_images ?? []) as ImgRow[];
        refModel = await Promise.all(
          modelImages.slice(0, 4).map(async (i, idx) => {
            const blob = await downloadAsset(i.storage_path);
            return toFile(Buffer.from(await blob.arrayBuffer()), `model-${idx}.jpg`, {
              type: "image/jpeg",
            });
          })
        );
      }
    }

    // Same prompt for every provider so we can compare results apples-to-apples.
    // Intentionally directive about the scene so a "broken" adapter that echoes
    // the input is visually obvious.
    const fullPrompt = `Create a photorealistic image based on the reference(s).
Product: ${product.name}.
Scene: ${parsed.data.prompt}
Important: produce a NEW photograph (not a copy of the reference). The product must be visible and faithfully preserved. Photographic realism is the highest priority.`;

    // Size — keep it 1024-class so every adapter can handle it without
    // hitting provider-specific ratio caps.
    const sizeByRatio: Record<string, string> = {
      "1:1": "1024x1024",
      "4:5": "1024x1280",
      "9:16": "1024x1824",
      "16:9": "1824x1024",
    };
    const size = sizeByRatio[parsed.data.aspectRatio];

    // Cap reference count per provider's capability — keeps Recraft (max 1)
    // from blowing up on a 5-reference call.
    const maxRefs = provider.info.capabilities.maxReferenceImages;
    const references = [...refModel, ...refProduct].slice(0, maxRefs);

    const result = await withTimeout(
      provider.generate({
        prompt: fullPrompt,
        references,
        output: {
          aspectRatio: parsed.data.aspectRatio,
          size,
          quality: "high",
          outputFormat: "png",
          numberOfVariations: 1,
          background: "auto",
        },
      }),
      PROVIDER_TIMEOUT_MS,
      parsed.data.providerId
    );

    if (result.images.length === 0) {
      return NextResponse.json(
        {
          ok: false,
          providerId: parsed.data.providerId,
          error: "Provider returned no images",
          durationMs: Date.now() - start,
        },
        { status: 200 }
      );
    }

    // Persist the first output under generated/{userId}/test/{ts}/{providerId}.png
    // so the existing SignedClientImage can display it.
    const ts = Date.now();
    const filename = `${parsed.data.providerId}-${ts}.png`;
    const storagePath = buildStoragePath(
      "generated",
      user.id,
      ["test", String(ts)],
      filename
    );
    await uploadServerBytes(storagePath, result.images[0], "image/png");

    return NextResponse.json({
      ok: true,
      providerId: parsed.data.providerId,
      providerInfoId: provider.info.id,
      tier: provider.info.qualityTier,
      storagePath,
      durationMs: Date.now() - start,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      {
        ok: false,
        providerId: parsed.data.providerId,
        error: msg,
        durationMs: Date.now() - start,
      },
      { status: 200 }
    );
  }
}

// GET — returns the list of available provider ids (for the test form's UI)
// so we don't hardcode them on the client.
export async function GET() {
  return NextResponse.json({
    providers: Object.entries(PROVIDERS).map(([id, p]) => ({
      id,
      tier: p.info.qualityTier,
      family: p.info.family,
      maxReferenceImages: p.info.capabilities.maxReferenceImages,
      notes: p.info.capabilities.notes ?? null,
    })),
  });
}
