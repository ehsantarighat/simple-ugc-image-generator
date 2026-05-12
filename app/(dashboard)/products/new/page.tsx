import { PageHeader } from "@/components/shared/page-header";
import { ProductForm } from "@/components/products/product-form";

export default function NewProductPage() {
  return (
    <>
      <PageHeader
        title="Add a product"
        description="Front, side, and packaging close-up work best. Add notes for anything that must be preserved (logo, color, finish)."
      />
      <div className="max-w-2xl">
        <ProductForm mode="create" />
      </div>
    </>
  );
}
