"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ImageDropzone } from "@/components/shared/image-dropzone";
import {
  createProductAction,
  updateProductAction,
  type ActionResult,
} from "@/lib/actions/products";

interface Props {
  mode: "create" | "update";
  defaultValues?: {
    id: string;
    name: string;
    brand_name: string | null;
    category: string | null;
    description: string | null;
    preservation_notes?: string | null;
  };
}

export function ProductForm({ mode, defaultValues }: Props) {
  const action = mode === "create" ? createProductAction : updateProductAction;
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(action, null);

  return (
    <form action={formAction} className="space-y-5">
      {defaultValues?.id && <input type="hidden" name="id" value={defaultValues.id} />}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Product name</Label>
          <Input
            id="name"
            name="name"
            required
            maxLength={80}
            defaultValue={defaultValues?.name}
            placeholder="e.g. Glow Serum 30ml"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="brand_name">Brand (optional)</Label>
          <Input
            id="brand_name"
            name="brand_name"
            maxLength={80}
            defaultValue={defaultValues?.brand_name ?? ""}
            placeholder="e.g. NorthStar"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="category">Category (optional)</Label>
        <Input
          id="category"
          name="category"
          maxLength={60}
          defaultValue={defaultValues?.category ?? ""}
          placeholder="e.g. skincare, supplements, footwear"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description (optional)</Label>
        <Textarea
          id="description"
          name="description"
          maxLength={600}
          rows={3}
          defaultValue={defaultValues?.description ?? ""}
          placeholder="What is this product? Form factor, packaging type, typical use."
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="preservation_notes">Must-preserve notes (optional)</Label>
        <Textarea
          id="preservation_notes"
          name="preservation_notes"
          maxLength={400}
          rows={2}
          defaultValue={defaultValues?.preservation_notes ?? ""}
          placeholder="e.g. Keep the gold cap. Logo always faces camera. Don't change the color."
        />
      </div>

      <div className="space-y-2">
        <Label>
          Upload reference images{" "}
          <span className="text-[var(--color-muted-foreground)]">(recommended: front, side, packaging)</span>
        </Label>
        <ImageDropzone
          name="images"
          multiple
          maxFiles={10}
          minRecommended={2}
          helperText="Clean product shots on plain backgrounds work best."
        />
      </div>

      {state?.message && (
        <div className="text-sm text-[var(--color-destructive)]">{state.message}</div>
      )}

      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending
            ? mode === "create"
              ? "Creating..."
              : "Saving..."
            : mode === "create"
              ? "Create product"
              : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
