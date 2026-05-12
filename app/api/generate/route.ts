import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/supabase/server";
import { generationStartSchema } from "@/lib/validators/generation";
import {
  runGeneration,
  getGenerationRequestStatus,
} from "@/lib/services/image-generation-service";

// Image generation can take ~30-60s. Bump beyond the default.
export const maxDuration = 300;

// POST /api/generate
// Body: { projectId, modelId, productId, scenePrompt, controls }
// Runs the generation inline. Returns when the request is completed/failed.
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

  const parsed = generationStartSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const result = await runGeneration({
      userId: user.id,
      projectId: parsed.data.projectId,
      modelId: parsed.data.modelId ?? null,
      productId: parsed.data.productId,
      scenePrompt: parsed.data.scenePrompt,
      controls: parsed.data.controls,
      subjectMode: parsed.data.subjectMode as "product_only" | "product_with_model",
      styleMode: parsed.data.styleMode as "studio" | "lifestyle" | "ugc" | "hybrid",
    });
    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Generation failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// GET /api/generate?id=<generation_request_id>
// Lightweight status poll.
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id || !z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }
  let user;
  try {
    ({ user } = await requireUser());
  } catch {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }
  const status = await getGenerationRequestStatus(user.id, id);
  if (!status) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(status);
}
