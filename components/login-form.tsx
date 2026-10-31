"use client";

import { useState, type FormEvent } from "react";

import { Field, FormError } from "@/components/auth-fields";
import { Button } from "@/components/ui/button";

export function LoginForm({ next }: { next: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: form.get("email"),
        password: form.get("password"),
        next,
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(typeof data.error === "string" ? data.error : "Could not sign in.");
      setPending(false);
      return;
    }
    window.location.assign(typeof data.redirectTo === "string" ? data.redirectTo : "/");
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <Field label="Email" name="email" type="email" autoComplete="email" required />
      <Field
        label="Password"
        name="password"
        type="password"
        autoComplete="current-password"
        required
      />
      <FormError message={error} />
      <Button type="submit" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
