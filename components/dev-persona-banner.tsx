"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import type { PublicUser, UserRole } from "@/lib/auth/types";

const PERSONAS: Array<{ role: UserRole; label: string }> = [
  { role: "ADMIN", label: "Admin" },
  { role: "STAFF", label: "Staff" },
  { role: "CUSTOMER", label: "Customer" },
];

export function DevPersonaBanner() {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [pending, setPending] = useState<UserRole | "out" | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/auth/me")
      .then((response) => response.json())
      .then((data: { user?: PublicUser | null }) => {
        if (active) setUser(data.user ?? null);
      })
      .catch(() => {
        if (active) setUser(null);
      });
    return () => {
      active = false;
    };
  }, []);

  async function switchTo(role: UserRole) {
    setPending(role);
    setError(null);
    const response = await fetch("/api/auth/dev-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(typeof data.error === "string" ? data.error : "Could not switch persona.");
      setPending(null);
      return;
    }
    window.location.assign(typeof data.redirectTo === "string" ? data.redirectTo : "/");
  }

  async function signOut() {
    setPending("out");
    setError(null);
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.assign("/login");
  }

  return (
    <div className="sticky top-0 z-50 border-b bg-card/95 shadow-sm backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2">
        <div className="flex min-w-0 items-center gap-2 text-sm">
          <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
            Dev
          </span>
          <span className="font-medium">Preview as</span>
          <span className="truncate text-muted-foreground">
            {user ? `${user.firstName} ${user.lastName} · ${user.role}` : "Signed out"}
          </span>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {PERSONAS.map((persona) => (
            <Button
              key={persona.role}
              type="button"
              size="sm"
              variant={user?.role === persona.role ? "default" : "outline"}
              aria-pressed={user?.role === persona.role}
              disabled={pending !== null}
              onClick={() => switchTo(persona.role)}
            >
              {pending === persona.role ? "Switching…" : persona.label}
            </Button>
          ))}
          {user ? (
            <Button type="button" size="sm" variant="ghost" disabled={pending !== null} onClick={signOut}>
              {pending === "out" ? "Signing out…" : "Sign out"}
            </Button>
          ) : null}
        </div>
      </div>
      {error ? <p className="px-4 pb-2 text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
