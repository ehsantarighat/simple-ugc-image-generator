import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="grid min-h-[40vh] place-items-center">
      <Loader2 className="h-5 w-5 animate-spin text-[var(--color-muted-foreground)]" />
    </div>
  );
}
