// ============================================================================
// pack-export-service.ts
// Spec section 16. Bundles all outputs of a content pack into a ZIP grouped
// by concept/platform/ratio.
//
// Uses a tiny zero-dep ZIP STORE writer (no compression, no extra fields) so
// we don't have to add a runtime dep. Suitable for image bundles whose bytes
// are already compressed (PNG/JPEG).
// ============================================================================

import "server-only";

import { getSupabaseServiceClient } from "@/lib/supabase/service";
import { downloadAsset } from "@/lib/supabase/storage";

// --- Minimal ZIP STORE writer ----------------------------------------------
// Reference: ZIP File Format Specification 6.3.x, method 0 (no compression).

function crc32(buf: Uint8Array): number {
  let c = ~0 >>> 0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) {
      c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
    }
  }
  return ~c >>> 0;
}

function dosTime(d: Date) {
  const hour = d.getHours();
  const minute = d.getMinutes();
  const second = Math.floor(d.getSeconds() / 2);
  return (hour << 11) | (minute << 5) | second;
}
function dosDate(d: Date) {
  const year = d.getFullYear() - 1980;
  const month = d.getMonth() + 1;
  const day = d.getDate();
  return (year << 9) | (month << 5) | day;
}

interface ZipEntry {
  name: string;
  data: Uint8Array;
  crc: number;
  offset: number;
}

export function buildZipBuffer(entries: { name: string; data: Uint8Array }[]): ArrayBuffer {
  const now = new Date();
  const dt = dosTime(now);
  const dd = dosDate(now);
  const enc = new TextEncoder();

  const localChunks: Uint8Array[] = [];
  const centralChunks: Uint8Array[] = [];
  let offset = 0;

  const finished: ZipEntry[] = [];
  for (const e of entries) {
    const nameBytes = enc.encode(e.name);
    const crc = crc32(e.data);
    const lfh = new Uint8Array(30 + nameBytes.length);
    const dv = new DataView(lfh.buffer);
    dv.setUint32(0, 0x04034b50, true); // sig
    dv.setUint16(4, 20, true); // version
    dv.setUint16(6, 0, true); // flags
    dv.setUint16(8, 0, true); // method = stored
    dv.setUint16(10, dt, true);
    dv.setUint16(12, dd, true);
    dv.setUint32(14, crc, true);
    dv.setUint32(18, e.data.length, true); // compressed = uncompressed
    dv.setUint32(22, e.data.length, true);
    dv.setUint16(26, nameBytes.length, true);
    dv.setUint16(28, 0, true);
    lfh.set(nameBytes, 30);
    localChunks.push(lfh, e.data);
    finished.push({ name: e.name, data: e.data, crc, offset });
    offset += lfh.length + e.data.length;
  }

  for (const f of finished) {
    const nameBytes = enc.encode(f.name);
    const cdh = new Uint8Array(46 + nameBytes.length);
    const dv = new DataView(cdh.buffer);
    dv.setUint32(0, 0x02014b50, true);
    dv.setUint16(4, 20, true);
    dv.setUint16(6, 20, true);
    dv.setUint16(8, 0, true);
    dv.setUint16(10, 0, true);
    dv.setUint16(12, dt, true);
    dv.setUint16(14, dd, true);
    dv.setUint32(16, f.crc, true);
    dv.setUint32(20, f.data.length, true);
    dv.setUint32(24, f.data.length, true);
    dv.setUint16(28, nameBytes.length, true);
    dv.setUint16(30, 0, true);
    dv.setUint16(32, 0, true);
    dv.setUint16(34, 0, true);
    dv.setUint16(36, 0, true);
    dv.setUint32(38, 0, true);
    dv.setUint32(42, f.offset, true);
    cdh.set(nameBytes, 46);
    centralChunks.push(cdh);
  }

  const centralSize = centralChunks.reduce((s, c) => s + c.length, 0);
  const centralOffset = offset;

  const eocd = new Uint8Array(22);
  const dv = new DataView(eocd.buffer);
  dv.setUint32(0, 0x06054b50, true);
  dv.setUint16(4, 0, true);
  dv.setUint16(6, 0, true);
  dv.setUint16(8, finished.length, true);
  dv.setUint16(10, finished.length, true);
  dv.setUint32(12, centralSize, true);
  dv.setUint32(16, centralOffset, true);
  dv.setUint16(20, 0, true);

  const total = offset + centralSize + eocd.length;
  // Allocate a real ArrayBuffer (not SharedArrayBuffer) so the caller gets a
  // type that NextResponse / Blob will accept cleanly under strict types.
  const ab = new ArrayBuffer(total);
  const out = new Uint8Array(ab);
  let cur = 0;
  for (const c of localChunks) {
    out.set(c, cur);
    cur += c.length;
  }
  for (const c of centralChunks) {
    out.set(c, cur);
    cur += c.length;
  }
  out.set(eocd, cur);
  return ab;
}

// --- Pack export -----------------------------------------------------------

function safe(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export interface ExportPackResult {
  bytes: ArrayBuffer;
  filename: string;
}

export async function exportPackAsZip(args: {
  userId: string;
  contentPackId: string;
}): Promise<ExportPackResult> {
  const svc = getSupabaseServiceClient();

  const { data: pack, error: packErr } = await svc
    .from("content_packs")
    .select("id, title, project_id, project:projects(title)")
    .eq("id", args.contentPackId)
    .eq("user_id", args.userId)
    .single();
  if (packErr || !pack) throw new Error("Content pack not found");

  const projectRel = Array.isArray(pack.project) ? pack.project[0] : pack.project;
  const projectName = safe(projectRel?.title ?? "project");
  const packName = safe(pack.title ?? "pack");

  const { data: concepts } = await svc
    .from("content_pack_concepts")
    .select("id, title")
    .eq("content_pack_id", args.contentPackId)
    .eq("user_id", args.userId)
    .order("created_at");

  const conceptTitleById = new Map<string, string>();
  (concepts ?? []).forEach((c) =>
    conceptTitleById.set(c.id as string, safe(c.title ?? "concept"))
  );

  const { data: outputs } = await svc
    .from("content_pack_outputs")
    .select(
      `id, role, target_aspect_ratio, target_platform, content_pack_concept_id,
       image:generated_images(storage_path)`
    )
    .eq("content_pack_id", args.contentPackId)
    .eq("user_id", args.userId);

  if (!outputs || outputs.length === 0) {
    throw new Error("Pack has no outputs to export");
  }

  const entries: { name: string; data: Uint8Array }[] = [];
  let counter = 0;
  for (const out of outputs) {
    const imgRel = Array.isArray(out.image) ? out.image[0] : out.image;
    if (!imgRel?.storage_path) continue;
    const blob = await downloadAsset(imgRel.storage_path);
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const conceptName =
      conceptTitleById.get(out.content_pack_concept_id as string) ?? "concept";
    const ratio = safe((out.target_aspect_ratio ?? "any").replace(":", "x"));
    const platform = safe(out.target_platform ?? "any");
    const role = safe(out.role ?? "image");
    const filename = `${projectName}/${packName}/${conceptName}/${platform}_${ratio}_${role}_${counter}.png`;
    entries.push({ name: filename, data: bytes });
    counter++;
  }

  return {
    bytes: buildZipBuffer(entries),
    filename: `${projectName}_${packName}.zip`,
  };
}
