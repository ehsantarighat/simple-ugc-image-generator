import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/supabase/server";
import { packPlanSchema } from "@/lib/validators/generation";
import { buildPackPlan } from "@/lib/services/scaling/content-scaling-engine";

// POST /api/pack/plan
// Returns the dry-run plan for a pack request: concepts, ratios, estimated outputs.
// No DB writes, no OpenAI calls.
export async function POST(req: NextRequest) {
  try {
    await requireUser();
  } catch {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = packPlanSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const plan = buildPackPlan({
    projectId: parsed.data.projectId,
    scope: parsed.data.scope as
      | "single_image"
      | "few_variations"
      | "multi_format_pack"
      | "multi_concept_pack"
      | "full_campaign_pack",
    subjectMode: parsed.data.subjectMode as "product_only" | "product_with_model",
    styleMode: parsed.data.styleMode as "studio" | "lifestyle" | "ugc" | "hybrid",
    conceptDescription: parsed.data.conceptDescription,
    selectedPlatforms: parsed.data.selectedPlatforms as Parameters<typeof buildPackPlan>[0]["selectedPlatforms"],
    requestedConceptCount: parsed.data.requestedConceptCount,
  });
  return NextResponse.json(plan);
}
