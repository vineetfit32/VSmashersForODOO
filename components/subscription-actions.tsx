"use client";

import { useState, useTransition } from "react";

import {
  activateSubscription,
  closeSubscription,
  confirmSubscription,
  createSubscriptionInvoice,
  pauseSubscription,
  resumeSubscription,
  sendQuotation,
} from "@/app/app/actions";
import { Button } from "@/components/ui/button";

export function SubscriptionActions({ id, status }: { id: string; status: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(action: (id: string) => Promise<{ error?: string; ok?: boolean } | void>) {
    setError(null);
    start(async () => {
      const result = await action(id);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {status === "DRAFT" ? (
          <Button type="button" size="sm" disabled={pending} onClick={() => run(sendQuotation)}>
            Send quotation
          </Button>
        ) : null}
        {status === "QUOTATION" ? (
          <Button type="button" size="sm" disabled={pending} onClick={() => run(confirmSubscription)}>
            Confirm
          </Button>
        ) : null}
        {status === "CONFIRMED" ? (
          <Button type="button" size="sm" disabled={pending} onClick={() => run(activateSubscription)}>
            Activate
          </Button>
        ) : null}
        {status === "ACTIVE" ? (
          <>
            <Button type="button" size="sm" disabled={pending} onClick={() => run(createSubscriptionInvoice)}>
              Create Invoice
            </Button>
            <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => run(pauseSubscription)}>
              Pause
            </Button>
            <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => run(closeSubscription)}>
              Close
            </Button>
          </>
        ) : null}
        {status === "PAUSED" ? (
          <Button type="button" size="sm" disabled={pending} onClick={() => run(resumeSubscription)}>
            Resume
          </Button>
        ) : null}
      </div>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
