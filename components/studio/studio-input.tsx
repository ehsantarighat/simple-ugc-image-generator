"use client";

import * as React from "react";
import { useActionState } from "react";
import { ArrowUp, Loader2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ModeToggle, type CreationMode } from "@/components/studio/mode-toggle";
import { AttachMenu } from "@/components/studio/attach-menu";
import { QualityPicker, type QualityPriority } from "@/components/studio/quality-picker";
import { ScenarioChips, type Scenario } from "@/components/studio/scenario-chips";
import { cn } from "@/lib/utils";
import {
  createFromStudioAction,
  type StudioActionResult,
} from "@/lib/actions/studio";

interface Option {
  id: string;
  name: string;
}

interface Props {
  models: Option[];
  products: Option[];
  scenarios: Scenario[];
  initialMode?: CreationMode;
  initialModelId?: string | null;
  initialProductId?: string | null;
}

const ASPECT_RATIOS = ["1:1", "4:5", "9:16", "16:9"] as const;
type AspectRatio = (typeof ASPECT_RATIOS)[number];

export function StudioInput({
  models,
  products,
  scenarios,
  initialMode = "ugc_model_product",
  initialModelId = null,
  initialProductId = null,
}: Props) {
  const [state, formAction, pending] = useActionState<StudioActionResult, FormData>(
    createFromStudioAction,
    null
  );

  const [mode, setMode] = React.useState<CreationMode>(initialMode);
  const [modelId, setModelId] = React.useState<string | null>(initialModelId);
  const [productId, setProductId] = React.useState<string | null>(initialProductId);
  const [scene, setScene] = React.useState("");
  const [quality, setQuality] = React.useState<QualityPriority>("auto");
  const [aspectRatio, setAspectRatio] = React.useState<AspectRatio>("4:5");

  const isUgcMode = mode === "ugc_model_product";
  const selectedModel = models.find((m) => m.id === modelId);
  const selectedProduct = products.find((p) => p.id === productId);

  // Validation gates the Send button. The reason is shown beneath as a hint.
  let blockingReason: string | null = null;
  if (!productId) blockingReason = "Attach a product";
  else if (isUgcMode && !modelId) blockingReason = "Attach a model";
  else if (scene.trim().length < 8) blockingReason = "Describe the scene";

  const canSubmit = !blockingReason && !pending;

  function onPickScenario(s: Scenario) {
    setScene(s.prompt);
  }

  function onSubmitKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      (e.currentTarget.closest("form") as HTMLFormElement | null)?.requestSubmit();
    }
  }

  return (
    <div className="w-full">
      <form action={formAction}>
        {/* Hidden fields that the server action reads from FormData */}
        <input type="hidden" name="creationMode" value={mode} />
        <input type="hidden" name="modelId" value={modelId ?? ""} />
        <input type="hidden" name="productId" value={productId ?? ""} />
        <input type="hidden" name="qualityPriority" value={quality} />
        <input type="hidden" name="aspectRatio" value={aspectRatio} />

        {/* The input card */}
        <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-sm">
          {/* Attachment chips, if any are selected */}
          {(selectedModel || selectedProduct) && (
            <div className="flex flex-wrap items-center gap-2 px-5 pt-4">
              {selectedModel && (
                <ChipBadge
                  label={selectedModel.name}
                  kind="model"
                  onRemove={() => setModelId(null)}
                />
              )}
              {selectedProduct && (
                <ChipBadge
                  label={selectedProduct.name}
                  kind="product"
                  onRemove={() => setProductId(null)}
                />
              )}
            </div>
          )}

          {/* Textarea */}
          <textarea
            name="scenePrompt"
            value={scene}
            onChange={(e) => setScene(e.target.value)}
            onKeyDown={onSubmitKeyDown}
            placeholder={
              isUgcMode
                ? "Describe the scene… e.g. Morning routine in a softly lit bathroom, holding the bottle near her cheek, gentle smile."
                : "Describe the look… e.g. Clean studio shot on a soft beige background, slight reflection on the surface."
            }
            rows={4}
            maxLength={2000}
            className="w-full resize-none bg-transparent px-5 pt-4 text-[15px] leading-relaxed outline-none placeholder:text-[var(--color-muted-foreground)]"
          />

          {/* Footer toolbar */}
          <div className="flex items-center justify-between gap-2 px-3 pb-3 pt-1">
            <div className="flex items-center gap-1.5">
              <ModeToggle
                value={mode}
                onChange={(m) => {
                  setMode(m);
                  if (m === "product_reproduction") setModelId(null);
                }}
              />
              <AttachMenu
                models={models}
                products={products}
                modelId={modelId}
                productId={productId}
                showModel={isUgcMode}
                onSelectModel={setModelId}
                onSelectProduct={setProductId}
              />
              <AspectRatioPicker value={aspectRatio} onChange={setAspectRatio} />
            </div>
            <div className="flex items-center gap-2">
              <QualityPicker value={quality} onChange={setQuality} />
              <button
                type="submit"
                disabled={!canSubmit}
                aria-label={blockingReason ?? "Send"}
                title={blockingReason ?? "Send (⌘/Ctrl + Enter)"}
                className={cn(
                  "grid h-9 w-9 place-items-center rounded-full transition-colors",
                  canSubmit
                    ? "bg-[var(--color-foreground)] text-[var(--color-background)] hover:opacity-90"
                    : "bg-[var(--color-secondary)] text-[var(--color-muted-foreground)] cursor-not-allowed"
                )}
              >
                {pending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowUp className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Hint / error line */}
        <div className="mt-2 min-h-[1.25rem] text-center text-xs">
          {pending ? (
            <span className="text-[var(--color-muted-foreground)]">
              Creating your project and generating the first shot… this takes 30–90 seconds.
            </span>
          ) : state && state.ok === false ? (
            <span className="text-[var(--color-destructive)]">{state.message}</span>
          ) : blockingReason ? (
            <span className="text-[var(--color-muted-foreground)]">{blockingReason}</span>
          ) : (
            <span className="text-[var(--color-muted-foreground)]">
              ⌘/Ctrl + Enter to send
            </span>
          )}
        </div>

        <ScenarioChips scenarios={scenarios} onPick={onPickScenario} />
      </form>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function ChipBadge({
  label,
  kind,
  onRemove,
}: {
  label: string;
  kind: "model" | "product";
  onRemove: () => void;
}) {
  return (
    <Badge
      variant="secondary"
      className="gap-1.5 rounded-full pl-2 pr-1 py-0.5 text-xs font-normal"
    >
      <span className="text-[10px] uppercase tracking-wider opacity-60">
        {kind === "model" ? "Model" : "Product"}
      </span>
      <span className="font-medium">{label}</span>
      <button
        type="button"
        onClick={onRemove}
        className="ml-0.5 grid h-4 w-4 place-items-center rounded-full opacity-60 hover:opacity-100"
        aria-label={`Remove ${kind}`}
      >
        <X className="h-2.5 w-2.5" />
      </button>
    </Badge>
  );
}

function AspectRatioPicker({
  value,
  onChange,
}: {
  value: AspectRatio;
  onChange: (v: AspectRatio) => void;
}) {
  return (
    <div className="inline-flex rounded-full border border-[var(--color-border)] p-0.5 text-[11px]">
      {ASPECT_RATIOS.map((r) => (
        <button
          key={r}
          type="button"
          onClick={() => onChange(r)}
          className={cn(
            "rounded-full px-2 py-0.5 transition-colors",
            r === value
              ? "bg-[var(--color-foreground)] text-[var(--color-background)]"
              : "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
          )}
        >
          {r}
        </button>
      ))}
    </div>
  );
}
