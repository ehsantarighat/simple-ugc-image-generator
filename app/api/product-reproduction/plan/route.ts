import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/supabase/server";
import { reproductionPlanSchema } from "@/lib/validators/generation";
import { buildReproductionPlan } from "@/lib/services/scaling/product-reproduction-planner-service";

// Dry-run plan for Mode A. No OpenAI call, no DB writes.
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
  const parsed = reproductionPlanSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const plan = buildReproductionPlan({
    projectId: parsed.data.projectId,
    scope: parsed.data.scope as "single_image" | "few_variations" | "multi_format_pack" | "multi_concept_pack" | "full_campaign_pack",
    styles: parsed.data.styles as Parameters<typeof buildReproductionPlan>[0]["styles"],
    selectedPlatforms: parsed.data.selectedPlatforms as Parameters<typeof buildReproductionPlan>[0]["selectedPlatforms"],
    selectedRatios: parsed.data.selectedRatios as Parameters<typeof buildReproductionPlan>[0]["selectedRatios"],
    generateAllFormats: parsed.data.generateAllFormats,
  });
  return NextResponse.json(plan);
}
