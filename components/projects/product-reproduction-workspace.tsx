"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Camera, Loader2, Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { SignedClientImage } from "@/components/generation/signed-client-image";
import { cn } from "@/lib/utils";

// --- Types matching payload-schema -----------------------------------------
type ProductReproductionStyle =
  | "studio_white_background"
  | "studio_colored_background"
  | "studio_tabletop"
  | "flat_lay"
  | "catalog_premium"
  | "lifestyle_product_only"
  | "shelf_scene"
  | "desk_scene"
  | "bathroom_scene"
  | "minimal_brand_scene";

type AspectRatio = "1:1" | "4:5" | "9:16" | "16:9";

type PlatformTarget =
  | "instagram_feed"
  | "instagram_story"
  | "tiktok"
  | "meta_ads"
  | "product_page"
  | "marketplace_listing"
  | "website_banner"
  | "landing_page"
  | "email_banner"
  | "other";

type OutputScope =
  | "single_image"
  | "few_variations"
  | "multi_format_pack"
  | "multi_concept_pack"
  | "full_campaign_pack";

type QualityPriority = "economy" | "balanced" | "premium" | "auto";

interface Option {
  id: string;
  name: string;
}

interface GenImage {
  id: string;
  storage_path: string;
  image_role: string | null;
  metadata_json: Record<string, unknown> | null;
  created_at: string;
}

interface RequestRow {
  id: string;
  status: "draft" | "queued" | "generating" | "completed" | "failed";
  error_message: string | null;
  style_preset: string | null;
  target_aspect_ratio: string | null;
  target_platform: string | null;
  generation_mode: string | null;
  generation_stage: string | null;
  created_at: string;
  images: GenImage[];
}

interface Props {
  projectId: string;
  initialProductId: string | null;
  products: Option[];
  requests: RequestRow[];
}

const STYLES: { value: ProductReproductionStyle; title: string; body: string }[] = [
  { value: "studio_white_background", title: "Studio — white", body: "Clean catalog-ready white BG." },
  { value: "studio_colored_background", title: "Studio — colored", body: "Hero shot on a controlled BG." },
  { value: "studio_tabletop", title: "Tabletop", body: "Polished tabletop product still." },
  { value: "flat_lay", title: "Flat lay", body: "Top-down composition." },
  { value: "catalog_premium", title: "Catalog premium", body: "Polished ad-grade." },
  { value: "lifestyle_product_only", title: "Lifestyle", body: "In-environment, no model." },
  { value: "shelf_scene", title: "Shelf", body: "On a realistic shelf / display." },
  { value: "desk_scene", title: "Desk", body: "Modern desk / workspace context." },
  { value: "bathroom_scene", title: "Bathroom", body: "Beauty / skincare bathroom feel." },
  { value: "minimal_brand_scene", title: "Minimal brand", body: "Negative space, brand-forward." },
];

const PLATFORMS: { value: PlatformTarget; label: string }[] = [
  { value: "instagram_feed", label: "Instagram feed" },
  { value: "instagram_story", label: "Instagram story" },
  { value: "tiktok", label: "TikTok" },
  { value: "meta_ads", label: "Meta ads" },
  { value: "product_page", label: "Product page" },
  { value: "marketplace_listing", label: "Marketplace" },
  { value: "website_banner", label: "Website banner" },
  { value: "landing_page", label: "Landing page" },
  { value: "email_banner", label: "Email banner" },
  { value: "other", label: "Other" },
];

const RATIOS: AspectRatio[] = ["1:1", "4:5", "9:16", "16:9"];

const SCOPES: { value: OutputScope; label: string }[] = [
  { value: "single_image", label: "Single image" },
  { value: "few_variations", label: "Few variations" },
  { value: "multi_format_pack", label: "Multi-format pack" },
  { value: "multi_concept_pack", label: "Multi-concept pack" },
  { value: "full_campaign_pack", label: "Full campaign pack" },
];

const QUALITIES: { value: QualityPriority; label: string }[] = [
  { value: "auto", label: "Auto" },
  { value: "economy", label: "Economy" },
  { value: "balanced", label: "Balanced" },
  { value: "premium", label: "Premium" },
];

interface PlanResult {
  outputs: {
    id: string;
    style: ProductReproductionStyle;
    ratio: AspectRatio;
    platform?: PlatformTarget;
    styleLabel: string;
  }[];
  estimatedCallCount: number;
  styles: ProductReproductionStyle[];
  ratios: AspectRatio[];
  platforms: PlatformTarget[];
  notes: string[];
}

export function ProductReproductionWorkspace(props: Props) {
  const router = useRouter();
  const [productId, setProductId] = React.useState<string>(props.initialProductId ?? "");
  const [styles, setStyles] = React.useState<Set<ProductReproductionStyle>>(
    () => new Set(["studio_white_background"])
  );
  const [ratios, setRatios] = React.useState<Set<AspectRatio>>(() => new Set(["1:1"]));
  const [platforms, setPlatforms] = React.useState<Set<PlatformTarget>>(new Set());
  const [generateAllFormats, setGenerateAllFormats] = React.useState(false);
  const [scope, setScope] = React.useState<OutputScope>("multi_format_pack");
  const [quality, setQuality] = React.useState<QualityPriority>("auto");
  const [intentNotes, setIntentNotes] = React.useState("");
  const [plan, setPlan] = React.useState<PlanResult | null>(null);
  const [planning, setPlanning] = React.useState(false);
  const [running, setRunning] = React.useState(false);

  function toggle<T>(set: Set<T>, v: T): Set<T> {
    const next = new Set(set);
    if (next.has(v)) next.delete(v);
    else next.add(v);
    return next;
  }

  async function onPlan() {
    if (!productId) return toast.error("Pick a product.");
    if (styles.size === 0) return toast.error("Pick at least one style.");
    setPlanning(true);
    try {
      const res = await fetch("/api/product-reproduction/plan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          projectId: props.projectId,
          productId,
          styles: [...styles],
          selectedPlatforms: [...platforms],
          selectedRatios: [...ratios],
          generateAllFormats,
          scope,
          qualityPriority: quality,
          intentNotes: intentNotes.trim() || null,
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        toast.error(body.error ?? "Plan failed");
        return;
      }
      setPlan(body as PlanResult);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Plan failed");
    } finally {
      setPlanning(false);
    }
  }

  async function onRun() {
    if (!plan) return toast.error("Generate the plan first.");
    if (!productId) return toast.error("Pick a product.");
    setRunning(true);
    try {
      const res = await fetch("/api/product-reproduction/run", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          projectId: props.projectId,
          productId,
          styles: [...styles],
          selectedPlatforms: [...platforms],
          selectedRatios: [...ratios],
          generateAllFormats,
          scope,
          qualityPriority: quality,
          intentNotes: intentNotes.trim() || null,
        }),
      });
      const body = await res.json();
      if (!res.ok || body.status === "failed") {
        toast.error(body.error ?? body.errorMessage ?? "Generation failed");
      } else {
        toast.success(`Generated ${body.generatedImageIds?.length ?? 0} images.`);
        router.refresh();
        setPlan(null);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setRunning(false);
    }
  }

  // --- Group existing outputs by style + ratio for the gallery -----------
  const allOutputs = props.requests.flatMap((r) =>
    r.images.map((img) => ({
      ...img,
      requestStyle: r.style_preset,
      requestRatio: r.target_aspect_ratio,
      requestPlatform: r.target_platform,
      status: r.status,
    }))
  );
  const grouped = new Map<string, typeof allOutputs>();
  for (const o of allOutputs) {
    const key = o.requestStyle ?? "unknown";
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(o);
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[380px_1fr]">
      {/* Left column: configuration ----------------------------------- */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Camera className="h-4 w-4" />
              1. Product
            </CardTitle>
          </CardHeader>
          <CardContent>
            <select
              value={productId}
              onChange={(e) => {
                setProductId(e.target.value);
                setPlan(null);
              }}
              className="flex h-9 w-full rounded-md border border-[var(--color-border)] bg-transparent px-3 text-sm"
            >
              <option value="">Pick a product…</option>
              {props.products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">2. Styles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              {STYLES.map((s) => {
                const active = styles.has(s.value);
                return (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => {
                      setStyles((prev) => toggle(prev, s.value));
                      setPlan(null);
                    }}
                    className={cn(
                      "rounded-md border p-2 text-left text-xs transition-colors",
                      active
                        ? "border-[var(--color-foreground)] bg-[var(--color-secondary)]/60"
                        : "border-[var(--color-border)] hover:bg-[var(--color-secondary)]/40"
                    )}
                  >
                    <div className="font-medium">{s.title}</div>
                    <div className="mt-0.5 text-[10px] text-[var(--color-muted-foreground)]">
                      {s.body}
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">3. Ratios & platforms</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-xs">Aspect ratios</Label>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {RATIOS.map((r) => {
                  const active = ratios.has(r);
                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() => {
                        setRatios((prev) => toggle(prev, r));
                        setPlan(null);
                      }}
                      className={cn(
                        "rounded-full border px-3 py-1 text-xs transition-colors",
                        active
                          ? "border-[var(--color-foreground)] bg-[var(--color-foreground)] text-[var(--color-background)]"
                          : "border-[var(--color-border)] hover:bg-[var(--color-secondary)]"
                      )}
                    >
                      {r}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <Label className="text-xs">Platforms (optional)</Label>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {PLATFORMS.map((p) => {
                  const active = platforms.has(p.value);
                  return (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => {
                        setPlatforms((prev) => toggle(prev, p.value));
                        setPlan(null);
                      }}
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-[11px] transition-colors",
                        active
                          ? "border-[var(--color-foreground)] bg-[var(--color-foreground)] text-[var(--color-background)]"
                          : "border-[var(--color-border)] hover:bg-[var(--color-secondary)]"
                      )}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={generateAllFormats}
                onChange={(e) => {
                  setGenerateAllFormats(e.target.checked);
                  setPlan(null);
                }}
              />
              Generate all 4 ratios per style
            </label>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">4. Output scope & quality</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-xs">Scope</Label>
              <select
                value={scope}
                onChange={(e) => {
                  setScope(e.target.value as OutputScope);
                  setPlan(null);
                }}
                className="mt-1.5 flex h-9 w-full rounded-md border border-[var(--color-border)] bg-transparent px-3 text-sm"
              >
                {SCOPES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs">Quality priority</Label>
              <select
                value={quality}
                onChange={(e) => setQuality(e.target.value as QualityPriority)}
                className="mt-1.5 flex h-9 w-full rounded-md border border-[var(--color-border)] bg-transparent px-3 text-sm"
              >
                {QUALITIES.map((q) => (
                  <option key={q.value} value={q.value}>
                    {q.label}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-[10px] text-[var(--color-muted-foreground)]">
                Hint passed to the provider router. Today only GPT Image 2 is wired up; new adapters slot in without UI change.
              </p>
            </div>
            <div>
              <Label className="text-xs">Notes (optional)</Label>
              <Textarea
                rows={3}
                value={intentNotes}
                onChange={(e) => setIntentNotes(e.target.value)}
                placeholder="e.g. Keep the gold cap visible. Logo always faces the camera."
                maxLength={600}
                className="mt-1.5"
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-2">
          <Button variant="outline" onClick={onPlan} disabled={planning}>
            {planning ? (
              <>
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> Planning…
              </>
            ) : (
              "Preview plan"
            )}
          </Button>
          <Button onClick={onRun} disabled={running || !plan}>
            {running ? (
              <>
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> Generating…
              </>
            ) : (
              "Generate all"
            )}
          </Button>
        </div>

        {plan && (
          <Card>
            <CardContent className="space-y-2 p-4 text-xs">
              <div className="text-sm font-medium">Plan preview</div>
              <div className="text-[var(--color-muted-foreground)]">
                {plan.styles.length} style(s) × {plan.ratios.length} ratio(s) ={" "}
                <span className="font-medium text-[var(--color-foreground)]">
                  ~{plan.estimatedCallCount} images
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {plan.outputs.slice(0, 12).map((o) => (
                  <Badge key={o.id} variant="outline">
                    {o.styleLabel} · {o.ratio}
                  </Badge>
                ))}
                {plan.outputs.length > 12 && (
                  <Badge variant="outline">+{plan.outputs.length - 12} more</Badge>
                )}
              </div>
              {plan.notes.length > 0 && (
                <ul className="mt-2 list-inside list-disc text-[10px] text-[var(--color-muted-foreground)]">
                  {plan.notes.map((n, i) => (
                    <li key={i}>{n}</li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Right column: results grouped by style ------------------------ */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-medium">Reproductions</h2>
          <span className="text-xs text-[var(--color-muted-foreground)]">
            {allOutputs.length} output(s)
          </span>
        </div>
        <Separator className="mb-4" />
        {grouped.size === 0 ? (
          <div className="rounded-lg border border-dashed border-[var(--color-border)] py-16 text-center">
            <p className="text-sm text-[var(--color-muted-foreground)]">
              No outputs yet. Pick a product, choose styles + ratios, hit Generate.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {[...grouped.entries()].map(([style, outs]) => (
              <div key={style}>
                <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                  <Camera className="h-3.5 w-3.5" />
                  {style.replace(/_/g, " ")}
                  <span className="text-xs text-[var(--color-muted-foreground)]">
                    · {outs.length} outputs
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-6">
                  {outs.map((o) => (
                    <a
                      key={o.id}
                      href={`/api/download?id=${o.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="group relative aspect-square overflow-hidden rounded-md border border-[var(--color-border)] bg-[var(--color-secondary)]"
                      title={`${o.requestRatio ?? ""} ${o.requestPlatform ?? ""}`}
                    >
                      <SignedClientImage path={o.storage_path} />
                      <div className="absolute bottom-1 left-1 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] text-white">
                        {o.requestRatio ?? ""}
                      </div>
                      <div className="absolute right-1 top-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <div className="rounded-full bg-black/70 p-1">
                          <Download className="h-3 w-3 text-white" />
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
