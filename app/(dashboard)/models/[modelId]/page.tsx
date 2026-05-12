import { notFound } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { ModelForm } from "@/components/models/model-form";
import { ReferenceImageGrid } from "@/components/shared/reference-image-grid";
import { DeleteOwnerButton } from "@/components/shared/delete-owner-button";
import { deleteModelAction, deleteModelImageAction } from "@/lib/actions/models";

export const dynamic = "force-dynamic";

export default async function ModelDetailPage({
  params,
}: {
  params: Promise<{ modelId: string }>;
}) {
  const { modelId } = await params;
  const { supabase, user } = await requireUser();

  const { data: model } = await supabase
    .from("models")
    .select("id, name, description")
    .eq("id", modelId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!model) notFound();

  const { data: images } = await supabase
    .from("model_images")
    .select("id, storage_path, sort_order")
    .eq("model_id", modelId)
    .eq("user_id", user.id)
    .order("sort_order");

  return (
    <>
      <PageHeader
        title={model.name}
        description="Edit details or add more reference images."
        actions={
          <DeleteOwnerButton
            label="Delete model"
            confirmMessage="Delete this model and all its reference images? This cannot be undone."
            action={async () => {
              "use server";
              await deleteModelAction(modelId);
            }}
          />
        }
      />

      <div className="grid gap-8 lg:grid-cols-[1fr_1fr]">
        <div>
          <ModelForm
            mode="update"
            defaultValues={{
              id: model.id,
              name: model.name,
              description: model.description,
            }}
          />
        </div>
        <div>
          <h2 className="mb-3 text-sm font-medium">Reference images</h2>
          <ReferenceImageGrid
            images={images ?? []}
            onDelete={async (imageId) => {
              "use server";
              await deleteModelImageAction(imageId);
            }}
          />
        </div>
      </div>
    </>
  );
}
