"use client";

import { ImageIcon, User2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type CreationMode = "product_reproduction" | "ugc_model_product";

interface Props {
  value: CreationMode;
  onChange: (v: CreationMode) => void;
}

// Compact two-option pill, sits inside the chat input footer.
export function ModeToggle({ value, onChange }: Props) {
  return (
    <div className="inline-flex rounded-full border border-[var(--color-border)] p-0.5 text-xs">
      <button
        type="button"
        onClick={() => onChange("ugc_model_product")}
        className={cn(
          "flex items-center gap-1.5 rounded-full px-3 py-1 transition-colors",
          value === "ugc_model_product"
            ? "bg-[var(--color-foreground)] text-[var(--color-background)]"
            : "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
        )}
        title="Combine a model and a product to generate UGC content"
      >
        <User2 className="h-3 w-3" />
        Model + Product
      </button>
      <button
        type="button"
        onClick={() => onChange("product_reproduction")}
        className={cn(
          "flex items-center gap-1.5 rounded-full px-3 py-1 transition-colors",
          value === "product_reproduction"
            ? "bg-[var(--color-foreground)] text-[var(--color-background)]"
            : "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
        )}
        title="Recreate the product across studio / lifestyle / shelf / flat-lay styles"
      >
        <ImageIcon className="h-3 w-3" />
        Product photo
      </button>
    </div>
  );
}
