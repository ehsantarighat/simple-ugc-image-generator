"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/supabase/server";
import { productCreateSchema, productUpdateSchema } from "@/lib/validators/products";
import { uploadReferenceImage, validateImageUpload } from "@/lib/services/asset-service";
import { removeAssets } from "@/lib/supabase/storage";

export type ActionResult = { ok: boolean; message?: string; id?: string } | null;

function buildPreservationRules(notes: string | null | undefined) {
  return {
    notes: notes ?? "",
    preserve: [
      "Exact product shape and proportions",
      "Dominant colors and packaging texture",
      "Logo placement and typography",
    ],
  };
}

export async function createProductAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  try {
    const { supabase, user } = await requireUser();
    const parsed = productCreateSchema.parse({
      name: formData.get("name"),
      brand_name: formData.get("brand_name") || null,
      category: formData.get("category") || null,
      description: formData.get("description") || null,
      preservation_notes: formData.get("preservation_notes") || null,
    });

    const { data: product, error } = await supabase
      .from("products")
      .insert({
        user_id: user.id,
        name: parsed.name,
        brand_name: parsed.brand_name ?? null,
        category: parsed.category ?? null,
        description: parsed.description ?? null,
        preservation_rules_json: buildPreservationRules(parsed.preservation_notes),
      })
      .select("id")
      .single();
    if (error || !product) {
      return { ok: false, message: error?.message ?? "Failed to create product." };
    }

    const files = formData.getAll("images").filter((f): f is File => f instanceof File && f.size > 0);
    if (files.length > 0) {
      const uploads = await Promise.all(
        files.map(async (file, idx) => {
          const validated = await validateImageUpload(file);
          const path = await uploadReferenceImage({
            root: "products",
            userId: user.id,
            ownerId: product.id,
            index: idx,
            file: validated,
          });
          return { storage_path: path, sort_order: idx };
        })
      );
      const { error: imgErr } = await supabase.from("product_images").insert(
        uploads.map((u) => ({
          product_id: product.id,
          user_id: user.id,
          storage_path: u.storage_path,
          sort_order: u.sort_order,
        }))
      );
      if (imgErr) {
        return { ok: false, message: `Product created but images failed: ${imgErr.message}` };
      }
    }

    revalidatePath("/products");
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { ok: false, message: err.issues.map((i) => i.message).join(", ") };
    }
    return { ok: false, message: err instanceof Error ? err.message : "Unknown error" };
  }
  redirect("/products");
}

export async function updateProductAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  try {
    const { supabase, user } = await requireUser();
    const parsed = productUpdateSchema.parse({
      id: formData.get("id"),
      name: formData.get("name"),
      brand_name: formData.get("brand_name") || null,
      category: formData.get("category") || null,
      description: formData.get("description") || null,
      preservation_notes: formData.get("preservation_notes") || null,
    });

    const { error } = await supabase
      .from("products")
      .update({
        name: parsed.name,
        brand_name: parsed.brand_name ?? null,
        category: parsed.category ?? null,
        description: parsed.description ?? null,
        preservation_rules_json: buildPreservationRules(parsed.preservation_notes),
      })
      .eq("id", parsed.id)
      .eq("user_id", user.id);
    if (error) return { ok: false, message: error.message };

    const files = formData.getAll("images").filter((f): f is File => f instanceof File && f.size > 0);
    if (files.length > 0) {
      const { data: existing } = await supabase
        .from("product_images")
        .select("id")
        .eq("product_id", parsed.id)
        .eq("user_id", user.id);
      const startIdx = existing?.length ?? 0;
      const uploads = await Promise.all(
        files.map(async (file, idx) => {
          const validated = await validateImageUpload(file);
          const path = await uploadReferenceImage({
            root: "products",
            userId: user.id,
            ownerId: parsed.id,
            index: startIdx + idx,
            file: validated,
          });
          return { storage_path: path, sort_order: startIdx + idx };
        })
      );
      const { error: imgErr } = await supabase.from("product_images").insert(
        uploads.map((u) => ({
          product_id: parsed.id,
          user_id: user.id,
          storage_path: u.storage_path,
          sort_order: u.sort_order,
        }))
      );
      if (imgErr) return { ok: false, message: imgErr.message };
    }

    revalidatePath("/products");
    revalidatePath(`/products/${parsed.id}`);
    return { ok: true, id: parsed.id };
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { ok: false, message: err.issues.map((i) => i.message).join(", ") };
    }
    return { ok: false, message: err instanceof Error ? err.message : "Unknown error" };
  }
}

export async function deleteProductImageAction(imageId: string) {
  const { supabase, user } = await requireUser();
  const { data: image } = await supabase
    .from("product_images")
    .select("storage_path, product_id")
    .eq("id", imageId)
    .eq("user_id", user.id)
    .single();
  if (!image) return { ok: false, message: "Not found" };
  await supabase.from("product_images").delete().eq("id", imageId).eq("user_id", user.id);
  await removeAssets([image.storage_path]);
  revalidatePath(`/products/${image.product_id}`);
  return { ok: true };
}

export async function deleteProductAction(productId: string) {
  const { supabase, user } = await requireUser();
  const { data: images } = await supabase
    .from("product_images")
    .select("storage_path")
    .eq("product_id", productId)
    .eq("user_id", user.id);
  await supabase.from("products").delete().eq("id", productId).eq("user_id", user.id);
  if (images && images.length > 0) {
    await removeAssets(images.map((i) => i.storage_path));
  }
  revalidatePath("/products");
  redirect("/products");
}
