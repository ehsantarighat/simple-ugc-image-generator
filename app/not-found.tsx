import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center px-6 text-center">
      <div className="space-y-4">
        <div className="text-6xl font-bold tracking-tight">404</div>
        <p className="text-[var(--color-muted-foreground)]">We couldn't find that page.</p>
        <Button asChild>
          <Link href="/dashboard">Back to dashboard</Link>
        </Button>
      </div>
    </main>
  );
}
