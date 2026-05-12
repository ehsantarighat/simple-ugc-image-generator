import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/supabase/server";
import { variationStartSchema } from "@/lib/validators/generation";
import { runVariation } from "@/lib/services/variation-service";

export const maxDuration = 300;

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

  const parsed = variationStartSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const result = await runVariation({
      userId: user.id,
      approvedImageId: parsed.data.approvedImageId,
      variationRequest: parsed.data.variationRequest ?? null,
      count: parsed.data.count,
    });
    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Variation failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
