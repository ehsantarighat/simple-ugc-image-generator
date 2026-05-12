export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="grid place-items-center rounded-lg border border-dashed border-[var(--color-border)] py-16 text-center">
      <div className="max-w-sm space-y-3 px-6">
        {icon && (
          <div className="mx-auto inline-flex h-10 w-10 items-center justify-center rounded-md bg-[var(--color-secondary)]">
            {icon}
          </div>
        )}
        <div className="text-lg font-semibold">{title}</div>
        {description && (
          <p className="text-sm text-[var(--color-muted-foreground)]">{description}</p>
        )}
        {action && <div className="pt-2">{action}</div>}
      </div>
    </div>
  );
}
