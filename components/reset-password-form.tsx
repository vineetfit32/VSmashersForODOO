"use client";

import { useState } from "react";

import { PASSWORD_MESSAGE } from "@/lib/auth/password-policy";
import { Field, FormError } from "@/components/auth-fields";
import { Button } from "@/components/ui/button";

export function ResetPasswordForm({ token }: { token: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (!token) {
    return <FormError message="This reset link is missing a token." />;
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token,
        password: form.get("password"),
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(typeof data.error === "string" ? data.error : "Could not reset the password.");
      setPending(false);
      return;
    }
    window.location.assign(typeof data.redirectTo === "string" ? data.redirectTo : "/login");
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Field
          label="New password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
        />
        <p className="text-xs text-muted-foreground">{PASSWORD_MESSAGE}</p>
      </div>
      <FormError message={error} />
      <Button type="submit" disabled={pending}>
        {pending ? "Updating password…" : "Update password"}
      </Button>
    </form>
  );
}
