"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/supabase/server";
import { projectCreateSchema } from "@/lib/validators/generation";

export type ActionResult = { ok: boolean; message?: string; id?: string } | null;

export async function createProjectAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  let createdId: string | null = null;
  try {
    const { supabase, user } = await requireUser();
    const platformsRaw = formData.getAll("selected_platforms").filter(Boolean) as string[];
    const parsed = projectCreateSchema.parse({
      title: formData.get("title"),
      description: formData.get("description") || null,
      selected_model_id: formData.get("selected_model_id") || null,
      selected_product_id: formData.get("selected_product_id") || null,
      target_channel: formData.get("target_channel") || "general",
      subject_mode: formData.get("subject_mode") || "product_with_model",
      style_mode: formData.get("style_mode") || "ugc",
      output_scope: formData.get("output_scope") || "single_image",
      selected_platforms: platformsRaw,
    });

    const { data, error } = await supabase
      .from("projects")
      .insert({
        user_id: user.id,
        title: parsed.title,
        description: parsed.description ?? null,
        selected_model_id: parsed.selected_model_id || null,
        selected_product_id: parsed.selected_product_id || null,
        target_channel: parsed.target_channel,
        subject_mode: parsed.subject_mode,
        style_mode: parsed.style_mode,
        output_scope: parsed.output_scope,
        selected_platforms_json: parsed.selected_platforms,
      })
      .select("id")
      .single();
    if (error || !data) return { ok: false, message: error?.message ?? "Failed to create" };
    createdId = data.id as string;
    revalidatePath("/projects");
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { ok: false, message: err.issues.map((i) => i.message).join(", ") };
    }
    return { ok: false, message: err instanceof Error ? err.message : "Unknown error" };
  }
  if (createdId) redirect(`/projects/${createdId}`);
  return null;
}

export async function updateProjectSelectionAction(
  projectId: string,
  patch: {
    title?: string;
    description?: string | null;
    selected_model_id?: string | null;
    selected_product_id?: string | null;
    target_channel?:
      | "instagram"
      | "tiktok"
      | "amazon"
      | "shopify"
      | "youtube"
      | "general";
  }
) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("projects")
    .update(patch)
    .eq("id", projectId)
    .eq("user_id", user.id);
  if (error) return { ok: false, message: error.message };
  revalidatePath(`/projects/${projectId}`);
  return { ok: true };
}

export async function deleteProjectAction(projectId: string) {
  const { supabase, user } = await requireUser();
  await supabase.from("projects").delete().eq("id", projectId).eq("user_id", user.id);
  revalidatePath("/projects");
  redirect("/projects");
}

export async function toggleFavoriteAction(generatedImageId: string) {
  const { supabase, user } = await requireUser();
  const { data: row } = await supabase
    .from("generated_images")
    .select("is_favorite, project_id")
    .eq("id", generatedImageId)
    .eq("user_id", user.id)
    .single();
  if (!row) return { ok: false, message: "Not found" };
  await supabase
    .from("generated_images")
    .update({ is_favorite: !row.is_favorite })
    .eq("id", generatedImageId)
    .eq("user_id", user.id);
  revalidatePath(`/projects/${row.project_id}`);
  return { ok: true };
}

