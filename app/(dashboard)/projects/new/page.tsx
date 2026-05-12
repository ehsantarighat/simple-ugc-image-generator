import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { NewProjectForm } from "@/components/projects/new-project-form";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function NewProjectPage() {
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

  return (
    <>
      <PageHeader
        title="New project"
        description="Set up a shoot. You can pick the model and product now or do it on the project page."
      />

      <div className="max-w-2xl">
        {(!models || models.length === 0) && (
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

        <NewProjectForm models={models ?? []} products={products ?? []} />

        <div className="mt-6">
          <Button asChild variant="ghost" size="sm">
            <Link href="/projects">Cancel</Link>
          </Button>
        </div>
      </div>
    </>
  );
}
