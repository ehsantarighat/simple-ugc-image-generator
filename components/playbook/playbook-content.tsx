"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  BookOpen,
  Camera,
  CheckCircle2,
  Copy,
  ImageIcon,
  Lightbulb,
  ListTree,
  Sparkles,
  Wand2,
  Wrench,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type {
  ScenarioCategory,
  ScenarioTemplate,
} from "@/lib/services/generation/scenario-templates";

interface Props {
  templates: ScenarioTemplate[];
  groups: Record<ScenarioCategory, ScenarioTemplate[]>;
  categoryLabels: Record<ScenarioCategory, string>;
  categoryBlurbs: Record<ScenarioCategory, string>;
}

type Tab = "recipes" | "references" | "ratios" | "formula" | "troubleshooting";

const TABS: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "recipes", label: "Recipe library", icon: Sparkles },
  { id: "references", label: "Reference guide", icon: ImageIcon },
  { id: "ratios", label: "Aspect ratios", icon: ListTree },
  { id: "formula", label: "Prompt formula", icon: Wand2 },
  { id: "troubleshooting", label: "Troubleshooting", icon: Wrench },
];

export function PlaybookContent({ templates, groups, categoryLabels, categoryBlurbs }: Props) {
  const [tab, setTab] = React.useState<Tab>("recipes");

  return (
    <div>
      {/* Top tab strip */}
      <div className="mb-6 flex flex-wrap gap-1 border-b border-[var(--color-border)] pb-1">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors",
                active
                  ? "bg-[var(--color-secondary)] font-medium"
                  : "text-[var(--color-muted-foreground)] hover:bg-[var(--color-secondary)]/50 hover:text-[var(--color-foreground)]"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "recipes" && (
        <RecipeLibrary
          templates={templates}
          groups={groups}
          categoryLabels={categoryLabels}
          categoryBlurbs={categoryBlurbs}
        />
      )}
      {tab === "references" && <ReferenceGuide />}
      {tab === "ratios" && <AspectRatioGuide />}
      {tab === "formula" && <PromptFormula />}
      {tab === "troubleshooting" && <Troubleshooting />}
    </div>
  );
}

// ============================================================================
// Recipe Library — categorized cards with copyable prompts
// ============================================================================
function RecipeLibrary({
  templates,
  groups,
  categoryLabels,
  categoryBlurbs,
}: Props) {
  const allCategories = Object.keys(groups) as ScenarioCategory[];
  const [activeCat, setActiveCat] = React.useState<ScenarioCategory | "all">(
    "all"
  );

  const visible =
    activeCat === "all" ? templates : groups[activeCat];

  return (
    <div>
      {/* Intro callout */}
      <div className="mb-5 flex items-start gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-secondary)]/30 p-4">
        <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-foreground)]" />
        <div className="text-sm text-[var(--color-muted-foreground)]">
          <p className="font-medium text-[var(--color-foreground)]">
            How to use a recipe
          </p>
          <p className="mt-1">
            Each recipe is a working prompt plus the photography controls that
            best match it. Click <span className="font-medium">Copy prompt</span>{" "}
            to grab the text, then paste it into the{" "}
            <Link href="/studio" className="underline">
              Studio
            </Link>{" "}
            input. Edit any detail you want — recipes are starting points,
            not rules.
          </p>
        </div>
      </div>

      {/* Category filter chips */}
      <div className="mb-5 flex flex-wrap gap-1.5">
        <CatChip
          label={`All · ${templates.length}`}
          active={activeCat === "all"}
          onClick={() => setActiveCat("all")}
        />
        {allCategories.map((cat) => (
          <CatChip
            key={cat}
            label={`${categoryLabels[cat]} · ${groups[cat].length}`}
            active={activeCat === cat}
            onClick={() => setActiveCat(cat)}
          />
        ))}
      </div>

      {/* Category blurb when filtered */}
      {activeCat !== "all" && (
        <p className="mb-5 text-xs text-[var(--color-muted-foreground)]">
          {categoryBlurbs[activeCat]}
        </p>
      )}

      {/* Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {visible.map((t) => (
          <RecipeCard key={t.id} template={t} categoryLabel={categoryLabels[t.category]} />
        ))}
      </div>
    </div>
  );
}

function CatChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1 text-xs transition-colors",
        active
          ? "border-[var(--color-foreground)] bg-[var(--color-foreground)] text-[var(--color-background)]"
          : "border-[var(--color-border)] text-[var(--color-muted-foreground)] hover:border-[var(--color-foreground)] hover:text-[var(--color-foreground)]"
      )}
    >
      {label}
    </button>
  );
}

function RecipeCard({
  template,
  categoryLabel,
}: {
  template: ScenarioTemplate;
  categoryLabel: string;
}) {
  const [copied, setCopied] = React.useState(false);
  const c = template.recommendedControls;
  const subjectMode = template.subjectMode ?? "product_with_model";

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(template.scenePrompt);
      setCopied(true);
      toast.success("Prompt copied to clipboard");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error("Could not copy — your browser blocked clipboard access.");
    }
  }

  // Pass the prompt via querystring so Studio can prefill it. Studio reads
  // ?prompt= on load (see studio-input.tsx).
  const studioHref = `/studio?prompt=${encodeURIComponent(template.scenePrompt)}`;

  return (
    <Card className="flex h-full flex-col">
      <CardContent className="flex h-full flex-col gap-3 pt-5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="text-sm font-semibold">{template.title}</div>
            <div className="mt-0.5 text-[11px] uppercase tracking-wider text-[var(--color-muted-foreground)]">
              {categoryLabel}
              {subjectMode === "product_only" && " · No model"}
            </div>
          </div>
        </div>

        <p className="text-xs text-[var(--color-muted-foreground)]">
          {template.summary}
        </p>

        {/* The actual prompt — collapsed by default, expand inline */}
        <details className="group rounded-md border border-[var(--color-border)] bg-[var(--color-secondary)]/40 text-xs">
          <summary className="cursor-pointer list-none px-3 py-2 font-medium text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]">
            <span className="inline-flex items-center gap-1.5">
              <Lightbulb className="h-3 w-3" />
              View prompt
              <span className="ml-1 text-[10px] opacity-60 group-open:hidden">
                ({template.scenePrompt.length} chars)
              </span>
            </span>
          </summary>
          <div className="border-t border-[var(--color-border)] px-3 py-2 leading-relaxed text-[var(--color-foreground)]">
            {template.scenePrompt}
          </div>
        </details>

        {/* Controls chips */}
        <div className="flex flex-wrap gap-1">
          <Badge variant="outline" className="text-[10px]">
            {c.outputAspectRatio}
          </Badge>
          <Badge variant="outline" className="text-[10px]">
            {c.shotType.replace(/_/g, " ")}
          </Badge>
          <Badge variant="outline" className="text-[10px]">
            {c.lighting.replace(/_/g, " ")}
          </Badge>
          <Badge variant="outline" className="text-[10px]">
            {c.lensType.replace(/_/g, " ")}
          </Badge>
        </div>

        {/* Tags */}
        {template.tags && template.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 text-[10px] text-[var(--color-muted-foreground)]">
            {template.tags.map((tag) => (
              <span key={tag}>#{tag}</span>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="mt-auto flex gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={handleCopy}
            title="Copy this prompt to your clipboard"
          >
            {copied ? (
              <>
                <CheckCircle2 className="mr-1 h-3 w-3" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="mr-1 h-3 w-3" />
                Copy prompt
              </>
            )}
          </Button>
          <Button asChild size="sm" className="flex-1">
            <Link href={studioHref}>
              <Sparkles className="mr-1 h-3 w-3" />
              Open in Studio
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Reference image guide
// ============================================================================
function ReferenceGuide() {
  return (
    <div className="space-y-6">
      <GuideHeader
        icon={ImageIcon}
        title="What makes a great reference image?"
        subtitle="The single biggest factor in output quality — better than any prompt."
      />

      <div className="grid gap-5 md:grid-cols-2">
        <GuideSection
          title="Product references"
          dos={[
            "Clear plain background (white, light gray, or one neutral tone)",
            "Sharp focus, even lighting, no harsh shadows over the product",
            "2–4 angles for 3D items — front, three-quarter, back",
            "Crop tight to the product — minimal background",
            "Label and logo clearly readable",
          ]}
          donts={[
            "Don't include other products in the frame",
            "Avoid heavy lifestyle backgrounds — they leak into outputs",
            "Avoid blurry, low-resolution, or watermarked images",
            "Don't use rendered/CGI mockups — they look fake in outputs",
          ]}
        />
        <GuideSection
          title="Model references"
          dos={[
            "3–6 photos showing the face clearly",
            "Varied angles: front, three-quarter, profile",
            "Neutral expressions + 1–2 smiling shots",
            "Plain clothing if possible — outfit doesn't lock in",
            "Good even lighting — daylight is ideal",
          ]}
          donts={[
            "Don't use group photos — only the target model",
            "Avoid heavy filters, harsh studio strobes, or extreme makeup",
            "Avoid sunglasses, hats, or hair covering the face",
            "Don't mix photos from very different ages — pick one era",
          ]}
        />
      </div>

      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-secondary)]/30 p-4 text-sm text-[var(--color-muted-foreground)]">
        <p className="font-medium text-[var(--color-foreground)]">
          Pro tip — file size and compression
        </p>
        <p className="mt-1">
          Aim for 1–4 MB per reference. Anything under 200 KB has likely been
          compressed to the point where the model loses face/product detail.
          Anything over 10 MB will be downscaled by the pipeline anyway —
          don&apos;t waste upload time.
        </p>
      </div>
    </div>
  );
}

function GuideSection({
  title,
  dos,
  donts,
}: {
  title: string;
  dos: string[];
  donts: string[];
}) {
  return (
    <Card>
      <CardContent className="pt-5">
        <div className="mb-3 text-sm font-semibold">{title}</div>
        <div className="space-y-3 text-sm">
          <div>
            <div className="mb-1 text-xs font-medium uppercase tracking-wider text-emerald-600">
              Do
            </div>
            <ul className="space-y-1 text-xs text-[var(--color-foreground)]">
              {dos.map((d) => (
                <li key={d} className="flex gap-2">
                  <span className="text-emerald-600">✓</span>
                  <span>{d}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="mb-1 text-xs font-medium uppercase tracking-wider text-[var(--color-destructive)]">
              Don&apos;t
            </div>
            <ul className="space-y-1 text-xs text-[var(--color-foreground)]">
              {donts.map((d) => (
                <li key={d} className="flex gap-2">
                  <span className="text-[var(--color-destructive)]">✕</span>
                  <span>{d}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Aspect ratio cheat sheet
// ============================================================================
const RATIOS: {
  ratio: string;
  proportions: [number, number];
  uses: string[];
  notes: string;
}[] = [
  {
    ratio: "1:1",
    proportions: [80, 80],
    uses: ["Instagram feed", "Facebook", "Ecommerce thumbnails"],
    notes: "Safe everywhere — the universal default.",
  },
  {
    ratio: "4:5",
    proportions: [64, 80],
    uses: ["Instagram portrait", "Pinterest"],
    notes:
      "Maximum vertical real estate on Instagram feed without being cropped. Great for product-with-model.",
  },
  {
    ratio: "9:16",
    proportions: [45, 80],
    uses: ["Instagram Reels", "TikTok", "YouTube Shorts", "Stories"],
    notes:
      "Tall vertical — model fills the frame. Best for UGC, selfies, GRWM.",
  },
  {
    ratio: "16:9",
    proportions: [120, 67.5],
    uses: ["YouTube thumbnails", "Web hero images", "Landing pages"],
    notes:
      "Cinematic widescreen. Strong for editorial product shots and brand campaigns.",
  },
  {
    ratio: "4:3",
    proportions: [100, 75],
    uses: ["Pinterest secondary", "Some marketplace listings"],
    notes:
      "Classic photo proportions. Slight portrait feel, less aggressive than 4:5.",
  },
];

function AspectRatioGuide() {
  return (
    <div className="space-y-5">
      <GuideHeader
        icon={ListTree}
        title="Which aspect ratio for which platform?"
        subtitle="Pick the ratio in Studio that matches where the image will live."
      />

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {RATIOS.map((r) => (
          <Card key={r.ratio}>
            <CardContent className="pt-5">
              <div className="flex items-start justify-between gap-3">
                <div className="text-lg font-semibold">{r.ratio}</div>
                <div
                  className="flex items-center justify-center rounded border border-[var(--color-border)] bg-[var(--color-secondary)]/50"
                  style={{
                    width: r.proportions[0],
                    height: r.proportions[1],
                  }}
                >
                  <Camera className="h-3 w-3 text-[var(--color-muted-foreground)]" />
                </div>
              </div>
              <div className="mt-3 text-[11px] uppercase tracking-wider text-[var(--color-muted-foreground)]">
                Best for
              </div>
              <ul className="mt-1 space-y-0.5 text-xs">
                {r.uses.map((u) => (
                  <li key={u}>• {u}</li>
                ))}
              </ul>
              <p className="mt-3 text-[11px] text-[var(--color-muted-foreground)]">
                {r.notes}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Prompt formula
// ============================================================================
function PromptFormula() {
  return (
    <div className="space-y-6">
      <GuideHeader
        icon={Wand2}
        title="The 4-part prompt formula"
        subtitle="The structure every great prompt follows. Mix and match parts to write your own."
      />

      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-secondary)]/30 p-5 font-mono text-sm">
        <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-emerald-700 dark:text-emerald-300">
          [LOCATION]
        </span>{" "}
        +{" "}
        <span className="rounded bg-blue-500/20 px-1.5 py-0.5 text-blue-700 dark:text-blue-300">
          [MODEL ACTION]
        </span>{" "}
        +{" "}
        <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-amber-700 dark:text-amber-300">
          [PRODUCT INTERACTION]
        </span>{" "}
        +{" "}
        <span className="rounded bg-purple-500/20 px-1.5 py-0.5 text-purple-700 dark:text-purple-300">
          [LIGHT / MOOD]
        </span>
      </div>

      <div className="grid gap-3">
        <FormulaPart
          color="emerald"
          label="Location"
          description="Where the scene takes place. Specific beats generic."
          examples={[
            "bright apartment bathroom",
            "modern café by a large window",
            "outdoor park at golden hour",
            "minimal home office with a side window",
          ]}
        />
        <FormulaPart
          color="blue"
          label="Model action"
          description="What the model is doing. Verbs that imply a moment work best."
          examples={[
            "holding the product near her face",
            "seated at a table, mid-conversation",
            "walking on a sidewalk, glancing off-camera",
            "applying the product to her cheek",
          ]}
        />
        <FormulaPart
          color="amber"
          label="Product interaction"
          description="The relationship between model and product. The fix for collage outputs."
          examples={[
            "wearing the product as her main outfit",
            "showing the product to camera",
            "applying the product to her hand",
            "the product on the table in clear view",
          ]}
        />
        <FormulaPart
          color="purple"
          label="Light / mood"
          description="Atmospheric framing. The difference between flat and great."
          examples={[
            "soft daylight from the side, calm mood",
            "golden hour, warm and editorial",
            "studio softbox, premium and minimal",
            "warm indoor bulbs, cozy and slow",
          ]}
        />
      </div>

      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-secondary)]/30 p-5">
        <div className="mb-2 text-sm font-medium">Worked example</div>
        <p className="font-mono text-xs leading-relaxed">
          <span className="text-emerald-700 dark:text-emerald-300">
            A natural smartphone mirror selfie in a softly-lit bedroom
          </span>{" "}
          <span className="text-blue-700 dark:text-blue-300">
            The model angles her phone toward a full-length mirror, glancing at
            the camera
          </span>
          .{" "}
          <span className="text-amber-700 dark:text-amber-300">
            She is wearing the product as her main outfit
          </span>
          .{" "}
          <span className="text-purple-700 dark:text-purple-300">
            Warm indoor light, slight grain, casual creator energy
          </span>
          .
        </p>
      </div>
    </div>
  );
}

function FormulaPart({
  color,
  label,
  description,
  examples,
}: {
  color: "emerald" | "blue" | "amber" | "purple";
  label: string;
  description: string;
  examples: string[];
}) {
  const dotClass =
    color === "emerald"
      ? "bg-emerald-500"
      : color === "blue"
        ? "bg-blue-500"
        : color === "amber"
          ? "bg-amber-500"
          : "bg-purple-500";
  return (
    <Card>
      <CardContent className="pt-5">
        <div className="mb-2 flex items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-full ${dotClass}`} />
          <span className="text-sm font-semibold">{label}</span>
        </div>
        <p className="text-xs text-[var(--color-muted-foreground)]">
          {description}
        </p>
        <ul className="mt-3 space-y-1 text-xs">
          {examples.map((ex) => (
            <li key={ex} className="font-mono text-[var(--color-foreground)]">
              · {ex}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Troubleshooting
// ============================================================================
const ISSUES: { problem: string; fix: string }[] = [
  {
    problem: "Output is a collage / grid / panel of the input images",
    fix: "Drop the reference count to 3 or fewer. Use the wardrobe-swap or product-in-hand recipes in the library, which include explicit anti-collage language.",
  },
  {
    problem: "Model is wearing her ORIGINAL outfit, not the product",
    fix: "The product has to be detected as wearable. Add a clothing keyword to the product name or description (e.g. 'blouse', 'shirt'). Use an apparel recipe.",
  },
  {
    problem: "Model's face doesn't look like her reference",
    fix: "Upload 3+ varied angles of the model's face. Avoid filtered photos. Switch quality to 'premium' for the strongest identity preservation.",
  },
  {
    problem: "Product looks distorted or has wrong logos",
    fix: "Upload sharper product references with clearly readable logo + label. Use the 'in-hand demo' or 'packshot' recipe with a tight close-up framing.",
  },
  {
    problem: "Image looks fake / CGI / over-smoothed",
    fix: "Switch to 'natural_influencer' authenticity in the recipe controls. Use lighting presets like 'soft_window_light' or 'warm_indoor', not 'studio_softbox'.",
  },
  {
    problem: "Generation timed out",
    fix: "GPT Image 2 occasionally hits 3+ minutes. Re-submit, or pick a different quality tier — fal-routed models return in 15–30s.",
  },
  {
    problem: "Wrong aspect ratio in output",
    fix: "Check the recipe's outputAspectRatio control matches your platform. See the Aspect ratios tab for guidance.",
  },
];

function Troubleshooting() {
  return (
    <div className="space-y-4">
      <GuideHeader
        icon={Wrench}
        title="Common issues — and the 2-line fix"
        subtitle="When a generation doesn't look right, scan this list before re-running."
      />

      <div className="space-y-2">
        {ISSUES.map((issue) => (
          <details
            key={issue.problem}
            className="group rounded-lg border border-[var(--color-border)] bg-[var(--color-secondary)]/30 px-4 py-3 transition-colors hover:bg-[var(--color-secondary)]/50"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
              <span className="text-sm font-medium">{issue.problem}</span>
              <span className="text-xs text-[var(--color-muted-foreground)] group-open:hidden">
                Show fix
              </span>
            </summary>
            <p className="mt-2 border-t border-[var(--color-border)] pt-2 text-sm text-[var(--color-muted-foreground)]">
              {issue.fix}
            </p>
          </details>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Shared
// ============================================================================
function GuideHeader({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="mb-2">
      <div className="flex items-center gap-2 text-base font-semibold">
        <Icon className="h-4 w-4" />
        {title}
      </div>
      <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
        {subtitle}
      </p>
    </div>
  );
}
