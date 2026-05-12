import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/supabase/server";
import { exportPackAsZip } from "@/lib/services/scaling/pack-export-service";

export const maxDuration = 300;

// GET /api/pack/[id]/export
// Streams the ZIP bundle for a completed pack. Ownership-checked.
export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  let user;
  try {
    ({ user } = await requireUser());
  } catch {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }
  const { id } = await context.params;
  if (!z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ error: "Invalid pack id" }, { status: 400 });
  }
  try {
    const result = await exportPackAsZip({ userId: user.id, contentPackId: id });
    // Cast Buffer → Uint8Array view so NextResponse's BodyInit overload is happy.
    const body = new Uint8Array(
      result.bytes.buffer,
      result.bytes.byteOffset,
      result.bytes.byteLength
    );
    return new NextResponse(body, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${result.filename}"`,
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Export failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
