import { notFound } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { ProductForm } from "@/components/products/product-form";
import { ReferenceImageGrid } from "@/components/shared/reference-image-grid";
import { DeleteOwnerButton } from "@/components/shared/delete-owner-button";
import { deleteProductAction, deleteProductImageAction } from "@/lib/actions/products";

export const dynamic = "force-dynamic";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  const { productId } = await params;
  const { supabase, user } = await requireUser();

  const { data: product } = await supabase
    .from("products")
    .select("id, name, brand_name, category, description, preservation_rules_json")
    .eq("id", productId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!product) notFound();

  const { data: images } = await supabase
    .from("product_images")
    .select("id, storage_path, sort_order")
    .eq("product_id", productId)
    .eq("user_id", user.id)
    .order("sort_order");

  const preservationNotes =
    typeof product.preservation_rules_json === "object" &&
    product.preservation_rules_json !== null &&
    "notes" in product.preservation_rules_json
      ? (product.preservation_rules_json as { notes?: string }).notes ?? ""
      : "";

  return (
    <>
      <PageHeader
        title={product.name}
        description="Edit details or add more reference images."
        actions={
          <DeleteOwnerButton
            label="Delete product"
            confirmMessage="Delete this product and all its reference images? This cannot be undone."
            action={async () => {
              "use server";
              await deleteProductAction(productId);
            }}
          />
        }
      />

      <div className="grid gap-8 lg:grid-cols-[1fr_1fr]">
        <div>
          <ProductForm
            mode="update"
            defaultValues={{
              id: product.id,
              name: product.name,
              brand_name: product.brand_name,
              category: product.category,
              description: product.description,
              preservation_notes: preservationNotes,
            }}
          />
        </div>
        <div>
          <h2 className="mb-3 text-sm font-medium">Reference images</h2>
          <ReferenceImageGrid
            images={images ?? []}
            onDelete={async (imageId) => {
              "use server";
              await deleteProductImageAction(imageId);
            }}
          />
        </div>
      </div>
    </>
  );
}
