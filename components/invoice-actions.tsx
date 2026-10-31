"use client";

import { useState, useTransition } from "react";

import { confirmInvoice, registerInvoicePayment } from "@/app/app/actions";
import { Button } from "@/components/ui/button";

const METHODS = [
  ["BANK_TRANSFER", "Bank transfer"],
  ["CREDIT_CARD", "Credit card"],
  ["UPI", "UPI"],
  ["CHEQUE", "Cheque"],
  ["CASH", "Cash"],
] as const;

export function InvoiceActions({
  id,
  status,
  balanceDue,
}: {
  id: string;
  status: string;
  balanceDue: string;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  const payable = status === "CONFIRMED" || status === "OVERDUE";

  function confirm() {
    setError(null);
    start(async () => {
      const result = await confirmInvoice(id);
      if (result && "error" in result && result.error) setError(result.error);
    });
  }

  function pay(formData: FormData) {
    setError(null);
    start(async () => {
      const result = await registerInvoicePayment(id, formData);
      if (result && "error" in result && result.error) setError(result.error);
      else setPaying(false);
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {status === "DRAFT" ? (
          <Button type="button" size="sm" disabled={pending} onClick={confirm}>
            Confirm
          </Button>
        ) : null}
        {payable ? (
          <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => setPaying((open) => !open)}>
            Register Payment
          </Button>
        ) : null}
        <Button asChild size="sm" variant="outline">
          <a href={`/api/app/invoices/${id}/pdf`} target="_blank" rel="noreferrer">
            Print PDF
          </a>
        </Button>
      </div>
      {paying ? (
        <form action={pay} className="grid gap-3 rounded-md border bg-[#fbf7fa] p-3 sm:grid-cols-2">
          <label className="text-sm">
            Amount
            <input
              name="amount"
              type="number"
              min="0.01"
              step="0.01"
              defaultValue={balanceDue}
              required
              className="mt-1 h-9 w-full rounded-md border bg-white px-2"
            />
          </label>
          <label className="text-sm">
            Method
            <select name="method" defaultValue="BANK_TRANSFER" className="mt-1 h-9 w-full rounded-md border bg-white px-2">
              {METHODS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            Date
            <input name="paymentDate" type="date" className="mt-1 h-9 w-full rounded-md border bg-white px-2" />
          </label>
          <label className="text-sm">
            Note
            <input name="referenceNote" className="mt-1 h-9 w-full rounded-md border bg-white px-2" />
          </label>
          <div className="sm:col-span-2">
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? "Recording…" : "Record payment"}
            </Button>
          </div>
        </form>
      ) : null}
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
