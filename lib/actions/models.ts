"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/supabase/server";
import { modelCreateSchema, modelUpdateSchema } from "@/lib/validators/models";
import { uploadReferenceImage, validateImageUpload } from "@/lib/services/asset-service";
import { removeAssets } from "@/lib/supabase/storage";

export type ActionResult = { ok: boolean; message?: string; id?: string } | null;

export async function createModelAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  try {
    const { supabase, user } = await requireUser();
    const parsed = modelCreateSchema.parse({
      name: formData.get("name"),
      description: formData.get("description") || null,
    });

    const { data: model, error } = await supabase
      .from("models")
      .insert({
        user_id: user.id,
        name: parsed.name,
        description: parsed.description ?? null,
      })
      .select("id")
      .single();
    if (error || !model) {
      return { ok: false, message: error?.message ?? "Failed to create model." };
    }

    const files = formData.getAll("images").filter((f): f is File => f instanceof File && f.size > 0);
    if (files.length > 0) {
      const uploads = await Promise.all(
        files.map(async (file, idx) => {
          const validated = await validateImageUpload(file);
          const path = await uploadReferenceImage({
            root: "models",
            userId: user.id,
            ownerId: model.id,
            index: idx,
            file: validated,
          });
          return { storage_path: path, sort_order: idx };
        })
      );

      const { error: imgErr } = await supabase.from("model_images").insert(
        uploads.map((u) => ({
          model_id: model.id,
          user_id: user.id,
          storage_path: u.storage_path,
          sort_order: u.sort_order,
        }))
      );
      if (imgErr) {
        return { ok: false, message: `Model created but images failed: ${imgErr.message}` };
      }
    }

    revalidatePath("/models");
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { ok: false, message: err.issues.map((i) => i.message).join(", ") };
    }
    return { ok: false, message: err instanceof Error ? err.message : "Unknown error" };
  }
  redirect("/models");
}

export async function updateModelAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  try {
    const { supabase, user } = await requireUser();
    const parsed = modelUpdateSchema.parse({
      id: formData.get("id"),
      name: formData.get("name"),
      description: formData.get("description") || null,
    });

    const { error } = await supabase
      .from("models")
      .update({ name: parsed.name, description: parsed.description ?? null })
      .eq("id", parsed.id)
      .eq("user_id", user.id);
    if (error) return { ok: false, message: error.message };

    const files = formData
      .getAll("images")
      .filter((f): f is File => f instanceof File && f.size > 0);
    if (files.length > 0) {
      // existing image count → continue sort_order
      const { data: existing } = await supabase
        .from("model_images")
        .select("id")
        .eq("model_id", parsed.id)
        .eq("user_id", user.id);
      const startIdx = existing?.length ?? 0;
      const uploads = await Promise.all(
        files.map(async (file, idx) => {
          const validated = await validateImageUpload(file);
          const path = await uploadReferenceImage({
            root: "models",
            userId: user.id,
            ownerId: parsed.id,
            index: startIdx + idx,
            file: validated,
          });
          return { storage_path: path, sort_order: startIdx + idx };
        })
      );
      const { error: imgErr } = await supabase.from("model_images").insert(
        uploads.map((u) => ({
          model_id: parsed.id,
          user_id: user.id,
          storage_path: u.storage_path,
          sort_order: u.sort_order,
        }))
      );
      if (imgErr) return { ok: false, message: imgErr.message };
    }

    revalidatePath("/models");
    revalidatePath(`/models/${parsed.id}`);
    return { ok: true, id: parsed.id };
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { ok: false, message: err.issues.map((i) => i.message).join(", ") };
    }
    return { ok: false, message: err instanceof Error ? err.message : "Unknown error" };
  }
}

export async function deleteModelImageAction(imageId: string) {
  const { supabase, user } = await requireUser();
  const { data: image } = await supabase
    .from("model_images")
    .select("storage_path, model_id")
    .eq("id", imageId)
    .eq("user_id", user.id)
    .single();
  if (!image) return { ok: false, message: "Not found" };
  await supabase.from("model_images").delete().eq("id", imageId).eq("user_id", user.id);
  await removeAssets([image.storage_path]);
  revalidatePath(`/models/${image.model_id}`);
  return { ok: true };
}

export async function deleteModelAction(modelId: string) {
  const { supabase, user } = await requireUser();

  const { data: images } = await supabase
    .from("model_images")
    .select("storage_path")
    .eq("model_id", modelId)
    .eq("user_id", user.id);

  await supabase.from("models").delete().eq("id", modelId).eq("user_id", user.id);
  if (images && images.length > 0) {
    await removeAssets(images.map((i) => i.storage_path));
  }
  revalidatePath("/models");
  redirect("/models");
}
