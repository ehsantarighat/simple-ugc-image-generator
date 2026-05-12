import { Trash2 } from "lucide-react";
import { SignedImage } from "@/components/shared/signed-image";

interface ImageRow {
  id: string;
  storage_path: string;
  sort_order: number;
}

interface Props {
  images: ImageRow[];
  onDelete: (imageId: string) => Promise<void>;
}

// Server component that renders a grid of reference images. The delete button
// invokes a passed-in server action so the same grid is reusable across
// models and products.
export function ReferenceImageGrid({ images, onDelete }: Props) {
  if (images.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-[var(--color-border)] p-6 text-center text-sm text-[var(--color-muted-foreground)]">
        No images yet. Add some using the form on the left.
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {images.map((img) => (
        <div
          key={img.id}
          className="group relative aspect-square overflow-hidden rounded-md border border-[var(--color-border)] bg-[var(--color-secondary)]"
        >
          <SignedImage storagePath={img.storage_path} alt="" />
          <form
            action={async () => {
              "use server";
              await onDelete(img.id);
            }}
          >
            <button
              type="submit"
              className="absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-full bg-black/70 text-white opacity-0 transition-opacity group-hover:opacity-100"
              aria-label="Remove image"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>
      ))}
    </div>
  );
}
