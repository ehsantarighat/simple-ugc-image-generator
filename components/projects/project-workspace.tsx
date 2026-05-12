"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { GenerationControls } from "@/components/generation/generation-controls";
import { GenerationRequestCard } from "@/components/generation/generation-request-card";
import { ImageDetailDialog } from "@/components/generation/image-detail-dialog";
import type { PhotographyControls } from "@/types";
import { updateProjectSelectionAction } from "@/lib/actions/projects";

type Option = { id: string; name: string };

interface GenImage {
  id: string;
  storage_path: string;
  is_favorite: boolean;
  parent_image_id: string | null;
  metadata_json: Record<string, unknown> | null;
  created_at: string;
}

export interface RequestRow {
  id: string;
  status: "draft" | "queued" | "generating" | "completed" | "failed";
  error_message: string | null;
  raw_scene_prompt: string;
  controls_json: PhotographyControls;
  created_at: string;
  images: GenImage[];
}

interface Props {
  projectId: string;
  initialModelId: string | null;
  initialProductId: string | null;
  models: Option[];
  products: Option[];
  requests: RequestRow[];
}

const DEFAULT_CONTROLS: PhotographyControls = {
  shotType: "candid_lifestyle",
  cameraAngle: "eye_level",
  lensType: "smartphone_portrait",
  framing: "medium_close_up",
  lighting: "soft_window_light",
  authenticityLevel: "natural_influencer",
  productProminence: "balanced",
  outputAspectRatio: "4:5",
  numberOfVariations: 4,
};

export function ProjectWorkspace({
  projectId,
  initialModelId,
  initialProductId,
  models,
  products,
  requests,
}: Props) {
  const router = useRouter();
  const [modelId, setModelId] = React.useState<string>(initialModelId ?? "");
  const [productId, setProductId] = React.useState<string>(initialProductId ?? "");
  const [scene, setScene] = React.useState("");
  const [controls, setControls] = React.useState<PhotographyControls>(DEFAULT_CONTROLS);
  const [generating, setGenerating] = React.useState(false);
  const [openImage, setOpenImage] = React.useState<GenImage | null>(null);

  // Persist model/product selection when the user picks one.
  async function persistSelection(patch: { selected_model_id?: string; selected_product_id?: string }) {
    await updateProjectSelectionAction(projectId, patch);
  }

  function onSelectModel(value: string) {
    setModelId(value);
    persistSelection({ selected_model_id: value || undefined });
  }
  function onSelectProduct(value: string) {
    setProductId(value);
    persistSelection({ selected_product_id: value || undefined });
  }

  async function onGenerate() {
    if (!modelId) return toast.error("Pick a model first.");
    if (!productId) return toast.error("Pick a product first.");
    if (scene.trim().length < 8) return toast.error("Describe the scene in a sentence or two.");

    setGenerating(true);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          projectId,
          modelId,
          productId,
          scenePrompt: scene.trim(),
          controls,
        }),
      });
      const body = (await res.json()) as
        | { generationRequestId: string; status: string; errorMessage?: string; error?: string }
        | { error: string };
      if (!res.ok) {
        toast.error("error" in body ? body.error : "Generation failed");
      } else if ("status" in body && body.status === "failed") {
        toast.error(body.errorMessage ?? "Generation failed");
      } else {
        toast.success("Generated. Loading your shots…");
      }
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[380px_1fr]">
      {/* Left column: scene + controls --------------------------------- */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">1. Choose model & product</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Model</Label>
              <select
                className="flex h-9 w-full rounded-md border border-[var(--color-border)] bg-transparent px-3 text-sm"
                value={modelId}
                onChange={(e) => onSelectModel(e.target.value)}
              >
                <option value="">Pick a model…</option>
                {models.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Product</Label>
              <select
                className="flex h-9 w-full rounded-md border border-[var(--color-border)] bg-transparent px-3 text-sm"
                value={productId}
                onChange={(e) => onSelectProduct(e.target.value)}
              >
                <option value="">Pick a product…</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">2. Describe your scene</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              rows={4}
              value={scene}
              onChange={(e) => setScene(e.target.value)}
              placeholder="e.g. Morning routine in a softly lit bathroom, holding the serum bottle near her cheek, smiling at the mirror."
              maxLength={800}
            />
            <div className="text-xs text-[var(--color-muted-foreground)]">
              Keep it concrete: location, what the model is doing, mood.
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">3. Photography controls</CardTitle>
          </CardHeader>
          <CardContent>
            <GenerationControls value={controls} onChange={setControls} />
          </CardContent>
        </Card>

        <Button
          size="lg"
          className="w-full"
          onClick={onGenerate}
          disabled={generating || !modelId || !productId || scene.trim().length < 8}
        >
          {generating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating…
            </>
          ) : (
            "Generate realistic image"
          )}
        </Button>
        {generating && (
          <p className="text-center text-xs text-[var(--color-muted-foreground)]">
            This usually takes 30–90 seconds. Don't refresh.
          </p>
        )}
      </div>

      {/* Right column: gallery ---------------------------------------- */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-medium">Generations</h2>
          <span className="text-xs text-[var(--color-muted-foreground)]">
            {requests.length} {requests.length === 1 ? "run" : "runs"}
          </span>
        </div>
        <Separator className="mb-4" />
        {requests.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[var(--color-border)] py-16 text-center">
            <p className="text-sm text-[var(--color-muted-foreground)]">
              No shots yet. Pick a model + product, describe the scene, hit generate.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {requests.map((r) => (
              <GenerationRequestCard
                key={r.id}
                request={r}
                onImageClick={(img) => setOpenImage(img)}
              />
            ))}
          </div>
        )}
      </div>

      <ImageDetailDialog
        open={!!openImage}
        image={openImage}
        onClose={() => setOpenImage(null)}
        onRefined={() => {
          setOpenImage(null);
          router.refresh();
        }}
      />
    </div>
  );
}
