"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createProjectAction, type ActionResult } from "@/lib/actions/projects";
import { cn } from "@/lib/utils";

interface Option {
  id: string;
  name: string;
}

type SubjectMode = "product_only" | "product_with_model";
type StyleMode = "studio" | "lifestyle" | "ugc" | "hybrid";
type OutputScope =
  | "single_image"
  | "few_variations"
  | "multi_format_pack"
  | "multi_concept_pack"
  | "full_campaign_pack";
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

const STYLE_OPTIONS: { value: StyleMode; title: string; body: string }[] = [
  { value: "studio", title: "Studio", body: "Polished commercial product photography." },
  { value: "lifestyle", title: "Lifestyle", body: "Real-world setting, slightly polished." },
  { value: "ugc", title: "UGC / Influencer", body: "Authentic creator-style content." },
  { value: "hybrid", title: "Hybrid", body: "Branded but believable, social-native." },
];

const SCOPE_OPTIONS: { value: OutputScope; title: string; body: string }[] = [
  { value: "single_image", title: "Single image", body: "One generation, a few outputs." },
  { value: "few_variations", title: "Few variations", body: "2–4 related variants." },
  {
    value: "multi_format_pack",
    title: "Multi-format pack",
    body: "One concept, multiple ratios for different platforms.",
  },
  {
    value: "multi_concept_pack",
    title: "Multi-concept pack",
    body: "Multiple scene ideas for the same product.",
  },
  {
    value: "full_campaign_pack",
    title: "Full campaign pack",
    body: "Concepts × scenes × ratios. Heaviest.",
  },
];

const PLATFORM_OPTIONS: { value: PlatformTarget; label: string }[] = [
  { value: "instagram_feed", label: "Instagram feed" },
  { value: "instagram_story", label: "Instagram story" },
  { value: "tiktok", label: "TikTok" },
  { value: "meta_ads", label: "Meta ads" },
  { value: "product_page", label: "Product page" },
  { value: "marketplace_listing", label: "Marketplace listing" },
  { value: "website_banner", label: "Website banner" },
  { value: "landing_page", label: "Landing page" },
  { value: "email_banner", label: "Email banner" },
  { value: "other", label: "Other / custom" },
];

type CreationMode = "product_reproduction" | "ugc_model_product";

export function NewProjectForm({
  models,
  products,
  initialMode = "ugc_model_product",
}: {
  models: Option[];
  products: Option[];
  initialMode?: CreationMode;
}) {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(
    createProjectAction,
    null
  );

  const [creationMode, setCreationMode] = useState<CreationMode>(initialMode);
  // When the user is in product_reproduction mode we lock subject_mode to
  // product_only so the back-end persists a consistent shape.
  const [subjectMode, setSubjectMode] = useState<SubjectMode>(
    initialMode === "product_reproduction" ? "product_only" : "product_with_model"
  );
  const [styleMode, setStyleMode] = useState<StyleMode>(
    initialMode === "product_reproduction" ? "studio" : "ugc"
  );
  const [outputScope, setOutputScope] = useState<OutputScope>("single_image");
  const [platforms, setPlatforms] = useState<Set<PlatformTarget>>(new Set());

  function onChangeCreationMode(m: CreationMode) {
    setCreationMode(m);
    if (m === "product_reproduction") {
      setSubjectMode("product_only");
      setStyleMode("studio");
    } else {
      setSubjectMode("product_with_model");
      setStyleMode("ugc");
    }
  }

  function togglePlatform(p: PlatformTarget) {
    setPlatforms((prev) => {
      const next = new Set(prev);
      if (next.has(p)) next.delete(p);
      else next.add(p);
      return next;
    });
  }

  return (
    <form action={formAction} className="space-y-8">
      <input type="hidden" name="creation_mode" value={creationMode} />
      <input type="hidden" name="subject_mode" value={subjectMode} />
      <input type="hidden" name="style_mode" value={styleMode} />
      <input type="hidden" name="output_scope" value={outputScope} />
      {[...platforms].map((p) => (
        <input key={p} type="hidden" name="selected_platforms" value={p} />
      ))}

      <Section title="Creation mode">
        <CardGroup
          options={[
            {
              value: "ugc_model_product",
              title: "UGC with model + product",
              body: "Realistic influencer-style content combining a model and a product.",
            },
            {
              value: "product_reproduction",
              title: "Recreate product photos",
              body: "Reproduce a product across styles, ratios, and platforms — no model.",
            },
          ]}
          value={creationMode}
          onChange={(v) => onChangeCreationMode(v as CreationMode)}
        />
      </Section>

      {/* --- 1. Title + description ----------------------------------- */}
      <Section title="Project details">
        <div className="space-y-2">
          <Label htmlFor="title">Project title</Label>
          <Input id="title" name="title" required maxLength={80} placeholder="e.g. Spring serum launch" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="description">Description (optional)</Label>
          <Textarea
            id="description"
            name="description"
            maxLength={400}
            rows={3}
            placeholder="What's this shoot for? Any constraints?"
          />
        </div>
      </Section>

      {/* --- 2. Subject mode ----------------------------------------- */}
      <Section title="What do you want to create?">
        <CardGroup
          options={[
            {
              value: "product_with_model",
              title: "Product with model",
              body: "Real human model holding or wearing the product.",
            },
            {
              value: "product_only",
              title: "Product only",
              body: "No model. Just the product in a scene or studio.",
            },
          ]}
          value={subjectMode}
          onChange={(v) => setSubjectMode(v as SubjectMode)}
        />
      </Section>

      {/* --- 3. Style mode ------------------------------------------- */}
      <Section title="What style?">
        <CardGroup
          options={STYLE_OPTIONS.map((o) => ({ value: o.value, title: o.title, body: o.body }))}
          value={styleMode}
          onChange={(v) => setStyleMode(v as StyleMode)}
        />
      </Section>

      {/* --- 4. Output scope ----------------------------------------- */}
      <Section title="How much content do you need?">
        <CardGroup
          options={SCOPE_OPTIONS.map((o) => ({ value: o.value, title: o.title, body: o.body }))}
          value={outputScope}
          onChange={(v) => setOutputScope(v as OutputScope)}
          columns={5}
        />
      </Section>

      {/* --- 5. Platforms -------------------------------------------- */}
      <Section title="Where will you use it?">
        <div className="flex flex-wrap gap-2">
          {PLATFORM_OPTIONS.map((p) => {
            const active = platforms.has(p.value);
            return (
              <button
                key={p.value}
                type="button"
                onClick={() => togglePlatform(p.value)}
                className={cn(
                  "rounded-full border px-3 py-1 text-sm transition-colors",
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
        <p className="mt-2 text-xs text-[var(--color-muted-foreground)]">
          We use this to pick aspect ratios for pack modes. Single/few generations ignore it.
        </p>
      </Section>

      {/* --- 6. Selection ------------------------------------------- */}
      <Section title="Pick assets (optional now, required later)">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Model {subjectMode === "product_only" && "(skipped: product-only)"}</Label>
            <select
              name="selected_model_id"
              defaultValue=""
              disabled={subjectMode === "product_only"}
              className="flex h-9 w-full rounded-md border border-[var(--color-border)] bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-ring)] disabled:opacity-50"
            >
              <option value="">Choose later</option>
              {models.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label>Product</Label>
            <select
              name="selected_product_id"
              defaultValue=""
              className="flex h-9 w-full rounded-md border border-[var(--color-border)] bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-ring)]"
            >
              <option value="">Choose later</option>
              {products.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Section>

      <Section title="Target channel">
        <Select name="target_channel" defaultValue="general">
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="general">General / multi-channel</SelectItem>
            <SelectItem value="instagram">Instagram</SelectItem>
            <SelectItem value="tiktok">TikTok</SelectItem>
            <SelectItem value="amazon">Amazon</SelectItem>
            <SelectItem value="shopify">Shopify / DTC</SelectItem>
            <SelectItem value="youtube">YouTube</SelectItem>
          </SelectContent>
        </Select>
      </Section>

      {state?.message && (
        <div className="text-sm text-[var(--color-destructive)]">{state.message}</div>
      )}
      <Button type="submit" disabled={pending} size="lg">
        {pending ? "Creating..." : "Create project"}
      </Button>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Small presentational helpers
// ---------------------------------------------------------------------------

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <div className="text-sm font-medium">{title}</div>
      {children}
    </div>
  );
}

function CardGroup({
  options,
  value,
  onChange,
  columns = 2,
}: {
  options: { value: string; title: string; body: string }[];
  value: string;
  onChange: (v: string) => void;
  columns?: 2 | 3 | 4 | 5;
}) {
  const gridCols: Record<typeof columns, string> = {
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-3",
    4: "grid-cols-2 sm:grid-cols-4",
    5: "grid-cols-2 sm:grid-cols-5",
  };
  return (
    <div className={cn("grid gap-3", gridCols[columns])}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={cn(
              "rounded-lg border p-3 text-left text-sm transition-colors",
              active
                ? "border-[var(--color-foreground)] bg-[var(--color-secondary)]/60"
                : "border-[var(--color-border)] hover:bg-[var(--color-secondary)]/40"
            )}
          >
            <div className="font-medium">{o.title}</div>
            <div className="mt-1 text-xs text-[var(--color-muted-foreground)]">{o.body}</div>
          </button>
        );
      })}
    </div>
  );
}
