import { useCallback, useEffect, useRef, useState } from "react";

interface UploadCardProps {
  label: string;
  hint?: string;
  file: File | null;
  onChange: (file: File | null) => void;
}

export function UploadCard({ label, hint, file, onChange }: UploadCardProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const accept = "image/*";

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return;
      const f = files[0];
      if (!f.type.startsWith("image/")) return;
      onChange(f);
    },
    [onChange],
  );

  return (
    <div className="card p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="label">{label}</span>
        {file && (
          <button
            type="button"
            className="btn-secondary"
            onClick={() => inputRef.current?.click()}
          >
            Replace
          </button>
        )}
      </div>
      {hint && !file && <p className="mb-3 text-xs text-ink-400">{hint}</p>}

      <div
        onClick={() => !file && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        className={[
          "relative flex aspect-[4/5] w-full items-center justify-center overflow-hidden rounded-xl border-2 border-dashed transition",
          isDragging
            ? "border-ink-900 bg-ink-50"
            : "border-ink-200 bg-ink-50/40 hover:border-ink-300",
          !file ? "cursor-pointer" : "",
        ].join(" ")}
      >
        {preview ? (
          <img
            src={preview}
            alt={label}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="px-6 text-center">
            <p className="text-sm font-medium text-ink-700">
              Drop an image here
            </p>
            <p className="mt-1 text-xs text-ink-400">
              or click to browse (PNG / JPG / WEBP)
            </p>
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
}
