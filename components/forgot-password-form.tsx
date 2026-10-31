"use client";

import { useState } from "react";

import { Field, FormError } from "@/components/auth-fields";
import { Button } from "@/components/ui/button";

export function ForgotPasswordForm() {
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [resetUrl, setResetUrl] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setMessage(null);
    setResetUrl(null);
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: form.get("email") }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(typeof data.error === "string" ? data.error : "Could not start the reset.");
      setPending(false);
      return;
    }
    setMessage(typeof data.message === "string" ? data.message : "Check your email.");
    if (typeof data.resetUrl === "string") setResetUrl(data.resetUrl);
    setPending(false);
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <Field label="Email" name="email" type="email" autoComplete="email" required />
      <FormError message={error} />
      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
      {resetUrl ? (
        <a className="text-sm font-medium underline-offset-4 hover:underline" href={resetUrl}>
          Open the development reset link
        </a>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Preparing link…" : "Send reset link"}
      </Button>
    </form>
  );
}
