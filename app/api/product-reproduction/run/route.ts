import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/supabase/server";
import { reproductionPlanSchema } from "@/lib/validators/generation";
import { runProductReproduction } from "@/lib/services/scaling/product-reproduction-workflow";

export const maxDuration = 600;

// Runs Mode A — Product Reproduction at scale.
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
  const parsed = reproductionPlanSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  try {
    const result = await runProductReproduction({
      userId: user.id,
      projectId: parsed.data.projectId,
      productId: parsed.data.productId,
      styles: parsed.data.styles as Parameters<typeof runProductReproduction>[0]["styles"],
      selectedPlatforms: parsed.data.selectedPlatforms as Parameters<typeof runProductReproduction>[0]["selectedPlatforms"],
      selectedRatios: parsed.data.selectedRatios as Parameters<typeof runProductReproduction>[0]["selectedRatios"],
      generateAllFormats: parsed.data.generateAllFormats,
      scope: parsed.data.scope as Parameters<typeof runProductReproduction>[0]["scope"],
      qualityPriority: parsed.data.qualityPriority as Parameters<typeof runProductReproduction>[0]["qualityPriority"],
      intentNotes: parsed.data.intentNotes ?? undefined,
    });
    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Product reproduction failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
