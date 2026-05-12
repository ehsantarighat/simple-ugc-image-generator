"use client";

import * as React from "react";
import { UploadCloud, X } from "lucide-react";
import { cn, bytesToMb } from "@/lib/utils";

const ACCEPTED = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
const MAX_BYTES = 15 * 1024 * 1024;

export interface ImageDropzoneProps {
  name: string;
  multiple?: boolean;
  maxFiles?: number;
  minRecommended?: number;
  helperText?: string;
  className?: string;
}

interface FileWithPreview {
  file: File;
  preview: string;
}

export function ImageDropzone({
  name,
  multiple = true,
  maxFiles = 10,
  minRecommended,
  helperText,
  className,
}: ImageDropzoneProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [files, setFiles] = React.useState<FileWithPreview[]>([]);
  const [dragOver, setDragOver] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    return () => {
      files.forEach((f) => URL.revokeObjectURL(f.preview));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function syncToInput(updated: FileWithPreview[]) {
    if (!inputRef.current) return;
    const dt = new DataTransfer();
    updated.forEach((f) => dt.items.add(f.file));
    inputRef.current.files = dt.files;
  }

  function addFiles(incoming: FileList | File[]) {
    setError(null);
    const arr = Array.from(incoming);
    const valid: FileWithPreview[] = [];
    for (const file of arr) {
      if (!ACCEPTED.includes(file.type)) {
        setError(`Unsupported file type: ${file.name}`);
        continue;
      }
      if (file.size > MAX_BYTES) {
        setError(`${file.name} is ${bytesToMb(file.size)} MB. Max is ${bytesToMb(MAX_BYTES)} MB.`);
        continue;
      }
      valid.push({ file, preview: URL.createObjectURL(file) });
    }
    const merged = multiple ? [...files, ...valid].slice(0, maxFiles) : valid.slice(0, 1);
    setFiles(merged);
    syncToInput(merged);
  }

  function removeAt(idx: number) {
    const updated = files.filter((_, i) => i !== idx);
    URL.revokeObjectURL(files[idx].preview);
    setFiles(updated);
    syncToInput(updated);
  }

  const tooFew =
    minRecommended !== undefined && files.length > 0 && files.length < minRecommended;

  return (
    <div className={cn("space-y-3", className)}>
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files) addFiles(e.dataTransfer.files);
        }}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-[var(--color-border)] px-6 py-10 text-center transition-colors",
          dragOver && "border-[var(--color-foreground)] bg-[var(--color-secondary)]/50"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          name={name}
          accept={ACCEPTED.join(",")}
          multiple={multiple}
          className="sr-only"
          onChange={(e) => e.target.files && addFiles(e.target.files)}
        />
        <UploadCloud className="h-8 w-8 text-[var(--color-muted-foreground)]" />
        <div className="text-sm font-medium">Drop images here or click to upload</div>
        <div className="text-xs text-[var(--color-muted-foreground)]">
          PNG, JPG, or WebP. Up to {bytesToMb(MAX_BYTES)} MB each.
          {multiple && ` Up to ${maxFiles} files.`}
        </div>
        {helperText && (
          <div className="mt-1 text-xs text-[var(--color-muted-foreground)]">{helperText}</div>
        )}
      </label>

      {error && <div className="text-sm text-[var(--color-destructive)]">{error}</div>}

      {tooFew && (
        <div className="text-xs text-amber-600">
          For best results, upload at least {minRecommended} images.
        </div>
      )}

      {files.length > 0 && (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
          {files.map((f, idx) => (
            <div
              key={f.preview}
              className="group relative aspect-square overflow-hidden rounded-md border border-[var(--color-border)] bg-[var(--color-secondary)]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={f.preview}
                alt=""
                className="h-full w-full object-cover"
              />
              <button
                type="button"
                onClick={() => removeAt(idx)}
                className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full bg-black/70 text-white opacity-0 transition-opacity group-hover:opacity-100"
                aria-label="Remove image"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
