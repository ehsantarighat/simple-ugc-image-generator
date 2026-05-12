"use client";

import * as React from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";

// Resolves a signed URL on the client. We use the user's own session — RLS
// guards what they can read. Cached per path for the lifetime of the page.
const cache = new Map<string, string>();
const BUCKET = "ugc-assets";

export function SignedClientImage({
  path,
  alt = "",
  className,
}: {
  path: string;
  alt?: string;
  className?: string;
}) {
  const [url, setUrl] = React.useState<string | null>(cache.get(path) ?? null);

  React.useEffect(() => {
    let cancelled = false;
    if (cache.has(path)) {
      setUrl(cache.get(path)!);
      return;
    }
    const supabase = getSupabaseBrowserClient();
    supabase.storage
      .from(BUCKET)
      .createSignedUrl(path, 60 * 15)
      .then(({ data }) => {
        if (cancelled) return;
        const next = data?.signedUrl ?? null;
        if (next) cache.set(path, next);
        setUrl(next);
      });
    return () => {
      cancelled = true;
    };
  }, [path]);

  if (!url) {
    return (
      <div
        className={
          "grid h-full w-full place-items-center bg-[var(--color-secondary)] " + (className ?? "")
        }
      >
        <Loader2 className="h-4 w-4 animate-spin text-[var(--color-muted-foreground)]" />
      </div>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src={url}
      alt={alt}
      className={"h-full w-full object-cover " + (className ?? "")}
      loading="lazy"
    />
  );
}
