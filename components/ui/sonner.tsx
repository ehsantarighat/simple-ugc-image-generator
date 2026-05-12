"use client";

import { Toaster as Sonner } from "sonner";

export function Toaster() {
  return (
    <Sonner
      position="bottom-right"
      toastOptions={{
        className:
          "rounded-md border border-[var(--color-border)] bg-[var(--color-background)] text-sm",
      }}
    />
  );
}
