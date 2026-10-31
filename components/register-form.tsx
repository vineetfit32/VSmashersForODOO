"use client";

import { useState, type FormEvent } from "react";

import { PASSWORD_MESSAGE } from "@/lib/auth/password-policy";
import { Field, FormError } from "@/components/auth-fields";
import { Button } from "@/components/ui/button";

export function RegisterForm() {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: form.get("firstName"),
        lastName: form.get("lastName"),
        companyName: form.get("companyName"),
        email: form.get("email"),
        password: form.get("password"),
        phone: form.get("phone") || undefined,
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(typeof data.error === "string" ? data.error : "Could not create the account.");
      setPending(false);
      return;
    }
    window.location.assign(typeof data.redirectTo === "string" ? data.redirectTo : "/portal");
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="First name" name="firstName" autoComplete="given-name" required />
        <Field label="Last name" name="lastName" autoComplete="family-name" required />
      </div>
      <Field label="Company" name="companyName" autoComplete="organization" required />
      <Field label="Email" name="email" type="email" autoComplete="email" required />
      <Field label="Phone" name="phone" type="tel" autoComplete="tel" />
      <div className="flex flex-col gap-1.5">
        <Field
          label="Password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
        />
        <p className="text-xs text-muted-foreground">{PASSWORD_MESSAGE}</p>
      </div>
      <FormError message={error} />
      <Button type="submit" disabled={pending}>
        {pending ? "Creating account…" : "Create account"}
      </Button>
    </form>
  );
}
