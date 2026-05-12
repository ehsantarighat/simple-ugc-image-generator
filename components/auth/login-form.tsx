"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signInAction, type FormState } from "@/lib/actions/auth";

export function LoginForm() {
  const params = useSearchParams();
  const redirectTo = params.get("redirectTo") ?? "/dashboard";

  const [state, formAction, pending] = useActionState<FormState, FormData>(
    signInAction,
    null
  );

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="redirectTo" value={redirectTo} />
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
        {state?.fieldErrors?.email && (
          <p className="text-xs text-[var(--color-destructive)]">{state.fieldErrors.email}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
        {state?.fieldErrors?.password && (
          <p className="text-xs text-[var(--color-destructive)]">{state.fieldErrors.password}</p>
        )}
      </div>
      {state?.message && (
        <p className="text-sm text-[var(--color-destructive)]">{state.message}</p>
      )}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Signing in..." : "Sign in"}
      </Button>
    </form>
  );
}
