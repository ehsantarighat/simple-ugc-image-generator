import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, FolderKanban, User2, Box, Sparkles } from "lucide-react";
import { SignedImage } from "@/components/shared/signed-image";
import { formatRelativeTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { supabase, user } = await requireUser();

  const [{ data: projects }, { data: recentImages }, { count: modelCount }, { count: productCount }] =
    await Promise.all([
      supabase
        .from("projects")
        .select("id, title, updated_at, target_channel")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(6),
      supabase
        .from("generated_images")
        .select("id, storage_path, project_id, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(8),
      supabase.from("models").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      supabase
        .from("products")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id),
    ]);

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Welcome back. Quick start from here."
        actions={
          <Button asChild>
            <Link href="/projects/new">
              <Plus className="mr-1 h-4 w-4" /> New project
            </Link>
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <QuickAction
          icon={<FolderKanban className="h-4 w-4" />}
          label="Projects"
          href="/projects"
          hint={`${projects?.length ?? 0} recent`}
        />
        <QuickAction
          icon={<User2 className="h-4 w-4" />}
          label="Models"
          href="/models"
          hint={`${modelCount ?? 0} total`}
        />
        <QuickAction
          icon={<Box className="h-4 w-4" />}
          label="Products"
          href="/products"
          hint={`${productCount ?? 0} total`}
        />
      </div>

      <section className="mt-10">
        <h2 className="mb-3 text-sm font-medium">Recent projects</h2>
        {!projects || projects.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[var(--color-border)] py-10 text-center text-sm text-[var(--color-muted-foreground)]">
            No projects yet.{" "}
            <Link href="/projects/new" className="underline">
              Create one
            </Link>
            .
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((p) => (
              <Link key={p.id} href={`/projects/${p.id}`}>
                <Card className="transition-shadow hover:shadow-md">
                  <CardContent className="pt-5">
                    <div className="font-medium">{p.title}</div>
                    <div className="mt-1 text-xs text-[var(--color-muted-foreground)]">
                      Updated {formatRelativeTime(p.updated_at)}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="mt-10">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-medium">
          <Sparkles className="h-3.5 w-3.5" /> Recent generations
        </h2>
        {!recentImages || recentImages.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[var(--color-border)] py-10 text-center text-sm text-[var(--color-muted-foreground)]">
            Your shots will show up here.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {recentImages.map((img) => (
              <Link
                key={img.id}
                href={`/projects/${img.project_id}`}
                className="relative aspect-square overflow-hidden rounded-md border border-[var(--color-border)] bg-[var(--color-secondary)]"
              >
                <SignedImage storagePath={img.storage_path} alt="" />
              </Link>
            ))}
          </div>
        )}
      </section>
    </>
  );
}

function QuickAction({
  icon,
  label,
  href,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  href: string;
  hint: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between rounded-lg border border-[var(--color-border)] p-4 transition-colors hover:bg-[var(--color-secondary)]/40"
    >
      <div className="flex items-center gap-3">
        <span className="grid h-8 w-8 place-items-center rounded-md bg-[var(--color-secondary)]">
          {icon}
        </span>
        <span className="font-medium">{label}</span>
      </div>
      <span className="text-xs text-[var(--color-muted-foreground)]">{hint}</span>
    </Link>
  );
}
