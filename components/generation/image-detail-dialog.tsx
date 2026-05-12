"use client";

import * as React from "react";
import { toast } from "sonner";
import { Loader2, Download, Star, Wand2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SignedClientImage } from "@/components/generation/signed-client-image";
import { toggleFavoriteAction } from "@/lib/actions/projects";

interface GenImage {
  id: string;
  storage_path: string;
  is_favorite: boolean;
  parent_image_id: string | null;
  metadata_json: Record<string, unknown> | null;
  created_at: string;
}

interface Props {
  open: boolean;
  image: GenImage | null;
  onClose: () => void;
  onRefined: () => void;
}

export function ImageDetailDialog({ open, image, onClose, onRefined }: Props) {
  const [refinement, setRefinement] = React.useState("");
  const [refining, setRefining] = React.useState(false);
  const [isFav, setIsFav] = React.useState<boolean>(image?.is_favorite ?? false);

  React.useEffect(() => {
    setIsFav(image?.is_favorite ?? false);
    setRefinement("");
  }, [image]);

  if (!image) return null;

  async function onRefine() {
    if (!image) return;
    if (refinement.trim().length < 3) {
      return toast.error("Tell us what to change.");
    }
    setRefining(true);
    try {
      const res = await fetch("/api/refine", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sourceImageId: image.id,
          refinementPrompt: refinement.trim(),
        }),
      });
      const body = await res.json();
      if (!res.ok || body.status === "failed") {
        toast.error(body.error ?? body.errorMessage ?? "Refinement failed");
      } else {
        toast.success("Refinement done.");
        onRefined();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Refinement failed");
    } finally {
      setRefining(false);
    }
  }

  async function onFavorite() {
    if (!image) return;
    setIsFav((v) => !v);
    await toggleFavoriteAction(image.id);
  }

  function onDownload() {
    if (!image) return;
    window.open(`/api/download?id=${image.id}`, "_blank");
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl">
        <DialogTitle className="sr-only">Generated image</DialogTitle>
        <DialogDescription className="sr-only">
          Inspect, download, favorite, or refine this image.
        </DialogDescription>
        <div className="grid gap-5 md:grid-cols-[1fr_280px]">
          <div className="relative aspect-square w-full overflow-hidden rounded-md bg-[var(--color-secondary)]">
            <SignedClientImage path={image.storage_path} />
          </div>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Button onClick={onDownload} className="flex-1">
                <Download className="mr-1 h-4 w-4" /> Download
              </Button>
              <Button onClick={onFavorite} variant={isFav ? "secondary" : "outline"} size="icon">
                <Star
                  className={
                    "h-4 w-4 " + (isFav ? "fill-yellow-400 text-yellow-400" : "")
                  }
                />
              </Button>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium">Refine this image</div>
              <p className="text-xs text-[var(--color-muted-foreground)]">
                Tell us what to change. We'll re-shoot using the same model and product.
              </p>
              <Textarea
                rows={4}
                placeholder="e.g. Make the lighting warmer. Hold the bottle higher so the logo faces camera."
                value={refinement}
                onChange={(e) => setRefinement(e.target.value)}
                maxLength={500}
              />
              <Button onClick={onRefine} disabled={refining} className="w-full">
                {refining ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Refining…
                  </>
                ) : (
                  <>
                    <Wand2 className="mr-2 h-4 w-4" /> Refine
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
