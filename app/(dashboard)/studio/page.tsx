import { requireUser } from "@/lib/supabase/server";
import { StudioInput } from "@/components/studio/studio-input";
import { StudioGallery, type StudioImage } from "@/components/studio/studio-gallery";
import { SCENARIO_TEMPLATES } from "@/lib/services/generation/scenario-templates";
import type { Scenario } from "@/components/studio/scenario-chips";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function StudioPage() {
  const { supabase, user } = await requireUser();

  const [{ data: models }, { data: products }, { data: imageRows }] =
    await Promise.all([
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
      // Load up to 60 most-recent generations across all projects, joined
      // with the project for the lightbox's title + link.
      supabase
        .from("generated_images")
        .select(
          `id, storage_path, project_id, prompt_used, image_role,
           metadata_json, created_at,
           project:projects(title)`
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(60),
    ]);

  const scenarios: Scenario[] = SCENARIO_TEMPLATES.slice(0, 5).map((t) => ({
    id: t.id,
    title: t.title,
    prompt: t.scenePrompt,
    hint: t.title,
  }));

  const hasModels = (models?.length ?? 0) > 0;
  const hasProducts = (products?.length ?? 0) > 0;

  const images: StudioImage[] = (imageRows ?? []).map((row) => {
    const projectRel = Array.isArray(row.project) ? row.project[0] : row.project;
    return {
      id: row.id as string,
      storage_path: row.storage_path as string,
      project_id: row.project_id as string,
      project_title: projectRel?.title ?? null,
      prompt_used: (row.prompt_used as string) ?? null,
      image_role: (row.image_role as string) ?? null,
      metadata_json:
        typeof row.metadata_json === "object" && row.metadata_json !== null
          ? (row.metadata_json as Record<string, unknown>)
          : null,
      created_at: row.created_at as string,
    };
  });

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col py-12 md:py-16">
      <h1 className="mb-1 text-center text-2xl font-semibold tracking-tight md:text-3xl">
        What can I create for you?
      </h1>
      <p className="mb-8 text-center text-sm text-[var(--color-muted-foreground)]">
        Describe the scene. Attach a product (and a model for UGC). Hit send.
      </p>

      <div className="mx-auto w-full max-w-3xl">
        <StudioInput
          models={models ?? []}
          products={products ?? []}
          scenarios={scenarios}
          initialMode={hasModels ? "ugc_model_product" : "product_reproduction"}
        />
      </div>

      {(!hasProducts || !hasModels) && (
        <div className="mx-auto mt-10 flex max-w-3xl flex-wrap items-center justify-center gap-3 text-xs text-[var(--color-muted-foreground)]">
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

      <StudioGallery images={images} />
    </div>
  );
}
