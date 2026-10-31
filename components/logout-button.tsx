"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

export function LogoutButton() {
  const [pending, setPending] = useState(false);

  async function logout() {
    setPending(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      window.location.assign("/");
    }
  }

  return (
    <Button type="button" size="sm" variant="outline" onClick={logout} disabled={pending}>
      {pending ? "Signing out…" : "Log out"}
    </Button>
  );
}
