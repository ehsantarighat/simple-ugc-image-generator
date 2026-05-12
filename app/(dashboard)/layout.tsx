import { redirect } from "next/navigation";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { SidebarNav } from "@/components/dashboard/sidebar-nav";
import { UserMenu } from "@/components/dashboard/user-menu";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, avatar_url")
    .eq("user_id", user.id)
    .maybeSingle();

  return (
    <div className="grid min-h-screen md:grid-cols-[240px_1fr]">
      <aside className="hidden border-r border-[var(--color-border)] bg-[var(--color-secondary)]/40 md:flex md:flex-col">
        <div className="flex h-14 items-center gap-2 border-b border-[var(--color-border)] px-5 font-semibold">
          <Sparkles className="h-4 w-4" />
          UGC Studio
        </div>
        <SidebarNav />
        <div className="mt-auto border-t border-[var(--color-border)] p-3">
          <UserMenu
            email={user.email ?? ""}
            name={profile?.full_name ?? null}
          />
        </div>
      </aside>
      <div className="flex flex-col">
        <header className="flex h-14 items-center justify-between border-b border-[var(--color-border)] px-5 md:hidden">
          <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
            <Sparkles className="h-4 w-4" />
            UGC Studio
          </Link>
          <UserMenu email={user.email ?? ""} name={profile?.full_name ?? null} />
        </header>
        <main className="flex-1 p-6 md:p-8">{children}</main>
      </div>
    </div>
  );
}
