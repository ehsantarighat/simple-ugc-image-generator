import { requireUser } from "@/lib/supabase/server";
import { StudioInput } from "@/components/studio/studio-input";
import { SCENARIO_TEMPLATES } from "@/lib/services/generation/scenario-templates";
import type { Scenario } from "@/components/studio/scenario-chips";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function StudioPage() {
  const { supabase, user } = await requireUser();

  const [{ data: models }, { data: products }] = await Promise.all([
    supabase
      .from("models")
      .select("id, name")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("products")
      .select("id, name")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  // Surface 5 of our pre-canned scenarios as starter chips. The full
  // template (controls + ratio) gets re-derived server-side from defaults;
  // the chip just seeds the prompt for now.
  const scenarios: Scenario[] = SCENARIO_TEMPLATES.slice(0, 5).map((t) => ({
    id: t.id,
    title: t.title,
    prompt: t.scenePrompt,
    hint: t.title,
  }));

  const hasModels = (models?.length ?? 0) > 0;
  const hasProducts = (products?.length ?? 0) > 0;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col items-center justify-center py-12 md:py-20">
      <h1 className="mb-1 text-center text-2xl font-semibold tracking-tight md:text-3xl">
        What can I create for you?
      </h1>
      <p className="mb-8 text-center text-sm text-[var(--color-muted-foreground)]">
        Describe the scene. Attach a product (and a model for UGC). Hit send.
      </p>

      <div className="w-full">
        <StudioInput
          models={models ?? []}
          products={products ?? []}
          scenarios={scenarios}
          initialMode={hasModels ? "ugc_model_product" : "product_reproduction"}
        />
      </div>

      {/* Empty-library guidance — only shows when the user is missing assets */}
      {(!hasProducts || !hasModels) && (
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3 text-xs text-[var(--color-muted-foreground)]">
          {!hasProducts && (
            <Link
              href="/products/new"
              className="rounded-full border border-dashed border-[var(--color-border)] px-3 py-1 hover:text-[var(--color-foreground)]"
            >
              + Add your first product
            </Link>
          )}
          {!hasModels && (
            <Link
              href="/models/new"
              className="rounded-full border border-dashed border-[var(--color-border)] px-3 py-1 hover:text-[var(--color-foreground)]"
            >
              + Add your first model
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
