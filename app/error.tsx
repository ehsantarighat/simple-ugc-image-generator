"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";

// Detects the "Server Action <hash> was not found on the server" error that
// happens right after a deploy when the browser has an old page cached with
// stale action ids. The new build doesn't recognize the old ids.
const STALE_ACTION_RE =
  /Server Action[\s\S]+was not found on the server|failed-to-find-server-action/i;

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const isStaleAction = STALE_ACTION_RE.test(error.message ?? "");

  // Force a hard reload on stale-action errors so the browser fetches the
  // current deploy's HTML with current action ids. window.location.reload()
  // bypasses the in-memory app state that's still holding the old ids.
  React.useEffect(() => {
    if (!isStaleAction) return;
    // Small delay so the user sees the friendly message rather than a flash.
    const t = window.setTimeout(() => {
      window.location.reload();
    }, 800);
    return () => window.clearTimeout(t);
  }, [isStaleAction]);

  if (isStaleAction) {
    return (
      <main className="grid min-h-screen place-items-center px-6 text-center">
        <div className="space-y-3">
          <div className="text-xl font-semibold">Updating…</div>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            The app just deployed a new version. Reloading the page so you get the latest.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="grid min-h-screen place-items-center px-6 text-center">
      <div className="space-y-3">
        <div className="text-xl font-semibold">Something went wrong</div>
        <p className="text-sm text-[var(--color-muted-foreground)]">
          {error.message || "An unexpected error occurred."}
        </p>
        <Button onClick={reset}>Try again</Button>
      </div>
    </main>
  );
}
