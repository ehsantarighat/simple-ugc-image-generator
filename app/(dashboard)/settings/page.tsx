import { requireUser } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const { supabase, user } = await requireUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, avatar_url, created_at")
    .eq("user_id", user.id)
    .maybeSingle();

  return (
    <>
      <PageHeader title="Settings" description="Your account details." />
      <div className="max-w-xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Read-only for now.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row label="Email" value={user.email ?? "—"} />
            <Separator />
            <Row label="Name" value={profile?.full_name ?? "—"} />
            <Separator />
            <Row
              label="Joined"
              value={
                profile?.created_at
                  ? new Date(profile.created_at).toLocaleDateString()
                  : "—"
              }
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>API keys</CardTitle>
            <CardDescription>
              Image generation uses the OpenAI key configured server-side. Per-user
              keys are not supported in the MVP.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <div className="text-[var(--color-muted-foreground)]">{label}</div>
      <div>{value}</div>
    </div>
  );
}
