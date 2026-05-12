import "server-only";

import sharp from "sharp";
import { buildStoragePath, type AssetRoot, signedAssetUrlsForPaths, ASSETS_BUCKET, removeAssets } from "@/lib/supabase/storage";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { serverEnv } from "@/lib/env";

export const ACCEPTED_MIME = new Set(["image/png", "image/jpeg", "image/jpg", "image/webp"]);

export interface ValidatedUpload {
  bytes: Buffer;
  contentType: "image/jpeg" | "image/png" | "image/webp";
  ext: "jpg" | "png" | "webp";
  width: number;
  height: number;
}

// Validates an uploaded File: type + size guard, then sharp-decode to confirm
// it's a real image and capture dimensions. Throws on anything fishy.
export async function validateImageUpload(file: File): Promise<ValidatedUpload> {
  const env = serverEnv();
  const maxBytes = env.MAX_UPLOAD_MB * 1024 * 1024;

  if (!ACCEPTED_MIME.has(file.type)) {
    throw new Error(`Unsupported file type: ${file.type}`);
  }
  if (file.size > maxBytes) {
    throw new Error(`File too large (max ${env.MAX_UPLOAD_MB} MB).`);
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const meta = await sharp(buf).metadata();
  if (!meta.width || !meta.height) {
    throw new Error("Could not read image metadata.");
  }
  // Normalize to a sensible max edge and re-encode. This keeps uploads small
  // and protects us from EXIF/orientation oddities.
  const MAX_EDGE = 2048;
  const needsResize = (meta.width ?? 0) > MAX_EDGE || (meta.height ?? 0) > MAX_EDGE;
  const pipeline = sharp(buf, { failOn: "error" }).rotate();
  if (needsResize) pipeline.resize({ width: MAX_EDGE, height: MAX_EDGE, fit: "inside" });

  // Always JPEG for source references — smaller, no transparency needed.
  const out = await pipeline.jpeg({ quality: 88 }).toBuffer();
  const finalMeta = await sharp(out).metadata();

  return {
    bytes: out,
    contentType: "image/jpeg",
    ext: "jpg",
    width: finalMeta.width ?? meta.width ?? 0,
    height: finalMeta.height ?? meta.height ?? 0,
  };
}

// Uploads a validated image to storage using the authenticated user's session.
// This keeps RLS active so we can't accidentally write outside our own folder.
export async function uploadReferenceImage(args: {
  root: Extract<AssetRoot, "models" | "products">;
  userId: string;
  ownerId: string; // model id or product id
  index: number;
  file: ValidatedUpload;
}) {
  const supabase = await getSupabaseServerClient();
  const filename = `${Date.now()}-${args.index}.${args.file.ext}`;
  const storagePath = buildStoragePath(args.root, args.userId, [args.ownerId], filename);

  const { error } = await supabase.storage
    .from(ASSETS_BUCKET)
    .upload(storagePath, args.file.bytes, {
      contentType: args.file.contentType,
      upsert: false,
    });
  if (error) throw new Error(`Upload failed: ${error.message}`);
  return storagePath;
}

// Convenience: take a list of image rows, return a parallel array of signed URLs.
export async function hydrateImageUrls<T extends { storage_path: string }>(
  rows: T[]
): Promise<(T & { signed_url: string | null })[]> {
  if (rows.length === 0) return [];
  const urls = await signedAssetUrlsForPaths(rows.map((r) => r.storage_path));
  return rows.map((r, i) => ({ ...r, signed_url: urls[i] }));
}

export async function cleanupAssetPaths(paths: string[]) {
  await removeAssets(paths);
}
