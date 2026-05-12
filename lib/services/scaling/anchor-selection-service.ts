// ============================================================================
// anchor-selection-service.ts
// Spec section 9.1. For now: the first completed image of an anchor request
// is treated as the canonical anchor. A future version can score candidates
// against the source references.
// ============================================================================

import "server-only";

import { getSupabaseServiceClient } from "@/lib/supabase/service";

export interface SelectedAnchor {
  generatedImageId: string;
  storagePath: string;
}

// Given a generation_request that just finished, pick the first generated
// image as the anchor. Returns null if no images.
export async function selectAnchorForRequest(args: {
  userId: string;
  generationRequestId: string;
}): Promise<SelectedAnchor | null> {
  const svc = getSupabaseServiceClient();
  const { data, error } = await svc
    .from("generated_images")
    .select("id, storage_path")
    .eq("user_id", args.userId)
    .eq("generation_request_id", args.generationRequestId)
    .order("created_at", { ascending: true })
    .limit(1);
  if (error || !data || data.length === 0) return null;
  return {
    generatedImageId: data[0].id as string,
    storagePath: data[0].storage_path as string,
  };
}
