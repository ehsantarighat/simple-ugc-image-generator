"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatRelativeTime } from "@/lib/utils";
import { SignedClientImage } from "@/components/generation/signed-client-image";
import type { RequestRow } from "@/components/projects/project-workspace";
import { Star } from "lucide-react";

interface Props {
  request: RequestRow;
  onImageClick: (img: RequestRow["images"][number]) => void;
}

export function GenerationRequestCard({ request, onImageClick }: Props) {
  const completedImages = request.images.filter((i) => !i.parent_image_id);
  const refinedChildren = request.images.filter((i) => i.parent_image_id);

  return (
    <Card>
      <CardContent className="p-5">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="line-clamp-2 text-sm">{request.raw_scene_prompt}</div>
            <div className="mt-1 flex flex-wrap gap-2 text-xs text-[var(--color-muted-foreground)]">
              <Badge variant="outline" className="text-[10px]">
                {request.controls_json.shotType}
              </Badge>
              <Badge variant="outline" className="text-[10px]">
                {request.controls_json.lighting}
              </Badge>
              <Badge variant="outline" className="text-[10px]">
                {request.controls_json.outputAspectRatio}
              </Badge>
              <span>· {formatRelativeTime(request.created_at)}</span>
            </div>
          </div>
          <StatusBadge status={request.status} />
        </div>

        {request.status === "failed" && request.error_message && (
          <div className="mb-3 rounded-md border border-[var(--color-destructive)]/30 bg-[var(--color-destructive)]/5 p-2 text-xs text-[var(--color-destructive)]">
            {request.error_message}
          </div>
        )}

        {completedImages.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {completedImages.map((img) => (
              <button
                key={img.id}
                type="button"
                onClick={() => onImageClick(img)}
                className="group relative aspect-square overflow-hidden rounded-md border border-[var(--color-border)] bg-[var(--color-secondary)]"
              >
                <SignedClientImage path={img.storage_path} />
                {img.is_favorite && (
                  <span className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full bg-black/60">
                    <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                  </span>
                )}
              </button>
            ))}
          </div>
        ) : request.status === "completed" ? (
          <p className="text-xs text-[var(--color-muted-foreground)]">
            No images saved for this run.
          </p>
        ) : null}

        {refinedChildren.length > 0 && (
          <div className="mt-4">
            <div className="mb-2 text-xs font-medium text-[var(--color-muted-foreground)]">
              Refinements
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {refinedChildren.map((img) => (
                <button
                  key={img.id}
                  type="button"
                  onClick={() => onImageClick(img)}
                  className="relative aspect-square overflow-hidden rounded-md border border-dashed border-[var(--color-border)] bg-[var(--color-secondary)]"
                >
                  <SignedClientImage path={img.storage_path} />
                </button>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: RequestRow["status"] }) {
  if (status === "completed") return <Badge variant="secondary">Done</Badge>;
  if (status === "failed") return <Badge variant="destructive">Failed</Badge>;
  if (status === "generating") return <Badge>Generating…</Badge>;
  return <Badge variant="outline">{status}</Badge>;
}
