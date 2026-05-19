"use client";

import * as React from "react";
import Link from "next/link";
import { Plus, User2, Box, Check, Search, X } from "lucide-react";
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
//
// Each section has its own search input + count + scroll area. This
// scales to 100s of models or products without forcing the user to
// scroll through the entire list.
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
  const [modelQuery, setModelQuery] = React.useState("");
  const [productQuery, setProductQuery] = React.useState("");
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) {
      document.addEventListener("mousedown", onClick);
      document.addEventListener("keydown", onKey);
    }
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Reset searches when the menu re-opens — fresh start each time.
  React.useEffect(() => {
    if (!open) {
      setModelQuery("");
      setProductQuery("");
    }
  }, [open]);

  const selectedModel = models.find((m) => m.id === modelId);
  const selectedProduct = products.find((p) => p.id === productId);

  const filteredModels = filterByName(models, modelQuery);
  const filteredProducts = filterByName(products, productQuery);

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
        <div className="absolute bottom-10 left-0 z-50 flex max-h-[70vh] w-80 flex-col overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-popover)] shadow-lg">
          <div className="flex-1 overflow-y-auto p-2">
            {showModel && (
              <Section
                title="Model"
                icon={<User2 className="h-3.5 w-3.5" />}
                totalCount={models.length}
                shownCount={filteredModels.length}
                searchValue={modelQuery}
                onSearchChange={setModelQuery}
                manageHref="/models"
                newHref="/models/new"
              >
                {models.length === 0 ? (
                  <EmptyRow href="/models/new" label="Add your first model" />
                ) : filteredModels.length === 0 ? (
                  <NoMatchRow query={modelQuery} />
                ) : (
                  filteredModels.map((m) => (
                    <Row
                      key={m.id}
                      label={m.name}
                      query={modelQuery}
                      selected={m.id === modelId}
                      onClick={() => {
                        onSelectModel(m.id === modelId ? null : m.id);
                      }}
                    />
                  ))
                )}
              </Section>
            )}
            <Section
              title="Product"
              icon={<Box className="h-3.5 w-3.5" />}
              totalCount={products.length}
              shownCount={filteredProducts.length}
              searchValue={productQuery}
              onSearchChange={setProductQuery}
              manageHref="/products"
              newHref="/products/new"
            >
              {products.length === 0 ? (
                <EmptyRow href="/products/new" label="Add your first product" />
              ) : filteredProducts.length === 0 ? (
                <NoMatchRow query={productQuery} />
              ) : (
                filteredProducts.map((p) => (
                  <Row
                    key={p.id}
                    label={p.name}
                    query={productQuery}
                    selected={p.id === productId}
                    onClick={() => {
                      onSelectProduct(p.id === productId ? null : p.id);
                    }}
                  />
                ))
              )}
            </Section>
          </div>
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

// ----------------------------------------------------------------------------
// Subcomponents
// ----------------------------------------------------------------------------

function Section({
  title,
  icon,
  totalCount,
  shownCount,
  searchValue,
  onSearchChange,
  manageHref,
  newHref,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  totalCount: number;
  shownCount: number;
  searchValue: string;
  onSearchChange: (v: string) => void;
  manageHref: string;
  newHref: string;
  children: React.ReactNode;
}) {
  const showSearch = totalCount > 5; // hide search until library is big enough to need it
  return (
    <div className="mb-2 last:mb-0">
      {/* Header row: icon + label + count + manage link */}
      <div className="mb-1 flex items-center justify-between px-2">
        <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-[var(--color-muted-foreground)]">
          {icon}
          {title}
          <span className="opacity-60">
            ·{" "}
            {shownCount === totalCount
              ? totalCount
              : `${shownCount} of ${totalCount}`}
          </span>
        </div>
        <Link
          href={newHref}
          className="rounded-md p-0.5 text-[var(--color-muted-foreground)] hover:bg-[var(--color-secondary)] hover:text-[var(--color-foreground)]"
          title={`Add a new ${title.toLowerCase()}`}
        >
          <Plus className="h-3 w-3" />
        </Link>
      </div>

      {/* Optional search */}
      {showSearch && (
        <div className="relative mb-1 px-2">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-3 w-3 -translate-y-1/2 text-[var(--color-muted-foreground)]" />
          <input
            type="text"
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={`Search ${title.toLowerCase()}s…`}
            className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background)] py-1.5 pl-7 pr-7 text-xs outline-none focus:border-[var(--color-foreground)]"
            autoFocus={false}
          />
          {searchValue && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-[var(--color-muted-foreground)] hover:bg-[var(--color-secondary)] hover:text-[var(--color-foreground)]"
              aria-label="Clear search"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      )}

      <div
        className={cn(
          "overflow-y-auto",
          showSearch ? "max-h-60" : "max-h-44"
        )}
      >
        {children}
      </div>

      <ManageLink href={manageHref}>Manage {title.toLowerCase()}s →</ManageLink>
    </div>
  );
}

function Row({
  label,
  query,
  selected,
  onClick,
}: {
  label: string;
  query: string;
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
      <span className="truncate">{highlightMatch(label, query)}</span>
      {selected && <Check className="h-3.5 w-3.5 shrink-0" />}
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

function NoMatchRow({ query }: { query: string }) {
  return (
    <div className="px-2 py-2 text-xs text-[var(--color-muted-foreground)]">
      No matches for &ldquo;{query}&rdquo;.
    </div>
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

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

function filterByName<T extends { name: string }>(items: T[], query: string): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return items;
  return items.filter((it) => it.name.toLowerCase().includes(q));
}

/** Wraps the matching substring in a <mark> for visual highlight. Cheap and
 *  safe — only operates on plain text item names. */
function highlightMatch(label: string, query: string): React.ReactNode {
  const q = query.trim();
  if (!q) return label;
  const idx = label.toLowerCase().indexOf(q.toLowerCase());
  if (idx < 0) return label;
  return (
    <>
      {label.slice(0, idx)}
      <mark className="bg-yellow-200/60 dark:bg-yellow-400/30 text-inherit">
        {label.slice(idx, idx + q.length)}
      </mark>
      {label.slice(idx + q.length)}
    </>
  );
}
