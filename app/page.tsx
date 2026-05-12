import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Camera, Sparkles, ImageIcon } from "lucide-react";

export default function LandingPage() {
  return (
    <main className="min-h-screen">
      <header className="border-b border-[var(--color-border)]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <Sparkles className="h-5 w-5" />
            UGC Studio
          </Link>
          <nav className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
            >
              Sign in
            </Link>
            <Button asChild size="sm">
              <Link href="/signup">Get started</Link>
            </Button>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-3xl px-6 py-24 text-center">
        <h1 className="text-4xl font-bold leading-tight tracking-tight md:text-5xl">
          Influencer-style product photos that look real.
        </h1>
        <p className="mt-5 text-lg text-[var(--color-muted-foreground)]">
          Upload a model, upload a product, describe the scene. We generate
          believable, on-brand UGC images you can ship to social.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Button asChild size="lg">
            <Link href="/signup">
              Start free
              <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/login">Sign in</Link>
          </Button>
        </div>
      </section>

      <section className="mx-auto grid max-w-5xl gap-6 px-6 pb-24 md:grid-cols-3">
        <Feature
          icon={<Camera className="h-5 w-5" />}
          title="Real photography controls"
          body="Shot type, angle, lens, lighting, framing — the controls a real shoot would use."
        />
        <Feature
          icon={<ImageIcon className="h-5 w-5" />}
          title="Identity-locked"
          body="Reuse the same model and product across hundreds of scenes without re-uploading."
        />
        <Feature
          icon={<Sparkles className="h-5 w-5" />}
          title="Natural-language refinement"
          body="Don't like a shot? Say what to change. We re-shoot."
        />
      </section>
    </main>
  );
}

function Feature({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-lg border border-[var(--color-border)] p-5">
      <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-md bg-[var(--color-secondary)]">
        {icon}
      </div>
      <div className="font-medium">{title}</div>
      <div className="mt-1 text-sm text-[var(--color-muted-foreground)]">{body}</div>
    </div>
  );
}
