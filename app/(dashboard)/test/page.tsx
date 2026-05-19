import { requireUser } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { TestForm } from "@/components/test/test-form";
import type { ProviderInfo } from "@/components/test/provider-result-card";
import Link from "next/link";

export const dynamic = "force-dynamic";

// Compile-time list of every adapter, mirrored from the GET handler in
// /api/test-provider. Kept here (rather than fetched) so the server-rendered
// page can render the grid immediately without a flash.
const PROVIDERS: ProviderInfo[] = [
  // --- Production-active ---------------------------------------------------
  {
    id: "gpt-image-2",
    tier: "premium",
    family: "openai",
    maxReferenceImages: 16,
    notes: "OpenAI native. Production baseline.",
  },
  // --- fal.ai-routed (production-active when FAL_KEY is set) --------------
  {
    id: "fal-flux-kontext-multi",
    tier: "premium",
    family: "flux-via-fal",
    maxReferenceImages: 6,
    notes: "FLUX Pro Kontext (multi-reference) via fal.ai.",
  },
  {
    id: "fal-nano-banana-edit",
    tier: "standard",
    family: "gemini-via-fal",
    maxReferenceImages: 4,
    notes: "Gemini Flash Image (Nano Banana) edit via fal.ai.",
  },
  {
    id: "fal-recraft-v3",
    tier: "premium",
    family: "recraft-via-fal",
    maxReferenceImages: 1,
    notes: "Recraft V3 image-to-image via fal.ai.",
  },
  {
    id: "fal-seedream-v4-edit",
    tier: "premium",
    family: "seedream-via-fal",
    maxReferenceImages: 4,
    notes: "ByteDance Seedream V4 edit via fal.ai.",
  },
  {
    id: "fal-ideogram-v3",
    tier: "premium",
    family: "ideogram-via-fal",
    maxReferenceImages: 1,
    notes: "Ideogram V3 via fal.ai — strong text/logo fidelity.",
  },
  // --- Disabled native adapters (kept for verification testing) -----------
  {
    id: "seedream-4-5",
    tier: "premium",
    family: "seedream-native",
    maxReferenceImages: 10,
    notes: "BytePlus ModelArk native — needs valid model id.",
  },
  {
    id: "recraft-v3",
    tier: "premium",
    family: "recraft-native",
    maxReferenceImages: 1,
    notes: "Recraft native API.",
  },
  {
    id: "qwen-image-edit",
    tier: "standard",
    family: "qwen-native",
    maxReferenceImages: 4,
    notes: "Alibaba Model Studio native.",
  },
  {
    id: "gemini-flash-image",
    tier: "standard",
    family: "gemini-native",
    maxReferenceImages: 6,
    notes: "Google AI Studio native.",
  },
];

export default async function TestPage() {
  const { supabase, user } = await requireUser();
  const [{ data: products }, { data: models }] = await Promise.all([
    supabase
      .from("products")
      .select("id, name")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("models")
      .select("id, name")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  const hasProducts = (products?.length ?? 0) > 0;

  return (
    <div className="mx-auto w-full max-w-7xl py-8">
      <PageHeader
        title="Provider test bench"
        description="Run the same prompt + product against every adapter and compare results side-by-side. Useful for verifying which providers are wired up correctly vs. echoing the input."
      />

      {!hasProducts ? (
        <div className="rounded-lg border border-dashed border-[var(--color-border)] py-10 text-center text-sm">
          You need a product first.{" "}
          <Link href="/products/new" className="underline">
            Upload one
          </Link>
          .
        </div>
      ) : (
        <TestForm
          providers={PROVIDERS}
          products={products ?? []}
          models={models ?? []}
        />
      )}

      <div className="mt-8 text-xs text-[var(--color-muted-foreground)]">
        <p className="mb-1 font-medium">How to read results:</p>
        <ul className="ml-4 list-disc space-y-0.5">
          <li>
            <span className="font-medium text-[var(--color-foreground)]">Success + new image</span>{" "}
            — adapter works.
          </li>
          <li>
            <span className="font-medium text-[var(--color-foreground)]">Success + your product reference</span>{" "}
            — adapter is echoing input. Broken contract.
          </li>
          <li>
            <span className="font-medium text-[var(--color-foreground)]">Error message</span>{" "}
            — read it; the most common ones are missing API key, wrong endpoint, or rate limit.
          </li>
          <li>
            <span className="font-medium text-[var(--color-foreground)]">Timed out after 90s</span>{" "}
            — provider was unreachable or hanging. Worth retrying.
          </li>
        </ul>
      </div>
    </div>
  );
}
