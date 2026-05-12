import Link from "next/link";
import { FolderKanban, Plus } from "lucide-react";
import { requireUser } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatRelativeTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const { supabase, user } = await requireUser();

  const { data: projects } = await supabase
    .from("projects")
    .select(
      `id, title, description, target_channel, updated_at,
       model:models(name),
       product:products(name)`
    )
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  return (
    <>
      <PageHeader
        title="Projects"
        description="Each shoot lives in a project. Pick a model + product once, generate many scenes."
        actions={
          <Button asChild>
            <Link href="/projects/new">
              <Plus className="mr-1 h-4 w-4" /> New project
            </Link>
          </Button>
        }
      />

      {!projects || projects.length === 0 ? (
        <EmptyState
          icon={<FolderKanban className="h-5 w-5" />}
          title="No projects yet"
          description="Create your first project to start generating images."
          action={
            <Button asChild>
              <Link href="/projects/new">Create project</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => {
            const model = Array.isArray(p.model) ? p.model[0] : p.model;
            const product = Array.isArray(p.product) ? p.product[0] : p.product;
            return (
              <Link key={p.id} href={`/projects/${p.id}`}>
                <Card className="transition-shadow hover:shadow-md">
                  <CardContent className="pt-6">
                    <div className="text-base font-semibold">{p.title}</div>
                    {p.description && (
                      <div className="mt-1 line-clamp-2 text-sm text-[var(--color-muted-foreground)]">
                        {p.description}
                      </div>
                    )}
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-[var(--color-muted-foreground)]">
                      <span>Model: {model?.name ?? "—"}</span>
                      <span>·</span>
                      <span>Product: {product?.name ?? "—"}</span>
                    </div>
                    <div className="mt-1 text-xs text-[var(--color-muted-foreground)]">
                      Updated {formatRelativeTime(p.updated_at)}
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
