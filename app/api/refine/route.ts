import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/supabase/server";
import { refinementStartSchema } from "@/lib/validators/generation";
import { runRefinement } from "@/lib/services/refinement-service";

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

  const parsed = refinementStartSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const result = await runRefinement({
      userId: user.id,
      sourceImageId: parsed.data.sourceImageId,
      refinementPrompt: parsed.data.refinementPrompt,
    });
    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Refinement failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
