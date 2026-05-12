import { notFound } from "next/navigation";
import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { DeleteOwnerButton } from "@/components/shared/delete-owner-button";
import { deleteProjectAction } from "@/lib/actions/projects";
import { ProjectWorkspace } from "@/components/projects/project-workspace";

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
       updated_at, model:models(id, name), product:products(id, name)`
    )
    .eq("id", projectId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!project) notFound();

  const [{ data: models }, { data: products }, { data: requests }] = await Promise.all([
    supabase.from("models").select("id, name").eq("user_id", user.id),
    supabase.from("products").select("id, name").eq("user_id", user.id),
    supabase
      .from("generation_requests")
      .select(
        `id, status, error_message, raw_scene_prompt, controls_json, created_at,
         images:generated_images(id, storage_path, is_favorite, parent_image_id, metadata_json, created_at)`
      )
      .eq("project_id", projectId)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

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

      <ProjectWorkspace
        projectId={project.id}
        initialModelId={project.selected_model_id}
        initialProductId={project.selected_product_id}
        models={models ?? []}
        products={products ?? []}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        requests={(requests ?? []) as any}
      />
    </>
  );
}
