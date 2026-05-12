"use client";

import { signOutAction } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

export function UserMenu({ email, name }: { email: string; name: string | null }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="min-w-0">
        <div className="truncate text-sm font-medium">{name ?? "Your account"}</div>
        <div className="truncate text-xs text-[var(--color-muted-foreground)]">{email}</div>
      </div>
      <form action={signOutAction}>
        <Button variant="ghost" size="icon" type="submit" aria-label="Sign out">
          <LogOut className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
