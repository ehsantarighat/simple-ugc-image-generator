"use client";

import * as React from "react";
import { Label } from "@/components/ui/label";
import type {
  PhotographyControls,
  ShotType,
  CameraAngle,
  LensType,
  Framing,
  Lighting,
  AuthenticityLevel,
  ProductProminence,
  AspectRatio,
} from "@/types";
import {
  SHOT_TYPES,
  CAMERA_ANGLES,
  LENS_TYPES,
  FRAMINGS,
  LIGHTINGS,
  AUTHENTICITY_LEVELS,
  PRODUCT_PROMINENCES,
  ASPECT_RATIOS,
} from "@/types";
import {
  SHOT_TYPE_LABELS,
  CAMERA_ANGLE_LABELS,
  LENS_LABELS,
  FRAMING_LABELS,
  LIGHTING_LABELS,
  AUTHENTICITY_LABELS,
  PRODUCT_PROMINENCE_LABELS,
} from "@/lib/services/generation/control-mappings";

interface Props {
  value: PhotographyControls;
  onChange: (next: PhotographyControls) => void;
}

export function GenerationControls({ value, onChange }: Props) {
  function set<K extends keyof PhotographyControls>(key: K, v: PhotographyControls[K]) {
    onChange({ ...value, [key]: v });
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Shot type">
        <NativeSelect
          value={value.shotType}
          onChange={(v) => set("shotType", v as ShotType)}
          options={SHOT_TYPES.map((s) => ({ value: s, label: SHOT_TYPE_LABELS[s] ?? s }))}
        />
      </Field>
      <Field label="Camera angle">
        <NativeSelect
          value={value.cameraAngle}
          onChange={(v) => set("cameraAngle", v as CameraAngle)}
          options={CAMERA_ANGLES.map((s) => ({ value: s, label: CAMERA_ANGLE_LABELS[s] ?? s }))}
        />
      </Field>
      <Field label="Lens">
        <NativeSelect
          value={value.lensType}
          onChange={(v) => set("lensType", v as LensType)}
          options={LENS_TYPES.map((s) => ({ value: s, label: LENS_LABELS[s] ?? s }))}
        />
      </Field>
      <Field label="Framing">
        <NativeSelect
          value={value.framing}
          onChange={(v) => set("framing", v as Framing)}
          options={FRAMINGS.map((s) => ({ value: s, label: FRAMING_LABELS[s] ?? s }))}
        />
      </Field>
      <Field label="Lighting">
        <NativeSelect
          value={value.lighting}
          onChange={(v) => set("lighting", v as Lighting)}
          options={LIGHTINGS.map((s) => ({ value: s, label: LIGHTING_LABELS[s] ?? s }))}
        />
      </Field>
      <Field label="Authenticity">
        <NativeSelect
          value={value.authenticityLevel}
          onChange={(v) => set("authenticityLevel", v as AuthenticityLevel)}
          options={AUTHENTICITY_LEVELS.map((s) => ({
            value: s,
            label: AUTHENTICITY_LABELS[s] ?? s,
          }))}
        />
      </Field>
      <Field label="Product prominence">
        <NativeSelect
          value={value.productProminence}
          onChange={(v) => set("productProminence", v as ProductProminence)}
          options={PRODUCT_PROMINENCES.map((s) => ({
            value: s,
            label: PRODUCT_PROMINENCE_LABELS[s] ?? s,
          }))}
        />
      </Field>
      <Field label="Aspect ratio">
        <NativeSelect
          value={value.outputAspectRatio}
          onChange={(v) => set("outputAspectRatio", v as AspectRatio)}
          options={ASPECT_RATIOS.map((s) => ({ value: s, label: s }))}
        />
      </Field>
      <Field label="Variations" className="sm:col-span-2">
        <div className="flex gap-2">
          {[1, 2, 3, 4].map((n) => {
            const active = value.numberOfVariations === n;
            return (
              <button
                key={n}
                type="button"
                onClick={() => set("numberOfVariations", n)}
                className={
                  "flex-1 rounded-md border px-3 py-1.5 text-sm transition-colors " +
                  (active
                    ? "border-[var(--color-foreground)] bg-[var(--color-foreground)] text-[var(--color-background)]"
                    : "border-[var(--color-border)] hover:bg-[var(--color-secondary)]")
                }
              >
                {n}
              </button>
            );
          })}
        </div>
        <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
          More variations = more options to pick from. Each costs an API call.
        </p>
      </Field>
    </div>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={"space-y-1.5 " + (className ?? "")}>
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

function NativeSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="flex h-9 w-full rounded-md border border-[var(--color-border)] bg-transparent px-3 text-sm shadow-sm"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
