"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createProjectAction, type ActionResult } from "@/lib/actions/projects";

interface Option {
  id: string;
  name: string;
}

export function NewProjectForm({
  models,
  products,
}: {
  models: Option[];
  products: Option[];
}) {
  const [state, formAction, pending] = useActionState<ActionResult, FormData>(
    createProjectAction,
    null
  );

  return (
    <form action={formAction} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="title">Project title</Label>
        <Input id="title" name="title" required maxLength={80} placeholder="e.g. Spring serum launch" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description (optional)</Label>
        <Textarea
          id="description"
          name="description"
          maxLength={400}
          rows={3}
          placeholder="What's this shoot for? Any constraints?"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Model</Label>
          <SelectWithNative name="selected_model_id" options={models} placeholder="Choose later" />
        </div>
        <div className="space-y-2">
          <Label>Product</Label>
          <SelectWithNative name="selected_product_id" options={products} placeholder="Choose later" />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Target channel</Label>
        <Select name="target_channel" defaultValue="general">
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="general">General / multi-channel</SelectItem>
            <SelectItem value="instagram">Instagram</SelectItem>
            <SelectItem value="tiktok">TikTok</SelectItem>
            <SelectItem value="amazon">Amazon</SelectItem>
            <SelectItem value="shopify">Shopify / DTC</SelectItem>
            <SelectItem value="youtube">YouTube</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {state?.message && (
        <div className="text-sm text-[var(--color-destructive)]">{state.message}</div>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? "Creating..." : "Create project"}
      </Button>
    </form>
  );
}

// Inline wrapper: Radix Select doesn't submit a hidden form field by default
// in Server Action forms because it portals out. Render a hidden input
// mirroring its value.
function SelectWithNative({
  name,
  options,
  placeholder,
}: {
  name: string;
  options: Option[];
  placeholder: string;
}) {
  return (
    <select
      name={name}
      defaultValue=""
      className="flex h-9 w-full rounded-md border border-[var(--color-border)] bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-ring)]"
    >
      <option value="">{placeholder}</option>
      {options.map((o) => (
        <option key={o.id} value={o.id}>
          {o.name}
        </option>
      ))}
    </select>
  );
}
