import Link from "next/link";
import { Box, Plus } from "lucide-react";
import { requireUser } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { SignedImage } from "@/components/shared/signed-image";
import { Card, CardContent } from "@/components/ui/card";
import { formatRelativeTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const { supabase, user } = await requireUser();

  const { data: products } = await supabase
    .from("products")
    .select(
      "id, name, brand_name, category, updated_at, product_images(storage_path, sort_order)"
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <>
      <PageHeader
        title="Products"
        description="Your product catalog. Upload clear shots from multiple angles for the best fidelity."
        actions={
          <Button asChild>
            <Link href="/products/new">
              <Plus className="mr-1 h-4 w-4" /> New product
            </Link>
          </Button>
        }
      />

      {!products || products.length === 0 ? (
        <EmptyState
          icon={<Box className="h-5 w-5" />}
          title="No products yet"
          description="Add your first product. Front shot, another angle, and packaging close-up work best."
          action={
            <Button asChild>
              <Link href="/products/new">Add your first product</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => {
            const cover = p.product_images?.sort(
              (a, b) => a.sort_order - b.sort_order
            )[0]?.storage_path;
            return (
              <Link key={p.id} href={`/products/${p.id}`}>
                <Card className="overflow-hidden transition-shadow hover:shadow-md">
                  <div className="relative aspect-[4/3] w-full bg-[var(--color-secondary)]">
                    {cover ? (
                      <SignedImage storagePath={cover} alt={p.name} />
                    ) : (
                      <div className="grid h-full place-items-center text-xs text-[var(--color-muted-foreground)]">
                        No image yet
                      </div>
                    )}
                  </div>
                  <CardContent className="pt-4">
                    <div className="font-medium">{p.name}</div>
                    <div className="text-xs text-[var(--color-muted-foreground)]">
                      {p.brand_name ?? "—"}
                      {p.category ? ` · ${p.category}` : ""}
                    </div>
                    <div className="mt-1 text-xs text-[var(--color-muted-foreground)]">
                      Updated {formatRelativeTime(p.updated_at)}
                      {" · "}
                      {p.product_images?.length ?? 0} images
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
