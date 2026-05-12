"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

interface Props {
  label: string;
  confirmMessage: string;
  action: () => Promise<void>;
}

export function DeleteOwnerButton({ label, confirmMessage, action }: Props) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => {
        if (!confirm(confirmMessage)) return;
        startTransition(() => action());
      }}
      disabled={pending}
    >
      <Trash2 className="mr-1 h-3.5 w-3.5" />
      {pending ? "Deleting..." : label}
    </Button>
  );
}
