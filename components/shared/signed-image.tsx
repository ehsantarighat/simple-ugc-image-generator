import Image from "next/image";
import { signedAssetUrl } from "@/lib/supabase/storage";
import { cn } from "@/lib/utils";

interface Props {
  storagePath: string;
  alt: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
}

// Server component: resolves a signed URL and renders <Image />. Use anywhere
// we need to show an asset stored in the private bucket without leaking paths.
export async function SignedImage({
  storagePath,
  alt,
  className,
  sizes = "(max-width: 768px) 50vw, 33vw",
  priority,
}: Props) {
  const url = await signedAssetUrl(storagePath);
  if (!url) {
    return (
      <div
        className={cn(
          "grid place-items-center bg-[var(--color-secondary)] text-xs text-[var(--color-muted-foreground)]",
          className
        )}
      >
        Image unavailable
      </div>
    );
  }
  return (
    <Image
      src={url}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      className={cn("object-cover", className)}
      unoptimized
    />
  );
}
