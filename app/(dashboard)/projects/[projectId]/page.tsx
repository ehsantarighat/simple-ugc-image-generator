import { notFound } from "next/navigation";
import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { DeleteOwnerButton } from "@/components/shared/delete-owner-button";
import { deleteProjectAction } from "@/lib/actions/projects";
import { ProjectWorkspace } from "@/components/projects/project-workspace";
import { ProductReproductionWorkspace } from "@/components/projects/product-reproduction-workspace";
import { PackPanel } from "@/components/generation/pack-panel";

export const dynamic = "force-dynamic";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const { supabase, user } = await requireUser();

  const { data: project } = await supabase
    .from("projects")
    .select(
      `id, title, description, target_channel, selected_model_id, selected_product_id,
       creation_mode, quality_priority,
       subject_mode, style_mode, output_scope, selected_platforms_json,
       updated_at, model:models(id, name), product:products(id, name)`
    )
    .eq("id", projectId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!project) notFound();
  const creationMode = (project.creation_mode ?? "ugc_model_product") as
    | "product_reproduction"
    | "ugc_model_product";

  const [{ data: models }, { data: products }, { data: requests }, { data: packs }] =
    await Promise.all([
      supabase.from("models").select("id, name").eq("user_id", user.id),
      supabase.from("products").select("id, name").eq("user_id", user.id),
      supabase
        .from("generation_requests")
        .select(
          `id, status, error_message, raw_scene_prompt, controls_json, created_at,
           generation_mode, generation_stage, style_preset, target_aspect_ratio, target_platform,
           images:generated_images(id, storage_path, is_favorite, parent_image_id, metadata_json, image_role, created_at)`
        )
        .eq("project_id", projectId)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("content_packs")
        .select(
          `id, title, pack_type, status, requested_ratios_json, selected_platforms_json,
           created_at,
           concepts:content_pack_concepts(id, title, status),
           outputs:content_pack_outputs(id, role, target_aspect_ratio, target_platform,
             image:generated_images(id, storage_path))`
        )
        .eq("project_id", projectId)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
    ]);

  const isPackScope =
    project.output_scope === "multi_format_pack" ||
    project.output_scope === "multi_concept_pack" ||
    project.output_scope === "full_campaign_pack";

  return (
    <>
      <PageHeader
        title={project.title}
        description={project.description ?? undefined}
        actions={
          <>
            <Link
              href="/projects"
              className="text-sm text-[var(--color-muted-foreground)] hover:underline"
            >
              ← All projects
            </Link>
            <DeleteOwnerButton
              label="Delete"
              confirmMessage="Delete this project and all its generations? This cannot be undone."
              action={async () => {
                "use server";
                await deleteProjectAction(projectId);
              }}
            />
          </>
        }
      />

      {creationMode === "product_reproduction" ? (
        <ProductReproductionWorkspace
          projectId={project.id}
          initialProductId={project.selected_product_id}
          products={products ?? []}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          requests={(requests ?? []) as any}
        />
      ) : (
        <>
          {isPackScope && (
            <div className="mb-8">
              <PackPanel
                projectId={project.id}
                subjectMode={project.subject_mode as "product_only" | "product_with_model"}
                styleMode={project.style_mode as "studio" | "lifestyle" | "ugc" | "hybrid"}
                outputScope={project.output_scope as
                  | "multi_format_pack"
                  | "multi_concept_pack"
                  | "full_campaign_pack"}
                initialPlatforms={(project.selected_platforms_json ?? []) as string[]}
                modelId={project.selected_model_id}
                productId={project.selected_product_id}
                models={models ?? []}
                products={products ?? []}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                packs={(packs ?? []) as any}
              />
            </div>
          )}
          <ProjectWorkspace
            projectId={project.id}
            subjectMode={project.subject_mode as "product_only" | "product_with_model"}
            styleMode={project.style_mode as "studio" | "lifestyle" | "ugc" | "hybrid"}
            initialModelId={project.selected_model_id}
            initialProductId={project.selected_product_id}
            models={models ?? []}
            products={products ?? []}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            requests={(requests ?? []) as any}
          />
        </>
      )}
    </>
  );
}
