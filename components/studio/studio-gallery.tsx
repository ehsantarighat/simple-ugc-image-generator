"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  AlertTriangle,
  Cpu,
  DollarSign,
  Download,
  ExternalLink,
  Loader2,
  RefreshCw,
  X,
} from "lucide-react";
import { SignedClientImage } from "@/components/generation/signed-client-image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Format tenth-cents (1/1000 USD) → human-readable USD. */
function formatCost(tenthCents: number | null | undefined): string {
  if (!tenthCents || tenthCents <= 0) return "free";
  const usd = tenthCents / 1000;
  if (usd < 0.01) return "<$0.01";
  return `$${usd.toFixed(2)}`;
}

export interface StudioImage {
  id: string;
  storage_path: string;
  project_id: string;
  project_title: string | null;
  prompt_used: string | null;
  image_role: string | null;
  metadata_json: Record<string, unknown> | null;
  provider_used: string | null;
  provider_cost_tenth_cents: number | null;
  created_at: string;
}

export interface RecentFailure {
  id: string;
  status: string;
  error_message: string | null;
  generation_mode: string | null;
  created_at: string;
}

interface Props {
  images: StudioImage[];
  recentFailure?: RecentFailure | null;
}

// Studio gallery — renders all of the user's recent generated images in a
// flat grid, grouped by day. Clicking an image opens a lightbox preview
// with download + open-project links so the user never has to leave /studio.
export function StudioGallery({ images, recentFailure = null }: Props) {
  const router = useRouter();
  const [active, setActive] = React.useState<StudioImage | null>(null);
  const [refreshing, startRefresh] = React.useTransition();

  function handleRefresh() {
    startRefresh(() => {
      router.refresh();
      toast.success(
        images.length === 0
          ? "Refreshed — no images for your account yet."
          : `Refreshed — ${images.length} image(s) loaded.`
      );
    });
  }

  // Group by ISO day (YYYY-MM-DD) for a "Today / Yesterday / Older" layout.
  const groups = React.useMemo(() => {
    const map = new Map<string, StudioImage[]>();
    for (const img of images) {
      const day = img.created_at.slice(0, 10);
      if (!map.has(day)) map.set(day, []);
      map.get(day)!.push(img);
    }
    return [...map.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [images]);

  if (images.length === 0) {
    return (
      <div className="mt-12">
        <div className="mb-3 flex items-center justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            title="Re-fetch the gallery"
          >
            {refreshing ? (
              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
            ) : (
              <RefreshCw className="mr-1 h-3 w-3" />
            )}
            {refreshing ? "Refreshing…" : "Refresh"}
          </Button>
        </div>
        <FailureBanner failure={recentFailure} />
        <div className="rounded-2xl border border-dashed border-[var(--color-border)] py-12 text-center text-sm text-[var(--color-muted-foreground)]">
          <p>No generations on disk for your account yet.</p>
          <p className="mt-1 text-xs">
            If you just hit Send and saw a success toast but the gallery is
            empty, click Refresh — the new image might be still propagating.
            You can also check{" "}
            <Link href="/dashboard" className="underline">
              the dashboard
            </Link>{" "}
            or{" "}
            <Link href="/projects" className="underline">
              recent projects
            </Link>
            .
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="mt-12 space-y-6">
        <FailureBanner failure={recentFailure} />
        <div className="flex items-center justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            {refreshing ? (
              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
            ) : (
              <RefreshCw className="mr-1 h-3 w-3" />
            )}
            {refreshing ? "Refreshing…" : "Refresh"}
          </Button>
        </div>
        {groups.map(([day, items]) => (
          <section key={day}>
            <div className="mb-3 flex items-end justify-between">
              <h2 className="text-sm font-medium text-[var(--color-muted-foreground)]">
                {humanizeDay(day)}
                <span className="ml-1.5 text-[var(--color-muted-foreground)]/60">
                  · {items.length}
                </span>
              </h2>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {items.map((img) => (
                <button
                  key={img.id}
                  type="button"
                  onClick={() => setActive(img)}
                  className="group relative aspect-square overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-secondary)] transition-shadow hover:shadow-md"
                  title={img.prompt_used ?? "Open preview"}
                >
                  <SignedClientImage path={img.storage_path} />
                  {/* Cost overlay — bottom-right corner, only when we have a
                      tracked price. Pointer-events-none so it doesn't block
                      the click on the parent button. */}
                  {(img.provider_cost_tenth_cents ?? 0) > 0 && (
                    <span className="pointer-events-none absolute bottom-1.5 right-1.5 inline-flex items-center gap-0.5 rounded-md bg-black/65 px-1.5 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
                      <DollarSign className="h-2.5 w-2.5" />
                      {formatCost(img.provider_cost_tenth_cents).replace("$", "")}
                    </span>
                  )}
                </button>
              ))}
            </div>
            {/* Day-total cost line under each group */}
            <DayTotal items={items} />
          </section>
        ))}
      </div>

      {active && (
        <Lightbox
          image={active}
          onClose={() => {
            setActive(null);
            router.refresh();
          }}
        />
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Lightbox
// ---------------------------------------------------------------------------

function Lightbox({
  image,
  onClose,
}: {
  image: StudioImage;
  onClose: () => void;
}) {
  // Close on ESC, lock body scroll while open.
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  const meta = (image.metadata_json ?? {}) as Record<string, unknown>;
  const ratio = String(meta.target_aspect_ratio ?? meta.size ?? "—");
  const stylePreset = meta.style_preset ? String(meta.style_preset) : null;
  const mode = String(meta.generation_mode ?? meta.creation_mode ?? "—");
  // Prefer the canonical `provider_used` column; fall back to the metadata
  // copy for rows generated before column-level tracking existed.
  const provider = image.provider_used ?? (meta.provider ? String(meta.provider) : null);
  const model = meta.model ? String(meta.model) : null;
  const costStr = formatCost(image.provider_cost_tenth_cents);

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 grid place-items-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className={cn(
          "relative grid max-h-[92vh] w-full max-w-5xl gap-0 overflow-hidden rounded-xl bg-[var(--color-background)] shadow-2xl",
          "md:grid-cols-[1fr_320px]"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Image side */}
        <div className="relative grid min-h-[40vh] place-items-center bg-[var(--color-secondary)]">
          <div className="relative h-full w-full max-h-[92vh]">
            <SignedClientImage
              path={image.storage_path}
              className="!object-contain"
            />
          </div>
        </div>

        {/* Detail side */}
        <aside className="flex flex-col gap-4 overflow-y-auto p-5 md:max-h-[92vh]">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="text-sm font-medium">
                {image.project_title ?? "Untitled"}
              </div>
              <div className="text-xs text-[var(--color-muted-foreground)]">
                {new Date(image.created_at).toLocaleString()}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="grid h-8 w-8 place-items-center rounded-full hover:bg-[var(--color-secondary)]"
              aria-label="Close preview"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5 text-[10px]">
            <Badge variant="outline">{ratio}</Badge>
            {stylePreset && (
              <Badge variant="outline">{stylePreset.replace(/_/g, " ")}</Badge>
            )}
            <Badge variant="outline">{mode.replace(/_/g, " ")}</Badge>
            {image.image_role && (
              <Badge variant="secondary">{image.image_role}</Badge>
            )}
          </div>

          {(provider || model) && (
            <div className="flex items-center gap-1.5 rounded-md bg-[var(--color-secondary)]/60 px-2 py-1.5 text-[11px] text-[var(--color-muted-foreground)]">
              <Cpu className="h-3 w-3 shrink-0" />
              <span>Made by</span>
              <span className="font-medium text-[var(--color-foreground)]">
                {provider ?? model}
              </span>
              {provider && model && provider !== model && (
                <span className="opacity-60">· {model}</span>
              )}
            </div>
          )}

          {(image.provider_cost_tenth_cents ?? 0) > 0 && (
            <div className="flex items-center gap-1.5 rounded-md bg-[var(--color-secondary)]/60 px-2 py-1.5 text-[11px] text-[var(--color-muted-foreground)]">
              <DollarSign className="h-3 w-3 shrink-0" />
              <span>Cost</span>
              <span className="font-medium text-[var(--color-foreground)]">
                {costStr}
              </span>
              <span className="opacity-60">· provider list price</span>
            </div>
          )}

          {image.prompt_used && (
            <details className="text-xs">
              <summary className="cursor-pointer text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]">
                Prompt used
              </summary>
              <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap rounded-md bg-[var(--color-secondary)] p-3 leading-relaxed">
                {image.prompt_used}
              </pre>
            </details>
          )}

          <div className="mt-auto flex flex-col gap-2 border-t border-[var(--color-border)] pt-4">
            <Button asChild>
              <a
                href={`/api/download?id=${image.id}`}
                target="_blank"
                rel="noreferrer"
              >
                <Download className="mr-1 h-3.5 w-3.5" /> Download PNG
              </a>
            </Button>
            <Button asChild variant="outline">
              <Link href={`/projects/${image.project_id}`}>
                <ExternalLink className="mr-1 h-3.5 w-3.5" /> Open project
              </Link>
            </Button>
          </div>
        </aside>
      </div>
    </div>
  );
}

function DayTotal({ items }: { items: StudioImage[] }) {
  const totalTenthCents = items.reduce(
    (sum, i) => sum + (i.provider_cost_tenth_cents ?? 0),
    0
  );
  const tracked = items.filter((i) => (i.provider_cost_tenth_cents ?? 0) > 0).length;
  if (totalTenthCents <= 0) return null;
  return (
    <div className="mt-2 flex items-center justify-end gap-1 text-[11px] text-[var(--color-muted-foreground)]">
      <DollarSign className="h-3 w-3" />
      <span>
        {formatCost(totalTenthCents)} across {tracked} image
        {tracked === 1 ? "" : "s"} today
      </span>
    </div>
  );
}

function FailureBanner({ failure }: { failure: RecentFailure | null }) {
  if (!failure) return null;
  const isStuck = failure.status === "generating";
  const elapsedMin = Math.round(
    (Date.now() - new Date(failure.created_at).getTime()) / 60_000
  );
  return (
    <div className="flex items-start gap-2 rounded-md border border-[var(--color-destructive)]/30 bg-[var(--color-destructive)]/5 p-3 text-xs text-[var(--color-destructive)]">
      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <div className="space-y-0.5">
        <div className="font-medium">
          {isStuck
            ? `Last run is stuck mid-flight (started ${elapsedMin} min ago)`
            : "Last run failed"}
        </div>
        <div className="break-words">
          {failure.error_message ?? "No error message recorded."}
        </div>
        <div className="text-[10px] opacity-70">
          {failure.generation_mode?.replace(/_/g, " ") ?? "unknown mode"} ·{" "}
          {new Date(failure.created_at).toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
}

function humanizeDay(isoDay: string): string {
  const today = new Date();
  const yyyy = today.toISOString().slice(0, 10);
  if (isoDay === yyyy) return "Today";
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (isoDay === yesterday.toISOString().slice(0, 10)) return "Yesterday";
  return new Date(isoDay).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}
