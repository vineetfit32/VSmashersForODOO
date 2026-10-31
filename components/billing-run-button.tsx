"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

type BillingResult = {
  created: Array<{ invoiceNumber: string; subscriptionNumber: string; grandTotal: string }>;
  skipped: Array<{ reason: string }>;
  closedSubscriptionIds: string[];
  error?: string;
};

export function BillingRunButton() {
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<BillingResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setPending(true);
    setError(null);
    const response = await fetch("/api/admin/billing/run", { method: "POST" });
    const data = (await response.json().catch(() => ({}))) as BillingResult;
    if (!response.ok) {
      setResult(null);
      setError(data.error ?? "Billing cycle failed.");
      setPending(false);
      return;
    }
    setResult(data);
    setPending(false);
  }

  return (
    <section className="mt-8 rounded-xl border bg-card p-4">
      <h2 className="text-lg font-semibold">Billing cycle</h2>
      <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
        Create invoices for active subscriptions whose billing date is today or earlier. Taxes and
        eligible discounts are applied, and the next billing date moves forward. Running this again
        will not bill the same period twice.
      </p>
      <Button type="button" className="mt-4" onClick={run} disabled={pending}>
        {pending ? "Running billing cycle…" : "Run billing cycle"}
      </Button>
      {error ? (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}
      {result ? (
        <div role="status" className="mt-4 text-sm">
          <p>
            Created {result.created.length} invoice{result.created.length === 1 ? "" : "s"}. Skipped{" "}
            {result.skipped.length}. Closed {result.closedSubscriptionIds.length} subscription
            {result.closedSubscriptionIds.length === 1 ? "" : "s"}.
          </p>
          {result.created.length > 0 ? (
            <ul className="mt-2 space-y-1 text-muted-foreground">
              {result.created.slice(0, 8).map((invoice) => (
                <li key={invoice.invoiceNumber}>
                  {invoice.invoiceNumber} · {invoice.subscriptionNumber} · ₹{invoice.grandTotal}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
