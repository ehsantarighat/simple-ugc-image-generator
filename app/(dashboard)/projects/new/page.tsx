import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { NewProjectForm } from "@/components/projects/new-project-form";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function NewProjectPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>;
}) {
  const { mode } = await searchParams;
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

  const initialMode =
    mode === "product_reproduction" ? "product_reproduction" : "ugc_model_product";

  return (
    <>
      <PageHeader
        title="New project"
        description={
          initialMode === "product_reproduction"
            ? "Mode A — Recreate product photos at scale across styles, ratios, and platforms."
            : "Mode B — Combine a model and a product to generate realistic UGC images."
        }
      />

      <div className="max-w-2xl">
        {(!models || models.length === 0) && initialMode === "ugc_model_product" && (
          <div className="mb-4 rounded-md border border-dashed border-[var(--color-border)] p-4 text-sm">
            You don't have any models yet.{" "}
            <Link href="/models/new" className="underline">
              Add one
            </Link>
            .
          </div>
        )}
        {(!products || products.length === 0) && (
          <div className="mb-4 rounded-md border border-dashed border-[var(--color-border)] p-4 text-sm">
            You don't have any products yet.{" "}
            <Link href="/products/new" className="underline">
              Add one
            </Link>
            .
          </div>
        )}

        <NewProjectForm
          models={models ?? []}
          products={products ?? []}
          initialMode={initialMode}
        />

        <div className="mt-6">
          <Button asChild variant="ghost" size="sm">
            <Link href="/dashboard">Cancel</Link>
          </Button>
        </div>
      </div>
    </>
  );
}
