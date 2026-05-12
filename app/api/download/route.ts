import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/supabase/server";
import { downloadAsset } from "@/lib/supabase/storage";

// GET /api/download?id=<generated_image_id>
// Streams the bytes with a Content-Disposition: attachment header so the
// browser saves rather than displays. Verifies ownership against generated_images.
export async function GET(req: NextRequest) {
  let user;
  try {
    ({ user } = await requireUser());
  } catch {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }

  const id = req.nextUrl.searchParams.get("id");
  if (!id || !z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from("generated_images")
    .select("storage_path, project_id")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();
  if (error || !data) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const blob = await downloadAsset(data.storage_path);
    const bytes = await blob.arrayBuffer();
    const filename = `ugc-${id}.png`;
    return new NextResponse(bytes, {
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Download failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
