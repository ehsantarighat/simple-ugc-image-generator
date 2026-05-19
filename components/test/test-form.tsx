"use client";

import * as React from "react";
import { toast } from "sonner";
import { ArrowUp, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  ProviderResultCard,
  type ProviderInfo,
  type ResultState,
} from "@/components/test/provider-result-card";

interface Option {
  id: string;
  name: string;
}

interface Props {
  providers: ProviderInfo[];
  products: Option[];
  models: Option[];
}

const DEFAULT_PROMPT =
  "Place this product on a kitchen counter beside a coffee cup, morning light from a window on the left, shot from a high angle, soft natural shadows.";

export function TestForm({ providers, products, models }: Props) {
  const [prompt, setPrompt] = React.useState(DEFAULT_PROMPT);
  const [productId, setProductId] = React.useState<string>(
    products[0]?.id ?? ""
  );
  const [modelId, setModelId] = React.useState<string>("");
  const [aspectRatio, setAspectRatio] = React.useState<"1:1" | "4:5" | "9:16" | "16:9">("1:1");
  const [running, setRunning] = React.useState(false);

  // State per provider id.
  const [results, setResults] = React.useState<Record<string, ResultState>>(
    () => Object.fromEntries(providers.map((p) => [p.id, { status: "idle" } as ResultState]))
  );

  async function runOne(provider: ProviderInfo) {
    setResults((prev) => ({ ...prev, [provider.id]: { status: "running" } }));
    try {
      const res = await fetch("/api/test-provider", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          providerId: provider.id,
          prompt: prompt.trim(),
          productId,
          modelId: modelId || null,
          aspectRatio,
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        setResults((prev) => ({
          ...prev,
          [provider.id]: {
            status: "error",
            error: body.error ?? `HTTP ${res.status}`,
          },
        }));
        return;
      }
      if (body.ok === false) {
        setResults((prev) => ({
          ...prev,
          [provider.id]: {
            status: "error",
            error: body.error ?? "Unknown error",
            durationMs: body.durationMs,
          },
        }));
        return;
      }
      setResults((prev) => ({
        ...prev,
        [provider.id]: {
          status: "ok",
          storagePath: body.storagePath,
          durationMs: body.durationMs,
          providerInfoId: body.providerInfoId,
        },
      }));
    } catch (err) {
      setResults((prev) => ({
        ...prev,
        [provider.id]: {
          status: "error",
          error: err instanceof Error ? err.message : "Network error",
        },
      }));
    }
  }

  async function runAll() {
    if (!productId) return toast.error("Pick a product first.");
    if (prompt.trim().length < 8) return toast.error("Write a scene prompt.");
    setRunning(true);
    // Reset everyone to running so the UI shows spinners immediately.
    setResults(
      Object.fromEntries(
        providers.map((p) => [p.id, { status: "running" } as ResultState])
      )
    );
    // Fire all 5 in parallel — each is its own HTTP request so a slow
    // provider doesn't block fast ones. allSettled so we always run them all.
    await Promise.allSettled(providers.map((p) => runOne(p)));
    setRunning(false);
  }

  return (
    <div className="space-y-6">
      {/* Form */}
      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] p-5 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Product (required)</Label>
            <select
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              className="flex h-9 w-full rounded-md border border-[var(--color-border)] bg-transparent px-3 text-sm"
            >
              <option value="">Pick a product…</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Model (optional — for UGC adapters)</Label>
            <select
              value={modelId}
              onChange={(e) => setModelId(e.target.value)}
              className="flex h-9 w-full rounded-md border border-[var(--color-border)] bg-transparent px-3 text-sm"
            >
              <option value="">None — product-only test</option>
              {models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 space-y-1.5">
          <Label className="text-xs">Same prompt sent to every adapter</Label>
          <Textarea
            rows={3}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            maxLength={2000}
          />
          <p className="text-[10px] text-[var(--color-muted-foreground)]">
            Tip: pick a scene that's clearly different from your product
            reference image. If an adapter is broken and echoes the input,
            you'll see it instantly.
          </p>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Label className="text-xs">Ratio</Label>
            <div className="inline-flex rounded-full border border-[var(--color-border)] p-0.5 text-[11px]">
              {(["1:1", "4:5", "9:16", "16:9"] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setAspectRatio(r)}
                  className={
                    "rounded-full px-2 py-0.5 transition-colors " +
                    (r === aspectRatio
                      ? "bg-[var(--color-foreground)] text-[var(--color-background)]"
                      : "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]")
                  }
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
          <Button onClick={runAll} disabled={running || !productId}>
            {running ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Testing all
                providers…
              </>
            ) : (
              <>
                <ArrowUp className="mr-1.5 h-3.5 w-3.5" /> Test all providers
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Results grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {providers.map((p) => (
          <ProviderResultCard
            key={p.id}
            info={p}
            state={results[p.id] ?? { status: "idle" }}
          />
        ))}
      </div>
    </div>
  );
}
