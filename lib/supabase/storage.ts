import "server-only";

import { getSupabaseServiceClient } from "@/lib/supabase/service";

export const ASSETS_BUCKET = "ugc-assets";

export type AssetRoot = "models" | "products" | "generated" | "revisions";

export function buildStoragePath(
  root: AssetRoot,
  userId: string,
  segments: string[],
  filename: string
) {
  const parts = [root, userId, ...segments, filename].filter(Boolean);
  return parts.join("/");
}

// Returns a short-lived signed URL for a private object.
export async function signedAssetUrl(
  storagePath: string,
  expiresInSeconds = 60 * 15
): Promise<string | null> {
  const svc = getSupabaseServiceClient();
  const { data, error } = await svc.storage
    .from(ASSETS_BUCKET)
    .createSignedUrl(storagePath, expiresInSeconds);
  if (error || !data) return null;
  return data.signedUrl;
}

export async function signedAssetUrlsForPaths(paths: string[]) {
  const svc = getSupabaseServiceClient();
  const { data, error } = await svc.storage
    .from(ASSETS_BUCKET)
    .createSignedUrls(paths, 60 * 15);
  if (error || !data) return paths.map(() => null);
  return data.map((d) => d.signedUrl ?? null);
}

export async function uploadServerBytes(
  storagePath: string,
  bytes: ArrayBuffer | Buffer | Uint8Array,
  contentType: string
) {
  const svc = getSupabaseServiceClient();
  const { error } = await svc.storage
    .from(ASSETS_BUCKET)
    .upload(storagePath, bytes, {
      contentType,
      upsert: false,
    });
  if (error) throw new Error(`Storage upload failed: ${error.message}`);
  return storagePath;
}

export async function downloadAsset(storagePath: string) {
  const svc = getSupabaseServiceClient();
  const { data, error } = await svc.storage.from(ASSETS_BUCKET).download(storagePath);
  if (error || !data) throw new Error(`Storage download failed: ${error?.message ?? "no data"}`);
  return data;
}

export async function removeAssets(paths: string[]) {
  if (paths.length === 0) return;
  const svc = getSupabaseServiceClient();
  await svc.storage.from(ASSETS_BUCKET).remove(paths);
}
