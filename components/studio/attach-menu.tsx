"use client";

import * as React from "react";
import Link from "next/link";
import { Plus, User2, Box, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface Option {
  id: string;
  name: string;
}

interface Props {
  models: Option[];
  products: Option[];
  modelId: string | null;
  productId: string | null;
  showModel: boolean;
  onSelectModel: (id: string | null) => void;
  onSelectProduct: (id: string | null) => void;
}

// "+" attachment menu — collapses Model and Product pickers into one
// dropdown so the chat input stays compact. Click outside to close.
export function AttachMenu({
  models,
  products,
  modelId,
  productId,
  showModel,
  onSelectModel,
  onSelectProduct,
}: Props) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const selectedModel = models.find((m) => m.id === modelId);
  const selectedProduct = products.find((p) => p.id === productId);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "grid h-8 w-8 place-items-center rounded-full border transition-colors",
          open
            ? "border-[var(--color-foreground)] bg-[var(--color-secondary)]"
            : "border-[var(--color-border)] hover:bg-[var(--color-secondary)]/60"
        )}
        title="Attach a product or model"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>

      {open && (
        <div className="absolute bottom-10 left-0 z-50 w-72 rounded-lg border border-[var(--color-border)] bg-[var(--color-popover)] p-2 shadow-lg">
          {showModel && (
            <Section title="Model" icon={<User2 className="h-3.5 w-3.5" />}>
              {models.length === 0 ? (
                <EmptyRow href="/models/new" label="Add your first model" />
              ) : (
                <>
                  {models.map((m) => (
                    <Row
                      key={m.id}
                      label={m.name}
                      selected={m.id === modelId}
                      onClick={() => {
                        onSelectModel(m.id === modelId ? null : m.id);
                      }}
                    />
                  ))}
                  <ManageLink href="/models">Manage models →</ManageLink>
                </>
              )}
            </Section>
          )}
          <Section title="Product" icon={<Box className="h-3.5 w-3.5" />}>
            {products.length === 0 ? (
              <EmptyRow href="/products/new" label="Add your first product" />
            ) : (
              <>
                {products.map((p) => (
                  <Row
                    key={p.id}
                    label={p.name}
                    selected={p.id === productId}
                    onClick={() => {
                      onSelectProduct(p.id === productId ? null : p.id);
                    }}
                  />
                ))}
                <ManageLink href="/products">Manage products →</ManageLink>
              </>
            )}
          </Section>
        </div>
      )}

      {/* Compact attachment chips render outside this component */}
      <div className="sr-only">
        {selectedModel?.name}
        {selectedProduct?.name}
      </div>
    </div>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-2 last:mb-0">
      <div className="mb-1 flex items-center gap-1.5 px-2 text-[10px] font-medium uppercase tracking-wider text-[var(--color-muted-foreground)]">
        {icon}
        {title}
      </div>
      <div className="max-h-44 overflow-y-auto">{children}</div>
    </div>
  );
}

function Row({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm transition-colors",
        selected
          ? "bg-[var(--color-secondary)]"
          : "hover:bg-[var(--color-secondary)]/60"
      )}
    >
      <span className="truncate">{label}</span>
      {selected && <Check className="h-3.5 w-3.5" />}
    </button>
  );
}

function EmptyRow({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="block rounded-md px-2 py-1.5 text-xs text-[var(--color-muted-foreground)] hover:bg-[var(--color-secondary)]/60"
    >
      {label}
    </Link>
  );
}

function ManageLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="mt-1 block border-t border-[var(--color-border)] px-2 pt-1.5 text-[11px] text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
    >
      {children}
    </Link>
  );
}
