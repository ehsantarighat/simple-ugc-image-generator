import Link from "next/link";
import { User2, Plus } from "lucide-react";
import { requireUser } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { SignedImage } from "@/components/shared/signed-image";
import { Card, CardContent } from "@/components/ui/card";
import { formatRelativeTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ModelsPage() {
  const { supabase, user } = await requireUser();

  const { data: models } = await supabase
    .from("models")
    .select("id, name, description, updated_at, model_images(storage_path, sort_order)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <>
      <PageHeader
        title="Models"
        description="Reusable identity references. Three or more clear images make the best results."
        actions={
          <Button asChild>
            <Link href="/models/new">
              <Plus className="mr-1 h-4 w-4" /> New model
            </Link>
          </Button>
        }
      />

      {!models || models.length === 0 ? (
        <EmptyState
          icon={<User2 className="h-5 w-5" />}
          title="No models yet"
          description="Upload reference photos of a person and reuse them across every shoot."
          action={
            <Button asChild>
              <Link href="/models/new">Add your first model</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {models.map((m) => {
            const cover = m.model_images?.sort(
              (a, b) => a.sort_order - b.sort_order
            )[0]?.storage_path;
            return (
              <Link key={m.id} href={`/models/${m.id}`}>
                <Card className="overflow-hidden transition-shadow hover:shadow-md">
                  <div className="relative aspect-[4/3] w-full bg-[var(--color-secondary)]">
                    {cover ? (
                      <SignedImage storagePath={cover} alt={m.name} className="" />
                    ) : (
                      <div className="grid h-full place-items-center text-xs text-[var(--color-muted-foreground)]">
                        No image yet
                      </div>
                    )}
                  </div>
                  <CardContent className="pt-4">
                    <div className="font-medium">{m.name}</div>
                    <div className="text-xs text-[var(--color-muted-foreground)]">
                      Updated {formatRelativeTime(m.updated_at)}
                      {" · "}
                      {m.model_images?.length ?? 0} images
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
