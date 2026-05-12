import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/supabase/server";
import { packRunSchema } from "@/lib/validators/generation";
import { launchPack } from "@/lib/services/scaling/content-scaling-engine";

export const maxDuration = 600;

// POST /api/pack/run
// Persists a content_packs row and synchronously runs the pack pipeline.
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
  const parsed = packRunSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  if (parsed.data.subjectMode === "product_with_model" && !parsed.data.modelId) {
    return NextResponse.json(
      { error: "modelId is required when subjectMode === 'product_with_model'" },
      { status: 400 }
    );
  }

  try {
    const result = await launchPack({
      userId: user.id,
      projectId: parsed.data.projectId,
      modelId: parsed.data.modelId ?? null,
      productId: parsed.data.productId,
      subjectMode: parsed.data.subjectMode as "product_only" | "product_with_model",
      styleMode: parsed.data.styleMode as "studio" | "lifestyle" | "ugc" | "hybrid",
      scope: parsed.data.scope as
        | "single_image"
        | "few_variations"
        | "multi_format_pack"
        | "multi_concept_pack"
        | "full_campaign_pack",
      conceptDescription: parsed.data.conceptDescription,
      selectedPlatforms: parsed.data.selectedPlatforms as Parameters<typeof launchPack>[0]["selectedPlatforms"],
      requestedConceptCount: parsed.data.requestedConceptCount,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
    });
    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Pack run failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
