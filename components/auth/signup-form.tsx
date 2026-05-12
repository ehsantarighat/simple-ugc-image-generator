"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signUpAction, type FormState } from "@/lib/actions/auth";

export function SignupForm() {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    signUpAction,
    null
  );

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="fullName">Your name</Label>
        <Input id="fullName" name="fullName" autoComplete="name" required />
        {state?.fieldErrors?.fullName && (
          <p className="text-xs text-[var(--color-destructive)]">{state.fieldErrors.fullName}</p>
        )}
      </div>
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
          autoComplete="new-password"
          minLength={8}
          required
        />
        {state?.fieldErrors?.password && (
          <p className="text-xs text-[var(--color-destructive)]">{state.fieldErrors.password}</p>
        )}
        <p className="text-xs text-[var(--color-muted-foreground)]">
          At least 8 characters.
        </p>
      </div>
      {state?.message && (
        <p className="text-sm text-[var(--color-destructive)]">{state.message}</p>
      )}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Creating account..." : "Create account"}
      </Button>
    </form>
  );
}
