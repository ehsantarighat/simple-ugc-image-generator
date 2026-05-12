"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Download, Layers } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { SignedClientImage } from "@/components/generation/signed-client-image";
import { cn } from "@/lib/utils";

type SubjectMode = "product_only" | "product_with_model";
type StyleMode = "studio" | "lifestyle" | "ugc" | "hybrid";
type OutputScope = "multi_format_pack" | "multi_concept_pack" | "full_campaign_pack";
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

interface Option {
  id: string;
  name: string;
}

interface PackRow {
  id: string;
  title: string;
  pack_type: "multi_format" | "multi_concept" | "campaign";
  status: "draft" | "planning" | "generating" | "completed" | "failed";
  requested_ratios_json: string[];
  selected_platforms_json: string[];
  created_at: string;
  concepts: { id: string; title: string; status: string }[];
  outputs: {
    id: string;
    role: string;
    target_aspect_ratio: string | null;
    target_platform: string | null;
    image: { id: string; storage_path: string } | { id: string; storage_path: string }[] | null;
  }[];
}

interface Plan {
  shotPlan: {
    concepts: { id: string; title: string; sceneType: string; scenePrompt: string }[];
  };
  ratios: string[];
  ratioPlatformGroups: { ratio: string; platforms: string[] }[];
  estimatedOutputs: number;
  packType: "multi_format" | "multi_concept" | "campaign";
}

const PLATFORM_LABELS: Record<PlatformTarget, string> = {
  instagram_feed: "Instagram feed",
  instagram_story: "Instagram story",
  tiktok: "TikTok",
  meta_ads: "Meta ads",
  product_page: "Product page",
  marketplace_listing: "Marketplace",
  website_banner: "Website banner",
  landing_page: "Landing page",
  email_banner: "Email banner",
  other: "Other",
};

const PLATFORM_OPTIONS: PlatformTarget[] = Object.keys(PLATFORM_LABELS) as PlatformTarget[];

export function PackPanel(props: {
  projectId: string;
  subjectMode: SubjectMode;
  styleMode: StyleMode;
  outputScope: OutputScope;
  initialPlatforms: string[];
  modelId: string | null;
  productId: string | null;
  models: Option[];
  products: Option[];
  packs: PackRow[];
}) {
  const router = useRouter();
  const [platforms, setPlatforms] = React.useState<Set<PlatformTarget>>(
    () => new Set(props.initialPlatforms as PlatformTarget[])
  );
  const [concept, setConcept] = React.useState("");
  const [plan, setPlan] = React.useState<Plan | null>(null);
  const [planning, setPlanning] = React.useState(false);
  const [running, setRunning] = React.useState(false);
  const [modelId, setModelId] = React.useState<string>(props.modelId ?? "");
  const [productId, setProductId] = React.useState<string>(props.productId ?? "");
  const isProductOnly = props.subjectMode === "product_only";

  function togglePlatform(p: PlatformTarget) {
    setPlatforms((prev) => {
      const next = new Set(prev);
      if (next.has(p)) next.delete(p);
      else next.add(p);
      return next;
    });
    setPlan(null);
  }

  async function onPlan() {
    if (platforms.size === 0) return toast.error("Pick at least one platform.");
    if (concept.trim().length < 8) return toast.error("Describe the pack concept.");
    setPlanning(true);
    try {
      const res = await fetch("/api/pack/plan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          projectId: props.projectId,
          scope: props.outputScope,
          subjectMode: props.subjectMode,
          styleMode: props.styleMode,
          conceptDescription: concept.trim(),
          selectedPlatforms: [...platforms],
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        toast.error(body.error ?? "Plan failed");
        return;
      }
      setPlan(body as Plan);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Plan failed");
    } finally {
      setPlanning(false);
    }
  }

  async function onRun() {
    if (!plan) return toast.error("Generate the plan first.");
    if (!productId) return toast.error("Pick a product.");
    if (!isProductOnly && !modelId) return toast.error("Pick a model.");
    setRunning(true);
    try {
      const res = await fetch("/api/pack/run", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          projectId: props.projectId,
          scope: props.outputScope,
          subjectMode: props.subjectMode,
          styleMode: props.styleMode,
          conceptDescription: concept.trim(),
          selectedPlatforms: [...platforms],
          modelId: isProductOnly ? null : modelId,
          productId,
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        toast.error(body.error ?? "Pack run failed");
      } else {
        toast.success("Pack generated.");
        router.refresh();
        setPlan(null);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Pack run failed");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Layers className="h-4 w-4" />
            Content pack — {props.outputScope.replace(/_/g, " ")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Asset pickers */}
          <div className="grid gap-3 sm:grid-cols-2">
            {!isProductOnly && (
              <div className="space-y-1.5">
                <Label className="text-xs">Model</Label>
                <select
                  value={modelId}
                  onChange={(e) => setModelId(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-[var(--color-border)] bg-transparent px-3 text-sm"
                >
                  <option value="">Pick a model…</option>
                  {props.models.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-xs">Product</Label>
              <select
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                className="flex h-9 w-full rounded-md border border-[var(--color-border)] bg-transparent px-3 text-sm"
              >
                <option value="">Pick a product…</option>
                {props.products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Concept prompt */}
          <div className="space-y-1.5">
            <Label className="text-xs">Pack concept / brief</Label>
            <Textarea
              rows={3}
              value={concept}
              onChange={(e) => {
                setConcept(e.target.value);
                setPlan(null);
              }}
              maxLength={2000}
              placeholder="e.g. Launch pack for the new vitamin C serum: bright bathroom routine + café morning + minimal studio shelf."
            />
          </div>

          {/* Platforms */}
          <div className="space-y-1.5">
            <Label className="text-xs">Target platforms</Label>
            <div className="flex flex-wrap gap-1.5">
              {PLATFORM_OPTIONS.map((p) => {
                const active = platforms.has(p);
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => togglePlatform(p)}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs transition-colors",
                      active
                        ? "border-[var(--color-foreground)] bg-[var(--color-foreground)] text-[var(--color-background)]"
                        : "border-[var(--color-border)] hover:bg-[var(--color-secondary)]"
                    )}
                  >
                    {PLATFORM_LABELS[p]}
                  </button>
                );
              })}
            </div>
          </div>

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
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> Generating pack…
                </>
              ) : (
                "Generate pack"
              )}
            </Button>
          </div>

          {/* Plan preview */}
          {plan && (
            <>
              <Separator />
              <div className="space-y-3 text-sm">
                <div>
                  <div className="font-medium">Plan preview</div>
                  <div className="mt-1 text-xs text-[var(--color-muted-foreground)]">
                    {plan.shotPlan.concepts.length} concept(s) × {plan.ratios.length} ratio(s) ={" "}
                    <span className="font-medium text-[var(--color-foreground)]">
                      ~{plan.estimatedOutputs} images
                    </span>
                    . Each costs one API call.
                  </div>
                </div>
                <div className="space-y-2">
                  {plan.shotPlan.concepts.map((c) => (
                    <div key={c.id} className="rounded-md border border-[var(--color-border)] p-3">
                      <div className="text-sm font-medium">{c.title}</div>
                      <div className="mt-1 line-clamp-2 text-xs text-[var(--color-muted-foreground)]">
                        {c.scenePrompt}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {plan.ratioPlatformGroups.map((r) => (
                    <Badge key={r.ratio} variant="outline">
                      {r.ratio}
                      {r.platforms.length > 0 && ` · ${r.platforms.length} platform(s)`}
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Existing packs */}
      {props.packs.length > 0 && (
        <div className="space-y-3">
          <div className="text-sm font-medium">Packs</div>
          {props.packs.map((pack) => (
            <PackResultCard key={pack.id} pack={pack} />
          ))}
        </div>
      )}
    </div>
  );
}

function PackResultCard({ pack }: { pack: PackRow }) {
  // Group outputs by concept → then by ratio.
  const conceptTitleById = new Map(pack.concepts.map((c) => [c.id, c.title]));

  return (
    <Card>
      <CardContent className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <div className="text-sm font-medium">{pack.title}</div>
            <div className="mt-1 flex flex-wrap gap-1.5 text-xs text-[var(--color-muted-foreground)]">
              <Badge variant="outline">{pack.pack_type.replace(/_/g, " ")}</Badge>
              {pack.requested_ratios_json.map((r) => (
                <Badge key={r} variant="outline">
                  {r}
                </Badge>
              ))}
              <StatusBadge status={pack.status} />
            </div>
          </div>
          <Button asChild variant="outline" size="sm" disabled={pack.status !== "completed"}>
            <a href={`/api/pack/${pack.id}/export`} target="_blank" rel="noreferrer">
              <Download className="mr-1 h-3.5 w-3.5" /> Download ZIP
            </a>
          </Button>
        </div>

        {pack.outputs.length === 0 ? (
          <p className="text-xs text-[var(--color-muted-foreground)]">
            No outputs yet.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-6">
            {pack.outputs.map((out) => {
              const img = Array.isArray(out.image) ? out.image[0] : out.image;
              if (!img) return null;
              const conceptTitle = conceptTitleById.get(
                // out has content_pack_concept_id but we didn't fetch it on the join; rely on order
                pack.concepts[0]?.id ?? ""
              );
              return (
                <div
                  key={out.id}
                  className="relative aspect-square overflow-hidden rounded-md border border-[var(--color-border)] bg-[var(--color-secondary)]"
                  title={`${out.target_aspect_ratio ?? ""} ${out.role}${conceptTitle ? " · " + conceptTitle : ""}`}
                >
                  <SignedClientImage path={img.storage_path} />
                  <div className="absolute bottom-1 left-1 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] text-white">
                    {out.target_aspect_ratio ?? out.role}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: PackRow["status"] }) {
  if (status === "completed") return <Badge variant="secondary">Done</Badge>;
  if (status === "failed") return <Badge variant="destructive">Failed</Badge>;
  if (status === "generating") return <Badge>Generating…</Badge>;
  return <Badge variant="outline">{status}</Badge>;
}
