import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Plus,
  FolderKanban,
  User2,
  Box,
  Sparkles,
  Camera,
  DollarSign,
  ImageIcon,
} from "lucide-react";
import { SignedImage } from "@/components/shared/signed-image";
import { formatRelativeTime } from "@/lib/utils";
import {
  rollupBalances,
  type AccountBalance,
} from "@/lib/services/billing/budgets";

/** Format tenth-cents (1/1000 USD) → human-readable USD string. */
function formatSpend(tenthCents: number): string {
  if (!tenthCents || tenthCents <= 0) return "$0.00";
  const usd = tenthCents / 1000;
  if (usd < 0.01) return "<$0.01";
  if (usd < 100) return `$${usd.toFixed(2)}`;
  return `$${usd.toFixed(0)}`;
}

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { supabase, user } = await requireUser();

  // Spend windows. Use date_trunc-like ISO timestamps so the DB index on
  // (user_id, created_at) is hit. Today = midnight local-to-server (UTC).
  const now = new Date();
  const startOfToday = new Date(Date.UTC(
    now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()
  ));
  const startOfMonth = new Date(Date.UTC(
    now.getUTCFullYear(), now.getUTCMonth(), 1
  ));

  const [
    { data: projects },
    { data: recentImages },
    { count: modelCount },
    { count: productCount },
    { data: todaySpendRows },
    { data: monthSpendRows },
    { data: lifetimeRows },
  ] = await Promise.all([
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
    // Lightweight spend pulls — just the columns we need to sum client-side.
    // For large accounts this should be moved to an aggregate RPC, but at
    // MVP scale (≤ a few thousand images/user) this is fine.
    supabase
      .from("generated_images")
      .select("provider_cost_tenth_cents")
      .eq("user_id", user.id)
      .gte("created_at", startOfToday.toISOString()),
    supabase
      .from("generated_images")
      .select("provider_cost_tenth_cents")
      .eq("user_id", user.id)
      .gte("created_at", startOfMonth.toISOString()),
    // Lifetime spend keyed by provider — drives the per-account balance
    // cards (Starting → Spent → Remaining). Filter to >0 cost so we don't
    // pull millions of legacy zero-cost rows when the account is mature.
    supabase
      .from("generated_images")
      .select("provider_used, provider_cost_tenth_cents")
      .eq("user_id", user.id)
      .gt("provider_cost_tenth_cents", 0),
  ]);

  const sumCost = (rows: { provider_cost_tenth_cents: number | null }[] | null) =>
    (rows ?? []).reduce((sum, r) => sum + (r.provider_cost_tenth_cents ?? 0), 0);
  const todaySpend = sumCost(todaySpendRows);
  const monthSpend = sumCost(monthSpendRows);
  const monthImageCount = (monthSpendRows ?? []).length;

  const balances: AccountBalance[] = rollupBalances(lifetimeRows ?? []);

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Pick a creation path or pick up where you left off."
      />

      {/* ----- Provider balances ----------------------------------------- */}
      {balances.length > 0 && (
        <div className="mb-6">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-medium">Provider balances</h2>
            <span className="text-[11px] text-[var(--color-muted-foreground)]">
              Edit starting balances in{" "}
              <code className="rounded bg-[var(--color-secondary)] px-1 py-0.5">
                lib/services/billing/budgets.ts
              </code>
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {balances.map((b) => (
              <BalanceCard key={b.account} balance={b} />
            ))}
          </div>
        </div>
      )}

      {/* ----- Spend summary --------------------------------------------- */}
      <div className="mb-8 grid gap-3 sm:grid-cols-3">
        <SpendCard
          label="Today"
          value={formatSpend(todaySpend)}
          hint={todaySpend > 0 ? "Provider list price" : "No spend yet"}
        />
        <SpendCard
          label="This month"
          value={formatSpend(monthSpend)}
          hint={`${monthImageCount} image${monthImageCount === 1 ? "" : "s"} generated`}
        />
        <SpendCard
          label="Avg per image"
          value={
            monthImageCount > 0
              ? formatSpend(Math.round(monthSpend / monthImageCount))
              : "—"
          }
          hint="Across all providers this month"
        />
      </div>

      {/* ----- Two primary creation paths -------------------------------- */}
      <div className="grid gap-4 md:grid-cols-2">
        <CreationCard
          href="/projects/new?mode=product_reproduction"
          icon={<Camera className="h-5 w-5" />}
          eyebrow="Mode A"
          title="Recreate Product Photos"
          body="Upload a product photo and generate studio, flat-lay, lifestyle, and platform-ready versions in multiple formats."
          cta="Start Mode A"
        />
        <CreationCard
          href="/projects/new?mode=ugc_model_product"
          icon={<ImageIcon className="h-5 w-5" />}
          eyebrow="Mode B"
          title="Create UGC Product Images"
          body="Combine a model and a product to generate realistic influencer-style images with full scene + camera control."
          cta="Start Mode B"
        />
      </div>

      {/* ----- Library shortcuts ------------------------------------------ */}
      <div className="mt-8 grid gap-3 sm:grid-cols-3">
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

function CreationCard({
  href,
  icon,
  eyebrow,
  title,
  body,
  cta,
}: {
  href: string;
  icon: React.ReactNode;
  eyebrow: string;
  title: string;
  body: string;
  cta: string;
}) {
  return (
    <Link
      href={href}
      className="group block rounded-lg border border-[var(--color-border)] p-6 transition-all hover:border-[var(--color-foreground)] hover:shadow-md"
    >
      <div className="mb-3 flex items-center gap-2">
        <span className="grid h-9 w-9 place-items-center rounded-md bg-[var(--color-secondary)]">
          {icon}
        </span>
        <span className="text-xs uppercase tracking-wider text-[var(--color-muted-foreground)]">
          {eyebrow}
        </span>
      </div>
      <div className="text-xl font-semibold">{title}</div>
      <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">{body}</p>
      <div className="mt-4 inline-flex items-center gap-1 text-sm font-medium">
        {cta}
        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
      </div>
    </Link>
  );
}

function BalanceCard({ balance }: { balance: AccountBalance }) {
  const hasStarting = balance.startingTenthCents > 0;
  const pct = Math.round(balance.utilization * 100);
  // Color the progress bar by burn level so the user can see at a glance
  // when they're about to run out: <70% green, 70-90% amber, >=90% red.
  const burnColor =
    !hasStarting
      ? "bg-[var(--color-muted-foreground)]"
      : pct >= 90
        ? "bg-[var(--color-destructive)]"
        : pct >= 70
          ? "bg-amber-500"
          : "bg-emerald-500";
  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-secondary)]/30 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-medium">{balance.label}</div>
          <div className="mt-0.5 text-[11px] text-[var(--color-muted-foreground)]">
            {balance.imageCount} image{balance.imageCount === 1 ? "" : "s"} ·{" "}
            {hasStarting ? `${pct}% used` : "no balance set"}
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-semibold tabular-nums">
            {formatSpend(balance.remainingTenthCents)}
          </div>
          <div className="text-[10px] uppercase tracking-wider text-[var(--color-muted-foreground)]">
            remaining
          </div>
        </div>
      </div>

      {hasStarting && (
        <>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-secondary)]">
            <div
              className={`h-full ${burnColor} transition-[width]`}
              style={{ width: `${Math.max(2, pct)}%` }}
            />
          </div>
          <div className="mt-1.5 flex items-center justify-between text-[10px] text-[var(--color-muted-foreground)]">
            <span>
              Starting {formatSpend(balance.startingTenthCents)}
            </span>
            <span>
              Spent {formatSpend(balance.spentTenthCents)}
            </span>
          </div>
        </>
      )}

      {!hasStarting && balance.spentTenthCents > 0 && (
        <div className="mt-2 text-[11px] text-[var(--color-muted-foreground)]">
          Spent {formatSpend(balance.spentTenthCents)} — set a starting balance
          in <code>budgets.ts</code> to track the remaining account credit.
        </div>
      )}
    </div>
  );
}

function SpendCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-secondary)]/30 p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-[var(--color-muted-foreground)]">
          {label}
        </span>
        <DollarSign className="h-3.5 w-3.5 text-[var(--color-muted-foreground)]" />
      </div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
      <div className="mt-0.5 text-[11px] text-[var(--color-muted-foreground)]">
        {hint}
      </div>
    </div>
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
