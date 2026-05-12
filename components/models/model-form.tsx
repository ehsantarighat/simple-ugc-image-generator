"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ImageDropzone } from "@/components/shared/image-dropzone";
import {
  createModelAction,
  updateModelAction,
  type ActionResult,
} from "@/lib/actions/models";

interface Props {
  mode: "create" | "update";
  defaultValues?: {
    id: string;
    name: string;
    description: string | null;
  };
}

export function ModelForm({ mode, defaultValues }: Props) {
  const action = mode === "create" ? createModelAction : updateModelAction;
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(action, null);

  return (
    <form action={formAction} className="space-y-5">
      {defaultValues?.id && <input type="hidden" name="id" value={defaultValues.id} />}

      <div className="space-y-2">
        <Label htmlFor="name">Model name</Label>
        <Input
          id="name"
          name="name"
          required
          maxLength={80}
          defaultValue={defaultValues?.name}
          placeholder="e.g. Maya — lifestyle"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Notes (optional)</Label>
        <Textarea
          id="description"
          name="description"
          maxLength={400}
          rows={3}
          defaultValue={defaultValues?.description ?? ""}
          placeholder="Hair, ethnicity cues, build, age range — anything that helps preserve identity."
        />
      </div>

      <div className="space-y-2">
        <Label>
          Upload reference images{" "}
          <span className="text-[var(--color-muted-foreground)]">(recommended: 3+)</span>
        </Label>
        <ImageDropzone
          name="images"
          multiple
          maxFiles={10}
          minRecommended={3}
          helperText="Use clean, sharp photos of the same person from different angles."
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
              ? "Create model"
              : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
